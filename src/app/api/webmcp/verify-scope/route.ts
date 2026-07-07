import { NextRequest, NextResponse } from 'next/server';
import { invokeTenantScopedAgentRoute } from '@/lib/gateway/v1-route-invoke';
import { resolveWebMcpTenantContext } from '@/lib/webmcp/session';
import { createServiceClient } from '@/lib/supabase/server';
import { getFinancialScopeFromCertificatePem } from '@/lib/certificates/issue';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const agentId = searchParams.get('agent_id');
  const action = searchParams.get('action');

  if (!agentId || !action) {
    return NextResponse.json({ error: 'Missing agent_id or action' }, { status: 400 });
  }

  const tenantContext = await resolveWebMcpTenantContext();
  if (tenantContext.response) {
    return tenantContext.response;
  }

  const response = await invokeTenantScopedAgentRoute(tenantContext.context.tenantId, agentId);
  const data = await response.json() as Record<string, unknown>;
  const agent = (data['data'] as Record<string, unknown> | undefined) ?? null;

  if (!response.ok || !agent) {
    return NextResponse.json({ allowed: false, reason: 'Agent not found' });
  }

  const agentStatus = String(agent['status'] ?? 'unknown');
  const latestCertificate = Array.isArray(agent['certificates'])
    ? (agent['certificates'] as Array<Record<string, unknown>>)[0]
    : null;
  const certificateStatus = String(latestCertificate?.['status'] ?? 'none');

  if (agentStatus === 'suspended' || agentStatus === 'retired') {
    return NextResponse.json({
      allowed: false,
      agent_id: agentId,
      action,
      agent_status: agentStatus,
      certificate_status: certificateStatus,
      reason: `Agent is ${agentStatus} — no actions permitted`,
    });
  }

  if (certificateStatus !== 'active') {
    return NextResponse.json({
      allowed: false,
      agent_id: agentId,
      action,
      agent_status: agentStatus,
      certificate_status: certificateStatus,
      reason: `Certificate is ${certificateStatus} — no actions permitted`,
    });
  }

  // For trade actions, check financial_scope from the signed certificate
  // extension — never from agent.metadata, which a tenant can edit at will
  // after issuance and which is not cryptographically bound to the cert.
  const tradeActions = new Set(['trade_execution']);
  let financialScope = null as ReturnType<typeof getFinancialScopeFromCertificatePem>;

  if (tradeActions.has(action)) {
    const db = createServiceClient();
    const { data: cert, error: certError } = await db
      .from('certificates')
      .select('certificate_pem')
      .eq('agent_id', agentId)
      .eq('tenant_id', tenantContext.context.tenantId)
      .eq('status', 'active')
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Fail closed: a transient DB error must not silently fall through to
    // the unscoped "agent is active" allow path below for a trade action.
    if (certError) {
      return NextResponse.json({
        allowed: false,
        agent_id: agentId,
        action,
        agent_status: agentStatus,
        certificate_status: certificateStatus,
        reason: 'Could not verify financial scope — try again',
      }, { status: 503 });
    }

    financialScope = cert?.certificate_pem
      ? getFinancialScopeFromCertificatePem(cert.certificate_pem)
      : null;
  }

  if (tradeActions.has(action) && financialScope) {
    return NextResponse.json({
      allowed: true,
      agent_id: agentId,
      action,
      agent_status: agentStatus,
      certificate_status: certificateStatus,
      financial_scope: financialScope,
      reason: 'Agent active with financial scope configured',
    });
  }

  return NextResponse.json({
    allowed: agentStatus === 'active',
    agent_id: agentId,
    action,
    agent_status: agentStatus,
    certificate_status: certificateStatus,
    reason: agentStatus === 'active' ? 'Agent is active' : `Agent status is ${agentStatus}`,
  });
}
