import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { enqueue } from '@/lib/queue/qstash';
import { checkReportQuota, incrementReportCount } from '@/lib/quota/resource-quota';
import { getLimits } from '@/lib/quota/plan-limits';
import { log } from '@/lib/logging';

const STANDARDS_FRAMEWORKS = ['iso_27001', 'nist_csf', 'nist_ai_rmf', 'nccoe'] as const;

const reportBodySchema = z.object({
  agentId: z.string().uuid(),
  /** How many days back to include in the analysis. Default 30, max 90. */
  windowDays: z.number().int().min(1).max(90).optional().default(30),
  notes: z.string().max(1000).optional(),
  /** Optional standards frameworks to map findings against in the report. */
  standardsFrameworks: z.array(z.enum(STANDARDS_FRAMEWORKS)).optional().default([]),
});

/**
 * POST /v1/reports/compliance
 *
 * Creates a compliance report record (status: generating) and enqueues
 * a QStash job to generate the LLM-powered report content.
 *
 * Returns 202 immediately — client should poll GET /v1/reports/:id for status.
 * Never awaits the generation inline (Vercel 25s timeout).
 */
export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;

  const body = reportBodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { agentId, windowDays, notes, standardsFrameworks } = body.data;
  const supabase = createServiceClient();

  // Verify agent belongs to tenant + fetch plan tier in parallel
  const [agentResult, tenantResult] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('tenants')
      .select('plan_tier')
      .eq('id', tenantId)
      .single(),
  ]);

  const { data: agent, error: agentError } = agentResult;

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Enforce report quota and window days limit per plan
  const planTier = (tenantResult.data as { plan_tier?: string } | null)?.plan_tier ?? 'pending';
  const limits = getLimits(planTier);

  // Cap windowDays to plan maximum (Starter=30, Pro=90, Enterprise=unlimited)
  const cappedWindowDays = isFinite(limits.reportWindowDays)
    ? Math.min(windowDays, limits.reportWindowDays)
    : windowDays;

  const reportQuota = await checkReportQuota(supabase, tenantId, agentId, planTier);
  if (!reportQuota.allowed) {
    return NextResponse.json(
      {
        error: `Monthly report quota exceeded for this agent.`,
        quota: { limit: reportQuota.limit, current: reportQuota.current, plan: planTier },
      },
      { status: 429 },
    );
  }

  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - cappedWindowDays * 24 * 60 * 60 * 1000).toISOString();

  // Create report row in generating state — worker will update to ready/failed
  const { data: report, error: insertError } = await supabase
    .from('compliance_reports')
    .insert({
      tenant_id: tenantId,
      agent_id: agentId,
      title: `Compliance Report — ${agent.name} — ${now.toISOString().slice(0, 10)}`,
      status: 'generating',
      period_start: periodStart,
      period_end: periodEnd,
    })
    .select('id')
    .single();

  if (insertError || !report) {
    log.error('[reports.compliance] DB insert failed', insertError);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }

  try {
    await incrementReportCount(supabase, tenantId, agentId);
  } catch (err) {
    log.warn('[reports.compliance] quota counter increment failed:', (err as Error).message);
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'report.requested',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Compliance report requested for agent "${agent.name}" (${windowDays}-day window)`,
    affected_id: report.id,
    metadata: { agent_id: agentId, window_days: windowDays },
  });

  // Fire-and-forget — QStash handles retries: 3
  try {
    await enqueue({
      path: 'report-generate',
      body: {
        tenantId,
        agentId,
        reportId: report.id,
        windowDays: cappedWindowDays,
        ...(notes ? { notes } : {}),
        ...(standardsFrameworks.length > 0 ? { standardsFrameworks } : {}),
      },
    });
  } catch (err) {
    // QStash not wired in dev — log + continue, report stays in generating state
    log.warn('[reports.compliance] QStash enqueue skipped:', (err as Error).message);
  }

  return NextResponse.json(
    { data: { report_id: report.id, status: 'generating' } },
    { status: 202 }
  );
}
