import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import { complete, getModel } from '@/lib/openrouter/client';
import { dispatchEmail } from '@/lib/email/dispatch';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { buildStandardsPromptSection, type StandardsFramework } from '@/lib/compliance/standards-map';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { log } from '@/lib/logging';

/**
 * POST /api/internal/report-generate (QStash worker)
 *
 * Receives a QStash job, fetches agent + event data, calls OpenRouter
 * (anthropic/claude-sonnet-4-5), and persists the generated report.
 *
 * Always returns 200 — QStash interprets non-2xx as failure and retries.
 * Use { ok: false } body to signal soft failure without retry.
 *
 * Worker auth is enforced first via requireVerifiedQStashBody().
 */

interface ReportJobPayload {
  tenantId: string;
  agentId: string;
  reportId: string;
  windowDays: number;
  notes?: string;
  standardsFrameworks?: StandardsFramework[];
}

type SupabaseClient = ReturnType<typeof createServiceClient>;

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  const payload = JSON.parse(verified.body) as ReportJobPayload;
  const { tenantId, agentId, reportId, windowDays, notes, standardsFrameworks = [] } = payload;

  const supabase = createServiceClient();

  // Fetch agent
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, model, version, status')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!agent) {
    log.error('[report-generate] Agent not found', { agentId, reportId });
    await markFailed(supabase, reportId, tenantId);
    return NextResponse.json({ ok: false });
  }

  // Fetch behavioral events for the analysis window
  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from('behavior_events')
    .select('action_type, risk_score, risk_band, occurred_at')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .gte('occurred_at', windowStart);

  const allEvents = events ?? [];
  const totalEvents = allEvents.length;
  const highRisk = allEvents.filter((e) => e.risk_band === 'high').length;
  const mediumRisk = allEvents.filter((e) => e.risk_band === 'medium').length;
  const avgScore =
    totalEvents > 0
      ? Math.round(
          (allEvents.reduce((s, e) => s + e.risk_score, 0) / totalEvents) * 1000
        ) / 1000
      : 0;

  // Most recent certificate for this agent
  const { data: cert } = await supabase
    .from('certificates')
    .select('serial_number, status, issued_at, expires_at')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Generate report content via OpenRouter claude-sonnet-4-5
  const systemPrompt =
    'You are a MiCA/EU AI Act compliance analyst generating formal compliance reports for AI agent operators. ' +
    'Write in professional regulatory language. Be concise and data-driven. Cite exact figures provided.';

  const userPrompt = `Generate a compliance report for the following AI agent:

Agent: ${agent.name}
Model: ${agent.model} v${agent.version}
Operational Status: ${agent.status}
Certificate: ${
    cert
      ? `Serial ${cert.serial_number} — Status: ${cert.status} — Expires: ${cert.expires_at}`
      : 'No certificate issued'
  }

Behavioral Analysis (last ${windowDays} days):
- Total behavioral events: ${totalEvents}
- High-risk events: ${highRisk} (score ≥ 0.85 — auto-revocation threshold per §3.2)
- Medium-risk events: ${mediumRisk} (score 0.30–0.84)
- Average risk score: ${avgScore}
${notes ? `\nReviewer notes: ${notes}` : ''}
${buildStandardsPromptSection(standardsFrameworks)}
Structure the report with these sections:
1. Executive Summary
2. Behavioral Risk Assessment
3. Certificate Status & Key Custody
4. Compliance Findings (MiCA Art. 70/72 references where applicable)
5. Recommendations${standardsFrameworks.length > 0 ? '\n6. Standards Alignment Summary' : ''}`;

  let summary: string;
  try {
    const result = await complete({
      model: getModel('compliance_report'),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    });
    summary = result.content;
  } catch (err) {
    log.error('[report-generate] OpenRouter failed', err);
    await markFailed(supabase, reportId, tenantId, agent.name);
    return NextResponse.json({ ok: false });
  }

  // Persist generated content
  const { error: updateError } = await supabase
    .from('compliance_reports')
    .update({ status: 'ready', summary, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    log.error('[report-generate] DB update failed', updateError);
    await markFailed(supabase, reportId, tenantId, agent.name);
    return NextResponse.json({ ok: false });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'report.generated',
    actor_type: 'system',
    actor_id: 'report-generate-worker',
    description: `Compliance report generated for agent "${agent.name}"`,
    affected_id: reportId,
    metadata: {
      agent_id: agentId,
      window_days: windowDays,
      total_events: totalEvents,
      high_risk_events: highRisk,
      avg_score: avgScore,
    },
  });

  // Dispatch report.completed webhook event — fire-and-forget
  dispatchWebhookEvent({
    tenantId,
    eventType: 'report.completed',
    payload: {
      report_id: reportId,
      agent_id: agentId,
      agent_name: agent.name,
      window_days: windowDays,
      total_events: totalEvents,
      high_risk_events: highRisk,
      avg_score: avgScore,
    },
  }).catch((err: unknown) => {
    log.warn('[report-generate] webhook dispatch failed:', (err as Error).message);
  });

  // Email tenant admin — report.ready — fire-and-forget
  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'report.ready',
      to: tenant.email,
      data: {
        tenantId,
        reportId,
        period: `Last ${windowDays} days — ${agent.name}`,
      },
    }).catch((err: unknown) => {
      log.warn('[report-generate] email dispatch failed', { error: (err as Error).message });
    });
  }

  return NextResponse.json({ ok: true });
}

async function markFailed(
  supabase: SupabaseClient,
  reportId: string,
  tenantId: string,
  agentName?: string,
) {
  await supabase
    .from('compliance_reports')
    .update({ status: 'failed', updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .eq('tenant_id', tenantId);

  // Audit the failed state transition (rule #1: every state mutation is audited)
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'report.failed',
    actor_type: 'system',
    actor_id: 'report-generate-worker',
    description: `Compliance report ${reportId} generation failed`,
    affected_id: reportId,
  });

  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'report.failed',
      to: tenant.email,
      data: {
        tenantId,
        reportId,
        agentName: agentName ?? 'this agent',
      },
    }).catch((err: unknown) => {
      log.warn('[report-generate] failure email dispatch failed', { error: (err as Error).message });
    });
  }
}
