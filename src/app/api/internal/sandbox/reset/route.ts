import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServerClient } from '@supabase/ssr';
import { resolveApiKeyTenantContext } from '@/lib/gateway/api-key-auth';
import { log } from '@/lib/logging';

/**
 * Sandbox Reset — On-demand cleanup
 *
 * POST /api/internal/sandbox/reset
 * Auth: Bearer sandbox API key (kak_test_*) — tenant is derived from the key,
 * never from a client-supplied header.
 * Action: DELETE FROM [sandbox tables] WHERE environment='sandbox' AND tenant_id={caller's tenant}
 *
 * Idempotent — safe to call multiple times.
 * Rate limit: 1 per 60s per tenant.
 *
 * audit_log is intentionally excluded from the wipe — it's append-only/WORM-backed
 * per CLAUDE.md rule #1 and must retain the compliance trail even for sandbox runs.
 */

let resetLimiter: Ratelimit | null = null;

function getResetLimiter(): Ratelimit | null {
  if (resetLimiter) return resetLimiter;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  resetLimiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(1, '60 s'),
    prefix: 'kakunin:sandbox-reset',
    analytics: true,
  });
  return resetLimiter;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }
  const apiKey = authHeader.slice(7);

  const context = await resolveApiKeyTenantContext(apiKey, req.headers.get('host'));
  if (!context) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 });
  }
  if (context.environment !== 'sandbox') {
    return NextResponse.json({ error: 'Sandbox reset requires a sandbox API key' }, { status: 403 });
  }

  const tenantId = context.tenantId;

  // Rate limit check — MUST fire before DB write per CLAUDE.md rule #4
  const rl = getResetLimiter();
  if (rl) {
    const { success, reset } = await rl.limit(tenantId);
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded — sandbox reset allowed once per 60s' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)) } }
      );
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  try {
    // audit_log excluded — append-only/WORM, never bulk-deleted (CLAUDE.md rule #1)
    const tables = ['agents', 'certificates', 'behavior_events', 'webhooks', 'compliance_reports'];
    let totalDeleted = 0;

    for (const table of tables) {
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('environment', 'sandbox')
        .eq('tenant_id', tenantId);

      if (error) {
        log.error(`[sandbox-reset] Failed to delete from ${table}:`, error);
        throw error;
      }

      totalDeleted += count ?? 0;
    }

    // Log reset event to audit trail
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'system.sandbox_reset',
      actor_type: 'system',
      actor_id: 'sandbox-reset-api',
      description: `Sandbox data cleared: ${totalDeleted} rows deleted`,
      affected_id: 'sandbox',
      metadata: { rows_deleted: totalDeleted, tables_affected: tables.length },
      environment: 'sandbox',
    });

    return NextResponse.json({
      data: {
        deleted: totalDeleted,
        message: 'Sandbox data cleared',
        tables: tables.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[sandbox-reset] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset sandbox data' },
      { status: 500 }
    );
  }
}
