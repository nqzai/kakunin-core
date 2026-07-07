import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /v1/webhooks/:id/deliveries
 *
 * Returns paginated delivery log for a webhook. Newest first.
 * Scoped to tenant — verifies webhook ownership before querying deliveries.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id: webhookId } = await params;

  const { searchParams } = new URL(req.url);
  const limitRaw = parseInt(searchParams.get('limit') ?? '50', 10);
  const limit = Math.min(Math.max(limitRaw, 1), 100);
  const before = searchParams.get('before'); // ISO cursor

  const supabase = createServiceClient();

  // Verify webhook belongs to tenant
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id')
    .eq('id', webhookId)
    .eq('tenant_id', tenantId)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  let query = supabase
    .from('webhook_deliveries')
    .select(
      'id, event_type, status, attempt, response_status, response_body, error_message, delivered_at, created_at'
    )
    .eq('webhook_id', webhookId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // fetch one extra to determine has_next_page

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: rows, error } = await query;

  if (error) {
    log.error('[webhooks.deliveries] Query failed', error);
    return NextResponse.json({ error: 'Failed to fetch deliveries' }, { status: 500 });
  }

  const hasNextPage = rows.length > limit;
  const deliveries = hasNextPage ? rows.slice(0, limit) : rows;
  const nextCursor = hasNextPage ? deliveries[deliveries.length - 1]?.created_at ?? null : null;

  return NextResponse.json({
    data: deliveries,
    has_next_page: hasNextPage,
    next_cursor: nextCursor,
  });
}
