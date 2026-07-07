/**
 * POST /v1/chains/:id/close
 *
 * Seals a decision chain. Computes SHA-256 over the ordered event IDs as a
 * tamper-evident chain_hash. Once closed, no new events can be added.
 *
 * The chain_hash can be independently verified via GET /v1/verify/chain/:id
 * without requiring a platform account.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: chain, error: chainError } = await supabase
    .from('decision_chains')
    .select('id, name, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (chainError || !chain) {
    return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
  }

  if (chain.status === 'closed') {
    return NextResponse.json({ error: 'Chain is already closed' }, { status: 409 });
  }

  // Fetch events in causal order to compute chain hash
  const { data: events, error: eventsError } = await supabase
    .from('behavior_events')
    .select('id, occurred_at')
    .eq('chain_id', id)
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: true });

  if (eventsError) {
    return NextResponse.json({ error: 'Failed to fetch chain events' }, { status: 500 });
  }

  const orderedEvents = events ?? [];
  const eventIds = orderedEvents.map((e) => e.id);

  // chain_hash = SHA-256 of ordered event IDs joined by ':'
  const chainHash = createHash('sha256')
    .update(eventIds.join(':'))
    .digest('hex');

  const closedAt = new Date().toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('decision_chains')
    .update({
      status: 'closed',
      chain_hash: chainHash,
      event_count: orderedEvents.length,
      closed_at: closedAt,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (updateError || !updated) {
    log.error('[chains.close] update failed', updateError);
    return NextResponse.json({ error: 'Failed to close chain' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'chain.closed',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Decision chain "${chain.name}" closed with ${orderedEvents.length} events`,
    affected_id: id,
    metadata: { chain_hash: chainHash, event_count: orderedEvents.length } as Json,
  });

  return NextResponse.json({
    data: {
      chain_id: id,
      status: 'closed',
      event_count: orderedEvents.length,
      chain_hash: chainHash,
      closed_at: closedAt,
    },
  });
}
