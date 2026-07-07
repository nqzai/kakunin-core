import { NextRequest, NextResponse } from 'next/server';
import { invokeTenantScopedAgentRiskRoute } from '@/lib/gateway/v1-route-invoke';
import { resolveWebMcpTenantContext } from '@/lib/webmcp/session';

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agent_id');

  if (!agentId) {
    return NextResponse.json({ error: 'Missing agent_id' }, { status: 400 });
  }

  const tenantContext = await resolveWebMcpTenantContext();
  if (tenantContext.response) {
    return tenantContext.response;
  }

  const response = await invokeTenantScopedAgentRiskRoute(tenantContext.context.tenantId, agentId);
  const data = await response.json() as Record<string, unknown>;
  const payload = (data['data'] as Record<string, unknown> | undefined) ?? {};
  const band = String(payload['dominant_band'] ?? 'low');

  const guidance: Record<string, string> = {
    low: 'Operating normally. Continue at full capacity.',
    medium: 'Elevated risk. Review recent activity and reduce non-essential operations.',
    high: 'High risk. Pre-revocation warning active. Halt non-critical operations immediately.',
  };

  return NextResponse.json(
    response.ok
      ? {
          agent_id: agentId,
          risk_score: payload['avg_score'] ?? 0,
          risk_band: band,
          event_count: payload['total_events'] ?? 0,
          window_days: payload['window_days'] ?? 30,
          guidance: guidance[band] ?? guidance.low,
          raw: payload,
        }
      : data,
    { status: response.status }
  );
}
