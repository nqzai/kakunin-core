import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

/**
 * GET /v1/subscriptions/{id}
 * Get a single subscription by ID.
 *
 * DELETE /v1/subscriptions/{id}
 * Cancel (deactivate) a subscription — soft-delete via metadata flag.
 */

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('audit_log')
    .select('id, created_at, metadata, affected_id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.created')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  // Check if there is a subscription.cancelled event for this ID
  const { data: cancelledRow, error: cancelledError } = await supabase
    .from('audit_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.cancelled')
    .eq('affected_id', id)
    .maybeSingle();

  const isCancelled = !cancelledError && !!cancelledRow;

  const meta = row.metadata as {
    agent_id?: string;
    event_types?: string[];
    delivery_url?: string;
    description?: string;
    min_risk_score?: number;
  } | null;

  return NextResponse.json({
    data: {
      id: row.id,
      agent_id: meta?.agent_id ?? row.affected_id,
      event_types: meta?.event_types ?? [],
      delivery_url: meta?.delivery_url ?? null,
      active: !isCancelled,
      description: meta?.description ?? null,
      min_risk_score: meta?.min_risk_score ?? null,
      created_at: row.created_at,
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createServiceClient();

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('audit_log')
    .select('id')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.created')
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
  }

  // Check if it's already cancelled
  const { data: alreadyCancelled } = await supabase
    .from('audit_log')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.cancelled')
    .eq('affected_id', id)
    .maybeSingle();

  if (alreadyCancelled) {
    return NextResponse.json({ data: { id, cancelled: true } });
  }

  // Insert subscription.cancelled event
  const cancelled = await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'subscription.cancelled',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Cancelled subscription ${id}`,
    affected_id: id,
    metadata: {} as Json,
  });

  if (!cancelled) {
    log.error('[subscriptions.delete] writeAuditLog failed');
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }

  return NextResponse.json({ data: { id, cancelled: true } });
}
