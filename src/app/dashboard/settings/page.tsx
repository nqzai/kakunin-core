import Link from 'next/link';
import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TIERS, type PlanKey } from '@/lib/stripe/client';
import { createPortalSession } from '../billing/actions';
import { SignOutButton } from './SignOutButton';
import { ChannelsSection } from './ChannelsSection';

export const dynamic = 'force-dynamic';

/**
 * /dashboard/settings — tenant profile + billing management.
 *
 * RA-34 acceptance criteria:
 * ✓ Portal opens from Settings (createPortalSession server action)
 * ✓ Subscription changes propagate to feature_flags within 60s
 *   (handled by /api/webhooks/stripe customer.subscription.updated handler)
 */

export default async function SettingsPage() {
  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();

  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, email, stripe_customer_id, created_at')
    .eq('id', context.tenantId)
    .maybeSingle();

  if (!tenant) return null;

  const [{ data: flags }, { count: agentCount }, { count: keyCount }, { data: alertChannels }, { count: webhookCount }] = await Promise.all([
    db.from('feature_flags').select('*').eq('tenant_id', tenant.id).maybeSingle(),
    db
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .neq('status', 'deleted'),
    db
      .from('api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .is('revoked_at', null),
    db
      .from('tenant_alert_channels')
      .select('id, channel_type, config, is_active, created_at')
      .eq('tenant_id', tenant.id)
      .eq('is_active', true),
    db
      .from('webhooks')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('active', true),
  ]);

  const plan = (context.planTier ?? 'starter') as PlanKey;
  const tierName = TIERS[plan]?.name ?? context.planTier ?? 'starter';
  const memberSince = new Date(tenant.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  const sectionHead: React.CSSProperties = {
    fontFamily: 'var(--ff-mono)',
    fontSize: '10px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    marginBottom: '12px',
  };

  const card: React.CSSProperties = {
    background: 'var(--card)',
    border: '1px solid var(--hairline)',
    borderRadius: 'var(--r-md)',
    padding: '20px 24px',
    marginBottom: '16px',
  };

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid var(--paper-edge)',
    fontSize: '13px',
  };

  const label: React.CSSProperties = {
    fontFamily: 'var(--ff-mono)',
    fontSize: '11px',
    color: 'var(--ink-3)',
    minWidth: '140px',
  };

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Settings</h1>
          <p className="dash-sub">Tenant profile · billing · API access</p>
        </div>
      </div>

      {/* ── Workspace ──────────────────────────────────────────────────── */}
      <p style={sectionHead}>Workspace</p>
      <div style={card}>
        {[
          ['Organisation', tenant.name],
          ['Email', tenant.email],
          ['Tenant ID', tenant.id],
          ['Member since', memberSince],
        ].map(([k, v], i, arr) => (
          <div key={k} style={{ ...row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--paper-edge)' }}>
            <span style={label}>{k}</span>
            <span style={{
              fontFamily: k === 'Tenant ID' || k === 'Email' ? 'var(--ff-mono)' : undefined,
              fontSize: k === 'Tenant ID' ? '11px' : '13px',
              color: 'var(--ink)',
            }}>
              {v}
            </span>
          </div>
        ))}
      </div>

      {/* ── Subscription & billing ─────────────────────────────────────── */}
      <p style={{ ...sectionHead, marginTop: '24px' }}>Subscription</p>
      <div style={card}>
        {/* Current plan row */}
        <div style={{ ...row }}>
          <span style={label}>Plan</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--ff-mono)', fontSize: '11px',
              background: 'var(--green-paper)', color: 'var(--green-deep)',
              padding: '3px 10px', borderRadius: 'var(--r-pill)',
            }}>
              {tierName}
            </span>
            <Link
              href="/dashboard/billing"
              style={{ fontSize: '12px', color: 'var(--green)', textDecoration: 'none', fontFamily: 'var(--ff-mono)' }}
            >
              View plans →
            </Link>
          </div>
        </div>

        {/* Usage row */}
        <div style={{ ...row }}>
          <span style={label}>Agents</span>
          <span style={{ fontSize: '13px', color: 'var(--ink)' }}>
            {agentCount ?? 0}
            {flags?.max_agents ? (
              <span style={{ color: 'var(--ink-3)', marginLeft: '4px' }}>
                / {flags.max_agents === 99999 ? '∞' : flags.max_agents}
              </span>
            ) : null}
          </span>
        </div>

        {/* Active keys row */}
        <div style={{ ...row }}>
          <span style={label}>Active API keys</span>
          <span style={{ fontSize: '13px', color: 'var(--ink)' }}>{keyCount ?? 0}</span>
        </div>

        {/* Stripe portal CTA */}
        <div style={{ ...row, borderBottom: 'none', paddingTop: '16px' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, marginBottom: '2px' }}>
              Manage subscription
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
              Update payment method, download invoices, cancel or change plan
            </div>
          </div>

          {tenant.stripe_customer_id ? (
            <form action={createPortalSession} style={{ flexShrink: 0, marginLeft: '24px' }}>
              <button
                type="submit"
                style={{
                  padding: '9px 16px',
                  background: 'var(--ink)',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '12px',
                  color: 'var(--paper)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                Open billing portal →
              </button>
            </form>
          ) : (
            <Link
              href="/dashboard/billing"
              style={{
                flexShrink: 0, marginLeft: '24px',
                padding: '9px 16px',
                background: 'var(--green)',
                borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--ff-mono)', fontSize: '12px',
                color: 'var(--paper)', textDecoration: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              Choose a plan →
            </Link>
          )}
        </div>
      </div>

      {/* ── Feature flags (read-only) ──────────────────────────────────── */}
      {flags && (
        <>
          <p style={{ ...sectionHead, marginTop: '24px' }}>Feature access</p>
          <div style={card}>
            {([
              ['Max agents', flags.max_agents === 99999 ? 'Unlimited' : String(flags.max_agents)],
              ['Compliance reports', flags.reports_enabled ? 'Enabled' : 'Disabled'],
              ['Webhooks', flags.webhooks_enabled ? 'Enabled' : 'Disabled'],
              ['AgentMail inboxes', flags.agentmail_enabled ? 'Enabled' : 'Disabled'],
              ['Autonomous email handler', flags.autonomous_reply_enabled ? 'Enabled' : 'Disabled'],
            ] as [string, string][]).map(([k, v], i, arr) => (
              <div
                key={k}
                style={{ ...row, borderBottom: i === arr.length - 1 ? 'none' : '1px solid var(--paper-edge)' }}
              >
                <span style={label}>{k}</span>
                <span style={{
                  fontFamily: 'var(--ff-mono)', fontSize: '11px',
                  color: v === 'Disabled' ? 'var(--ink-3)' : 'var(--green-deep)',
                  background: v === 'Disabled' ? 'var(--paper-warm)' : 'var(--green-paper)',
                  padding: '2px 8px', borderRadius: 'var(--r-pill)',
                }}>
                  {v}
                </span>
              </div>
            ))}
            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)' }}>
              Feature flags sync automatically within 60 s of a subscription change.
            </div>
          </div>
        </>
      )}

      {/* ── Communication channels ───────────────────────────────────── */}
      <ChannelsSection
        plan={plan}
        activeChannels={(alertChannels ?? []).map((c) => ({
          ...c,
          config: (c.config ?? {}) as Record<string, unknown>,
        }))}
        webhookCount={webhookCount ?? 0}
        userEmail={tenant.email}
      />

      {/* ── Account ───────────────────────────────────────────────────── */}
      <p style={{ ...sectionHead, marginTop: '24px' }}>Account</p>
      <div style={card}>
        <div style={{ ...row, borderBottom: 'none', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, marginBottom: '2px' }}>
              Sign out
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
              End your session on this device
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────────────── */}
      <p style={{ ...sectionHead, marginTop: '24px' }}>Quick links</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
        {[
          { href: '/dashboard/api-keys', label: 'API Keys', desc: 'Create and rotate keys' },
          { href: '/dashboard/audit', label: 'Audit Log', desc: 'Append-only event history' },
          { href: '/docs', label: 'Documentation', desc: 'SDK, API reference, guides' },
        ].map(({ href, label: lbl, desc }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'block', padding: '14px 16px',
              background: 'var(--card)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-md)', textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, marginBottom: '3px' }}>{lbl}</div>
            <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)' }}>{desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
