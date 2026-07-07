/**
 * POST /api/reports/generate
 *
 * Dashboard-facing endpoint — authenticated via Supabase session (not API key).
 * Proxies to the core v1 reports logic but reads tenant from session rather
 * than the x-tenant-id middleware header (which only fires on /api/v1/*).
 *
 * Accepts: { agentId, windowDays, notes?, standardsFrameworks? }
 * Returns: { data: { report_id, status } } or { error }
 */
import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { enqueue } from '@/lib/queue/qstash';
import { checkReportQuota, incrementReportCount } from '@/lib/quota/resource-quota';
import { getLimits } from '@/lib/quota/plan-limits';
import { log } from '@/lib/logging';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

const bodySchema = z.object({
  agentId: z.string().uuid(),
  windowDays: z.number().int().min(1).max(90).optional().default(30),
  notes: z.string().max(1000).optional(),
  standardsFrameworks: z.array(z.enum(['iso_27001', 'nist_csf', 'nist_ai_rmf', 'nccoe'])).optional().default([]),
});

export async function POST(req: NextRequest) {
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const db = createServiceClient();
  const { user, tenant } = appContext;
  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const { agentId, windowDays, notes, standardsFrameworks } = body.data;
  const tenantId = tenant.id;
  const planTier = tenant.plan_tier ?? tenant.plan ?? 'pending';
  const limits = getLimits(planTier);

  // Verify agent belongs to this tenant
  const { data: agent, error: agentError } = await db
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Check feature flag
  const { data: flags } = await db
    .from('feature_flags')
    .select('reports_enabled')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (!flags?.reports_enabled) {
    return NextResponse.json(
      { error: 'Compliance reports require the Pro plan or above.' },
      { status: 403 },
    );
  }

  // Cap window to plan limit
  const cappedWindow = isFinite(limits.reportWindowDays)
    ? Math.min(windowDays, limits.reportWindowDays)
    : windowDays;

  const reportQuota = await checkReportQuota(db, tenantId, agentId, planTier);
  if (!reportQuota.allowed) {
    return NextResponse.json(
      { error: `Monthly report quota exceeded (${reportQuota.current}/${reportQuota.limit}).` },
      { status: 429 },
    );
  }

  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - cappedWindow * 86400_000).toISOString();

  const { data: report, error: insertError } = await db
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
    log.error('[reports.generate] DB insert failed', insertError);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }

  try {
    await incrementReportCount(db, tenantId, agentId);
  } catch (err) {
    log.warn('[reports.generate] quota counter increment failed:', (err as Error).message);
  }

  await writeAuditLog(db, {
    tenant_id: tenantId,
    event_type: 'report.requested',
    actor_type: 'user',
    actor_id: user.id,
    description: `Compliance report requested for agent "${agent.name}" (${cappedWindow}-day window)`,
    affected_id: report.id,
    metadata: { agent_id: agentId, window_days: cappedWindow },
  });

  try {
    await enqueue({
      path: 'report-generate',
      body: {
        tenantId,
        agentId,
        reportId: report.id,
        windowDays: cappedWindow,
        ...(notes ? { notes } : {}),
        ...(standardsFrameworks.length > 0 ? { standardsFrameworks } : {}),
      },
    });
  } catch (err) {
    log.warn('[reports.generate] QStash enqueue skipped:', (err as Error).message);
  }

  return NextResponse.json(
    { data: { report_id: report.id, status: 'generating' } },
    { status: 202 },
  );
}
