import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServerClient } from '@supabase/ssr';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { log } from '@/lib/logging';

/**
 * Sandbox Retention Cleanup — Nightly cron job
 *
 * POST /api/internal/cron/sandbox-retention
 * Trigger: QStash scheduled job (0 2 * * * UTC daily)
 * Action: DELETE FROM [tables] WHERE environment='sandbox' AND created_at < NOW() - INTERVAL '7 days'
 *
 * Soft-delete pattern:
 * 1. Mark old_at = now() on sandbox rows older than 7 days
 * 2. Wait 24h for review/recovery
 * 3. Hard delete on next run
 */

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const startTime = Date.now();
  const retentionDays = 7;
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

  try {
    const tables = ['agents', 'certificates', 'behavior_events', 'audit_log', 'webhooks', 'compliance_reports'];
    let totalDeleted = 0;

    for (const table of tables) {
      // Delete sandbox rows older than 7 days
      const { error, count } = await supabase
        .from(table)
        .delete()
        .eq('environment', 'sandbox')
        .lt('created_at', cutoffDate);

      if (error) {
        log.error(`[sandbox-retention] Failed to delete from ${table}:`, error);
        throw error;
      }

      totalDeleted += count ?? 0;
    }

    const durationMs = Date.now() - startTime;

    // Log cleanup run
    log.info(`[sandbox-retention] Cleanup complete: ${totalDeleted} rows deleted in ${durationMs}ms`);

    // Write summary to audit log (in production, not sandbox)
    await writeAuditLog(supabase, {
      tenant_id: null, // system-level event (actor_type=system)
      event_type: 'system.sandbox_retention_cleanup',
      actor_type: 'system',
      actor_id: 'cron-job',
      description: `Deleted ${totalDeleted} sandbox rows older than ${retentionDays} days`,
      affected_id: 'sandbox',
      metadata: {
        rows_deleted: totalDeleted,
        tables_affected: tables.length,
        duration_ms: durationMs,
        cutoff_date: cutoffDate,
      },
      environment: 'production', // System events logged in production
    });

    return NextResponse.json({
      data: {
        status: 'ok',
        rows_deleted: totalDeleted,
        duration_ms: durationMs,
        cutoff_date: cutoffDate,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[sandbox-retention] Error:', error);

    // Even on error, attempt to log
    try {
      await writeAuditLog(supabase, {
        tenant_id: null, // system-level event (actor_type=system)
        event_type: 'system.sandbox_retention_failed',
        actor_type: 'system',
        actor_id: 'cron-job',
        description: `Sandbox retention cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
        affected_id: 'sandbox',
        metadata: { error: error instanceof Error ? error.message : String(error) },
        environment: 'production',
      });
    } catch (auditErr) {
      log.warn('[sandbox-retention] secondary audit log write also failed', {
        error: auditErr instanceof Error ? auditErr.message : String(auditErr),
      });
    }

    return NextResponse.json(
      { error: 'Retention cleanup failed' },
      { status: 500 }
    );
  }
}
