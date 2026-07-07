/**
 * GET /v1/chains/:id — retrieve a full decision chain with all linked events.
 *
 * Returns events in causal order with per-event agent certificate details and
 * model_hash. This is the audit replay endpoint for Audit Test #1.
 *
 * The chain_hash field (present when status === 'closed') is SHA-256 over the
 * ordered event UUIDs — independently verifiable via GET /v1/verify/chain/:id.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  // Fetch chain — enforce tenant scope
  const { data: chain, error: chainError } = await supabase
    .from('decision_chains')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (chainError || !chain) {
    return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
  }

  // Fetch all events in this chain — ordered by timestamp (causal order)
  const { data: events, error: eventsError } = await supabase
    .from('behavior_events')
    .select('id, agent_id, action_type, risk_score, risk_band, occurred_at, payload')
    .eq('chain_id', id)
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: true });

  if (eventsError) {
    return NextResponse.json({ error: 'Failed to fetch chain events' }, { status: 500 });
  }

  const chainEvents = events ?? [];

  // Collect unique agent IDs and fetch their cert details
  const agentIds = [...new Set(chainEvents.map((e) => e.agent_id))];

  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, model_hash, model, version')
    .in('id', agentIds)
    .eq('tenant_id', tenantId);

  const { data: certs } = await supabase
    .from('certificates')
    .select('agent_id, serial_number, status, issued_at, expires_at')
    .in('agent_id', agentIds)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false });

  const agentMap = new Map((agents ?? []).map((a) => [a.id, a]));
  const certMap = new Map((certs ?? []).map((c) => [c.agent_id, c]));

  // Collect unique participating agents with their cert info
  const participatingAgents = agentIds.map((agentId) => {
    const agent = agentMap.get(agentId);
    const cert = certMap.get(agentId);
    return {
      agent_id: agentId,
      agent_name: agent?.name ?? null,
      model_hash: agent?.model_hash ?? null,
      certificate_serial: cert?.serial_number ?? null,
      certificate_status: cert?.status ?? null,
    };
  });

  // Build ordered event list with per-event agent context
  const orderedEvents = chainEvents.map((e, index) => {
    const agent = agentMap.get(e.agent_id);
    const cert = certMap.get(e.agent_id);
    return {
      sequence: index + 1,
      event_id: e.id,
      agent_id: e.agent_id,
      agent_name: agent?.name ?? null,
      model_hash: agent?.model_hash ?? null,
      certificate_serial: cert?.serial_number ?? null,
      action_type: e.action_type,
      risk_score: e.risk_score,
      risk_band: e.risk_band,
      occurred_at: e.occurred_at,
      details: e.payload,
    };
  });

  return NextResponse.json({
    data: {
      chain_id: chain.id,
      name: chain.name,
      description: chain.description,
      metadata: chain.metadata,
      status: chain.status,
      chain_hash: chain.chain_hash,
      event_count: chain.event_count ?? chainEvents.length,
      created_at: chain.created_at,
      closed_at: chain.closed_at,
      events: orderedEvents,
      participating_agents: participatingAgents,
    },
  });
}
