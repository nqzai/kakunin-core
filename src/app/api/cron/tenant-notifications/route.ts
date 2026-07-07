import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { getLimits } from '@/lib/quota/plan-limits';
import { hasNotificationOnDay, sendProactiveNotification } from '@/lib/notifications/proactive';
import { log } from '@/lib/logging';
import { isValidBearerSecret } from '@/lib/security/bearer-auth';

/**
 * POST /api/cron/tenant-notifications
 *
 * Daily cron job for proactive tenant notifications that are not tied to a
 * single synchronous request path.
 *
 * Current coverage:
 * - certificate_expiring: active certificate expires in ~7 days
 * - quota_warning: agent consumed >=80% of monthly event quota
 *
 * Auth: Vercel Cron sends CRON_SECRET in Authorization header.
 */
export async function POST(req: NextRequest) {
  // Fails closed if CRON_SECRET is unset (no `Bearer undefined` bypass).
  if (!isValidBearerSecret(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const start = new Date(now.getTime() + 6.5 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(now.getTime() + 7.5 * 24 * 60 * 60 * 1000).toISOString();
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [certificateResult, quotaResult, tenantResult] = await Promise.all([
    supabase
      .from('certificates')
      .select('id, tenant_id, agent_id, serial_number, expires_at')
      .eq('status', 'active')
      .gte('expires_at', start)
      .lte('expires_at', end),
    supabase
      .from('agent_event_counts')
      .select('tenant_id, agent_id, event_count, month')
      .eq('month', currentMonth),
    supabase
      .from('tenants')
      .select('id, email, plan_tier'),
  ]);

  const tenants = new Map(
    (tenantResult.data ?? []).map((tenant) => [tenant.id, tenant]),
  );

  const allAgentIds = Array.from(
    new Set([
      ...(certificateResult.data ?? []).map((row) => row.agent_id),
      ...(quotaResult.data ?? []).map((row) => row.agent_id),
    ]),
  );

  const { data: agents } = allAgentIds.length
    ? await supabase
        .from('agents')
        .select('id, tenant_id, name')
        .in('id', allAgentIds)
    : { data: [] as Array<{ id: string; tenant_id: string; name: string }> };

  const agentsById = new Map((agents ?? []).map((agent) => [agent.id, agent]));

  let expiryEmails = 0;
  let quotaEmails = 0;

  for (const cert of certificateResult.data ?? []) {
    const tenant = tenants.get(cert.tenant_id);
    const agent = agentsById.get(cert.agent_id);
    if (!tenant?.email || !agent) continue;

    const alreadySent = await hasNotificationOnDay(
      supabase,
      cert.tenant_id,
      cert.agent_id,
      'certificate_expiring',
      today,
    );
    if (alreadySent) continue;

    const actionUrl = `https://kakunin.ai/dashboard/agents/${cert.agent_id}`;
    await sendProactiveNotification({
      supabase,
      tenantId: cert.tenant_id,
      agentId: cert.agent_id,
      notificationType: 'certificate_expiring',
      title: 'Certificate expires in 7 days',
      message: `Agent "${agent.name}" has an active certificate expiring on ${cert.expires_at}.`,
      severity: 'warning',
      actionUrl,
      metadata: {
        certificate_id: cert.id,
        certificate_serial: cert.serial_number,
        expires_at: cert.expires_at,
      },
    });

    await dispatchEmail({
      template: 'certificate.expiring',
      to: tenant.email,
      data: {
        tenantId: cert.tenant_id,
        agentId: cert.agent_id,
        agentName: agent.name,
        certSerial: cert.serial_number,
        validUntil: cert.expires_at,
      },
    });

    expiryEmails++;
  }

  for (const quota of quotaResult.data ?? []) {
    const tenant = tenants.get(quota.tenant_id);
    const agent = agentsById.get(quota.agent_id);
    if (!tenant?.email || !agent) continue;

    const limit = getLimits(tenant.plan_tier).eventsPerAgent;
    if (!isFinite(limit) || limit <= 0) continue;

    const percentage = Math.floor((quota.event_count / limit) * 100);
    if (percentage < 80) continue;

    const alreadySent = await hasNotificationOnDay(
      supabase,
      quota.tenant_id,
      quota.agent_id,
      'quota_warning',
      today,
    );
    if (alreadySent) continue;

    await sendProactiveNotification({
      supabase,
      tenantId: quota.tenant_id,
      agentId: quota.agent_id,
      notificationType: 'quota_warning',
      title: 'Monthly event quota warning',
      message: `Agent "${agent.name}" has used ${quota.event_count} of ${limit} monthly events (${percentage}%).`,
      severity: 'warning',
      actionUrl: 'https://kakunin.ai/dashboard/billing',
      metadata: {
        current: quota.event_count,
        limit,
        percentage,
        month: quota.month,
      },
    });

    await dispatchEmail({
      template: 'quota.warning',
      to: tenant.email,
      data: {
        tenantId: quota.tenant_id,
        agentName: agent.name,
        current: quota.event_count,
        limit,
        percentage,
      },
    });

    quotaEmails++;
  }

  await writeAuditLog(supabase, {
    tenant_id: null,
    event_type: 'system.tenant_notifications_sent',
    actor_type: 'system',
    actor_id: 'cron/tenant-notifications',
    description: `Tenant notification cron sent ${expiryEmails} certificate-expiry emails and ${quotaEmails} quota-warning emails.`,
    affected_id: null,
    metadata: { expiry_emails: expiryEmails, quota_emails: quotaEmails, day: today },
  });

  log.info('[cron.tenant-notifications] run complete', {
    certificate_expiry_emails: expiryEmails,
    quota_warning_emails: quotaEmails,
  });

  return NextResponse.json({
    ok: true,
    certificate_expiry_emails: expiryEmails,
    quota_warning_emails: quotaEmails,
  });
}
