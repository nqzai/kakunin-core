import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import type { ActorType } from '@/types/database';
import { log } from '@/lib/logging';

const VALID_ACTOR_TYPES: ActorType[] = ['user', 'agent', 'system'];

/**
 * GET /v1/audit-log
 *
 * Cursor-based paginated audit log for the tenant. Append-only — no
 * mutation affordances exposed.
 *
 * Query params:
 *   actor_type  — user | agent | system
 *   event_type  — exact match (e.g. "certificate.issued")
 *   affected_id — UUID of the affected resource
 *   since       — ISO timestamp — return entries created after this time
 *   before      — ISO timestamp cursor (from previous page's next_cursor)
 *   limit       — 1–100 (default 50)
 */
export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const url = new URL(req.url);

  const actorType = url.searchParams.get('actor_type') as ActorType | null;
  const eventType = url.searchParams.get('event_type');
  const affectedId = url.searchParams.get('affected_id');
  const since = url.searchParams.get('since');
  // Cursor: ISO timestamp of oldest row in previous page (created_at)
  const before = url.searchParams.get('before');
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(Math.max(1, Number(limitRaw ?? 50)), 100);

  // Validate optional enum params upfront
  if (actorType && !VALID_ACTOR_TYPES.includes(actorType)) {
    return NextResponse.json(
      { error: 'Invalid actor_type — must be user, agent, or system' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('audit_log')
    .select('id, event_type, actor_type, actor_id, description, affected_id, metadata, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    // Fetch one extra row to detect whether a next page exists
    .limit(limit + 1);

  if (actorType) query = query.eq('actor_type', actorType);
  if (eventType) query = query.eq('event_type', eventType);
  if (affectedId) query = query.eq('affected_id', affectedId);
  if (since) query = query.gte('created_at', since);
  // Cursor: strict lower bound on created_at (newest-first pagination)
  if (before) query = query.lt('created_at', before);

  const { data: entries, error } = await query;

  if (error) {
    log.error('[audit-log.list]', error);
    return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 });
  }

  const hasNextPage = entries.length > limit;
  const rows = hasNextPage ? entries.slice(0, limit) : entries;
  // Next cursor is the created_at of the oldest (last) row returned
  const nextCursor = hasNextPage ? (rows[rows.length - 1]?.created_at ?? null) : null;

  return NextResponse.json({
    data: rows,
    pagination: {
      limit,
      has_next_page: hasNextPage,
      next_cursor: nextCursor,
    },
  });
}
