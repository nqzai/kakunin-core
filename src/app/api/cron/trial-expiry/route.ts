import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { log } from '@/lib/logging';
import { isValidBearerSecret } from '@/lib/security/bearer-auth';

/**
 * POST /api/cron/trial-expiry
 *
 * Daily cron job — scans tenants with active trials and sends warning emails.
 * Invoked by Vercel Cron at 08:00 UTC daily.
 *
 * Warning schedule:
 *   Day 25 (5 days left)  → billing.trial_ending_soon (first warning)
 *   Day 28 (2 days left)  → billing.trial_ending_urgent (urgency nudge)
 *
 * Idempotent: audit_log check prevents duplicate sends within the same day.
 * Stripe handles the actual charge on day 30 — no charge logic here.
 *
 * Auth: Vercel Cron sends CRON_SECRET in Authorization header.
 */
export async function POST(req: NextRequest) {
  // Validate Vercel Cron secret — prevents unauthorized invocation.
  // Fails closed if CRON_SECRET is unset (no `Bearer undefined` bypass).
  if (!isValidBearerSecret(req.headers.get('authorization'), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Build day-25 and day-28 windows (±12 hours around target days)
  const day25Start = new Date(now.getTime() + 4.5 * 24 * 60 * 60 * 1000).toISOString();
  const day25End = new Date(now.getTime() + 5.5 * 24 * 60 * 60 * 1000).toISOString();
  const day28Start = new Date(now.getTime() + 1.5 * 24 * 60 * 60 * 1000).toISOString();
  const day28End = new Date(now.getTime() + 2.5 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch tenants in both windows in parallel
  const db = supabase;

  const [day25Result, day28Result] = await Promise.all([
    db
      .from('tenants')
      .select('id, email, plan_tier, trial_ends_at')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', day25Start)
      .lte('trial_ends_at', day25End),
    db
      .from('tenants')
      .select('id, email, plan_tier, trial_ends_at')
      .not('trial_ends_at', 'is', null)
      .gte('trial_ends_at', day28Start)
      .lte('trial_ends_at', day28End),
  ]);

  const day25Tenants: Array<{ id: string; email: string; plan_tier: string; trial_ends_at: string | null }> = day25Result.data ?? [];
  const day28Tenants: Array<{ id: string; email: string; plan_tier: string; trial_ends_at: string | null }> = day28Result.data ?? [];

  let warned25 = 0;
  let warned28 = 0;
  let skipped = 0;

  // Process day-25 warnings (5 days left)
  for (const tenant of day25Tenants) {
    if (!tenant.email) continue;

    // Idempotency: skip if we already sent this warning today
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const { count } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('event_type', 'billing.trial_warning_5d')
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }

    if (!tenant.trial_ends_at) continue; // query filters nulls, but narrow for the type system
    const endDate = new Date(tenant.trial_ends_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    await dispatchEmail({
      template: 'billing.trial_ending_7d',
      to: tenant.email,
      data: { tenantId: tenant.id, endDate, daysLeft: 5 },
    });

    await writeAuditLog(supabase, {
      tenant_id: tenant.id,
      event_type: 'billing.trial_warning_5d',
      actor_type: 'system',
      actor_id: 'cron/trial-expiry',
      description: `Trial warning email sent — 5 days remaining, trial ends ${endDate}`,
      affected_id: tenant.id,
      metadata: { trial_ends_at: tenant.trial_ends_at, plan_tier: tenant.plan_tier },
    });

    warned25++;
    log.info('[cron.trial-expiry] 5-day warning sent', { tenantId: tenant.id, endDate });
  }

  // Process day-28 warnings (2 days left)
  for (const tenant of day28Tenants) {
    if (!tenant.email) continue;

    const today = now.toISOString().slice(0, 10);
    const { count } = await supabase
      .from('audit_log')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('event_type', 'billing.trial_warning_2d')
      .gte('created_at', `${today}T00:00:00Z`);

    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }

    if (!tenant.trial_ends_at) continue; // query filters nulls, but narrow for the type system
    const endDate = new Date(tenant.trial_ends_at).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    await dispatchEmail({
      template: 'billing.trial_ending_2d',
      to: tenant.email,
      data: { tenantId: tenant.id, endDate, daysLeft: 2 },
    });

    await writeAuditLog(supabase, {
      tenant_id: tenant.id,
      event_type: 'billing.trial_warning_2d',
      actor_type: 'system',
      actor_id: 'cron/trial-expiry',
      description: `Trial urgency email sent — 2 days remaining, trial ends ${endDate}`,
      affected_id: tenant.id,
      metadata: { trial_ends_at: tenant.trial_ends_at, plan_tier: tenant.plan_tier },
    });

    warned28++;
    log.info('[cron.trial-expiry] 2-day warning sent', { tenantId: tenant.id, endDate });
  }

  log.info('[cron.trial-expiry] run complete', { warned25, warned28, skipped });

  return NextResponse.json({
    ok: true,
    warned_5d: warned25,
    warned_2d: warned28,
    skipped,
  });
}
