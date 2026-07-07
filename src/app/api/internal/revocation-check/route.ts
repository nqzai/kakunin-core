import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import type { Json } from '@/types/database';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { log } from '@/lib/logging';

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  eventId: z.string().uuid(),
  riskScore: z.number(),
  actionType: z.string(),
});

/**
 * QStash worker — evaluates whether a high-risk event warrants certificate suspension.
 *
 * Triggered by POST /v1/events when risk_band === 'high'.
 * Worker auth is enforced first via requireVerifiedQStashBody().
 *
 * Decision logic:
 *   - 3+ high-risk events in last 15 minutes → suspend agent + revoke active cert
 *   - Single high-risk event → log, no action (noise is expected from `transaction_anomaly`)
 */
export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  const body = bodySchema.safeParse(JSON.parse(verified.body));
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { tenantId, agentId, eventId, riskScore, actionType } = body.data;
  const supabase = createServiceClient();

  // Count high-risk events for this agent in last 15 minutes
  const windowStart = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from('behavior_events')
    .select('id', { count: 'exact', head: true })
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .eq('risk_band', 'high')
    .gte('occurred_at', windowStart);

  const highRiskCount = count ?? 0;

  // Single high-risk event — noise threshold not met, log and exit
  if (highRiskCount < 3) {
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'revocation_check.passed',
      actor_type: 'system',
      actor_id: 'revocation-worker',
      description: `High-risk event reviewed — ${highRiskCount} in window, threshold not met`,
      affected_id: agentId,
      metadata: { event_id: eventId, risk_score: riskScore, action_type: actionType, high_risk_count: highRiskCount } as Json,
    });
    return NextResponse.json({ action: 'none', high_risk_count: highRiskCount });
  }

  // 3+ high-risk events → suspend agent and revoke active certificate
  const [, certResult] = await Promise.all([
    supabase
      .from('agents')
      .update({ status: 'suspended', updated_at: new Date().toISOString() })
      .eq('id', agentId)
      .eq('tenant_id', tenantId),
    supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revocation_reason: `Auto-revoked: ${highRiskCount} high-risk events in 15 min window`,
        revoked_at: new Date().toISOString(),
      })
      .eq('agent_id', agentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .select('id'),
  ]);

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.auto_suspended',
    actor_type: 'system',
    actor_id: 'revocation-worker',
    description: `Agent auto-suspended: ${highRiskCount} high-risk events in 15 min`,
    affected_id: agentId,
    metadata: {
      trigger_event_id: eventId,
      risk_score: riskScore,
      action_type: actionType,
      high_risk_count: highRiskCount,
      certs_revoked: certResult.data?.map((c) => c.id) ?? [],
    } as Json,
  });

  // Email tenant admin — certificate.auto_revoked — fire-and-forget
  const { data: agentRow } = await supabase
    .from('agents')
    .select('name')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'certificate.auto_revoked',
      to: tenant.email,
      data: {
        tenantId,
        agentName: agentRow?.name ?? 'Unknown agent',
        agentId,
        riskScore,
      },
    }).catch((err: unknown) => {
      log.warn('[revocation-check] email dispatch failed', { error: (err as Error).message });
    });
  }

  return NextResponse.json({
    action: 'suspended',
    high_risk_count: highRiskCount,
    certs_revoked: certResult.data?.length ?? 0,
  });
}
