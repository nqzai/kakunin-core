import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { computeForensicsProof, type ForensicEvent } from '@/lib/forensics/proof';

/**
 * GET /v1/agents/:id/forensics (P3a — RA-185)
 *
 * Forensic query over an agent's behavioral events with a signed, tamper-
 * evident proof of the exported set. Supports filtering by action type, min
 * risk, and time range; returns the ordered timeline, a replay summary, and an
 * HMAC-signed proof (control C-G1 / NCCoE non-repudiation).
 *
 * Query: ?action_type=&min_risk=&from=&to=&limit= (limit ≤ 1000)
 */

const MAX_LIMIT = 1000;

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id: agentId } = await params;
  const url = new URL(req.url);

  const actionType = url.searchParams.get('action_type');
  const minRisk = url.searchParams.get('min_risk');
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? '500', 10) || 500));

  const supabase = createServiceClient();
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('id', agentId)
    .eq('tenant_id', tenantId) // rule #2
    .single();
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  let query = supabase
    .from('behavior_events')
    .select('id, action_type, risk_score, risk_band, factors, occurred_at, chain_id, source_ip')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: true })
    .limit(limit);

  if (actionType) query = query.eq('action_type', actionType);
  if (minRisk) query = query.gte('risk_score', Number(minRisk));
  if (from) query = query.gte('occurred_at', from);
  if (to) query = query.lte('occurred_at', to);

  const { data: events, error } = await query;
  if (error) return NextResponse.json({ error: 'Failed to query forensic events' }, { status: 500 });

  const rows = events ?? [];

  // Replay summary — band distribution + action-type counts + timeline bounds.
  const bands: Record<string, number> = { low: 0, medium: 0, high: 0 };
  const byAction: Record<string, number> = {};
  for (const e of rows) {
    bands[e.risk_band] = (bands[e.risk_band] ?? 0) + 1;
    byAction[e.action_type] = (byAction[e.action_type] ?? 0) + 1;
  }

  // Signed proof over a stable projection (excludes mutable/PII-adjacent fields).
  const proofInput: ForensicEvent[] = rows.map((e) => ({
    id: e.id,
    occurred_at: e.occurred_at,
    action_type: e.action_type,
    risk_score: e.risk_score,
    risk_band: e.risk_band,
  }));
  const proof = computeForensicsProof(proofInput, { tenantId, agentId });

  // Audit the export itself — who pulled what, when (non-repudiation).
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'forensics.exported',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Forensic export for agent ${agent.name}: ${rows.length} events (hash ${proof.content_hash.slice(0, 12)})`,
    affected_id: agentId,
    metadata: {
      event_count: rows.length,
      content_hash: proof.content_hash,
      filters: { action_type: actionType, min_risk: minRisk, from, to, limit },
    },
  });

  return NextResponse.json({
    data: {
      agent_id: agentId,
      agent_name: agent.name,
      filters: { action_type: actionType, min_risk: minRisk ? Number(minRisk) : null, from, to, limit },
      summary: {
        event_count: rows.length,
        band_distribution: bands,
        action_type_counts: byAction,
        first_event_at: rows[0]?.occurred_at ?? null,
        last_event_at: rows[rows.length - 1]?.occurred_at ?? null,
      },
      events: rows,
      proof,
    },
  });
}
