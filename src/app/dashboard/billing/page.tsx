import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { TIERS, TIER_ORDER, type PlanKey, stripe } from '@/lib/stripe/client';
import { getLimits } from '@/lib/quota/plan-limits';
import { createCheckoutSession, createPortalSession } from './actions';

const INVOICE_STATUS_STYLE: Record<string, { color: string; label: string }> = {
  paid:          { color: 'var(--green)',  label: 'Paid' },
  open:          { color: 'var(--amber)',  label: 'Open' },
  draft:         { color: 'var(--ink-3)', label: 'Draft' },
  uncollectible: { color: 'var(--red)',    label: 'Uncollectible' },
  void:          { color: 'var(--ink-3)', label: 'Void' },
};

export const dynamic = 'force-dynamic';

/**
 * /dashboard/billing — plan management.
 *
 * RA-33 acceptance criteria:
 * ✓ Current plan displayed with usage meter (agents used / max)
 * ✓ 3 tier cards — Starter, Pro, Enterprise
 * ✓ Upgrade CTA → Stripe Checkout (server action, no client JS)
 * ✓ "Manage subscription" → Stripe Billing Portal
 * ✓ Trial banner when trial active
 * ✓ feature_flags synced on subscription.updated webhook
 */

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const success = sp.success === '1';
  const cancelled = sp.cancelled === '1';
  const successPlan = typeof sp.plan === 'string' ? sp.plan : '';
  const errorParam = typeof sp.error === 'string' ? sp.error : '';

  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();

  const [{ data: flags }, { count: agentCount }, invoicesResult] = await Promise.all([
    db
      .from('feature_flags')
      .select('*')
      .eq('tenant_id', context.tenantId)
      .maybeSingle(),
    db
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', context.tenantId)
      .neq('status', 'deleted'),
    context.stripeCustomerId
      ? stripe.invoices.list({ customer: context.stripeCustomerId, limit: 24 })
      : Promise.resolve({ data: [] }),
  ]);

  const invoices = invoicesResult.data;

  const currentPlan = (context.planTier ?? 'starter') as PlanKey;
  const currentTier = TIERS[currentPlan] ?? TIERS.starter;
  const maxAgents = flags?.max_agents ?? getLimits(currentPlan).agents;
  const usedAgents = agentCount ?? 0;
  const usagePct = Math.min(100, Math.round((usedAgents / (maxAgents as number)) * 100));
  const hasStripeCustomer = !!context.stripeCustomerId;

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Billing & Plan</h1>
          <p className="dash-sub">
            Current plan: <strong style={{ color: 'var(--ink)' }}>{currentTier.name}</strong>
            {hasStripeCustomer ? ' · Managed via Stripe' : ' · No payment method on file'}
          </p>
        </div>
      </div>

      {/* Flash banners */}
      {success && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: 'var(--green-paper)', border: '1px solid var(--green)',
          borderRadius: 'var(--r-md)', display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--green)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
          </svg>
          <span style={{ fontSize: '13px', color: 'var(--green-deep)', fontWeight: 500 }}>
            {successPlan
              ? `You're now on the ${TIERS[successPlan as PlanKey]?.name ?? successPlan} plan. Feature flags updated.`
              : 'Subscription activated successfully.'}
          </span>
        </div>
      )}

      {cancelled && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', fontSize: '13px', color: 'var(--ink-2)',
        }}>
          Checkout cancelled — your plan was not changed.
        </div>
      )}

      {errorParam === 'price_not_configured' && (
        <div style={{
          marginBottom: '20px', padding: '14px 18px',
          background: 'var(--red-soft)', border: '1px solid var(--red)',
          borderRadius: 'var(--r-md)', fontSize: '13px', color: '#7C201D',
        }}>
          This plan is not yet available for purchase. Contact us at{' '}
          <a href="mailto:hello@kakunin.ai" style={{ color: 'inherit', textDecoration: 'underline' }}>
            hello@kakunin.ai
          </a>
          .
        </div>
      )}

      {/* Usage meter */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '4px' }}>
              Agent usage
            </div>
            <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--ff-display)', color: 'var(--ink)' }}>
              {usedAgents}
              <span style={{ fontSize: '14px', color: 'var(--ink-3)', fontWeight: 400, marginLeft: '4px' }}>
                / {maxAgents === 99999 ? '∞' : maxAgents} agents
              </span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: usagePct >= 80 ? 'var(--red)' : 'var(--ink-3)' }}>
            {usagePct}% used
          </div>
        </div>
        <div style={{ height: '6px', background: 'var(--paper-warm)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${usagePct}%`,
            background: usagePct >= 90 ? 'var(--red)' : usagePct >= 70 ? 'var(--amber)' : 'var(--green)',
            borderRadius: '3px',
            transition: 'width 0.3s',
          }} />
        </div>
        {usagePct >= 80 && (
          <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--red)', fontFamily: 'var(--ff-mono)' }}>
            Approaching agent limit — upgrade to avoid blocking new registrations.
          </p>
        )}
      </div>

      {/* Tier cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {TIER_ORDER.map((planKey) => {
          const tier = TIERS[planKey];
          const isCurrent = planKey === currentPlan;
          const isHigher = TIER_ORDER.indexOf(planKey) > TIER_ORDER.indexOf(currentPlan);

          return (
            <div
              key={planKey}
              style={{
                background: tier.highlighted ? 'var(--card)' : 'var(--card)',
                border: isCurrent
                  ? '2px solid var(--green)'
                  : tier.highlighted
                  ? '2px solid var(--ink-3)'
                  : '1px solid var(--hairline)',
                borderRadius: 'var(--r-md)',
                padding: '24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Badges */}
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: '-1px', right: '16px',
                  background: 'var(--green)', color: 'var(--paper)',
                  fontFamily: 'var(--ff-mono)', fontSize: '10px',
                  padding: '3px 8px', borderRadius: '0 0 var(--r-sm) var(--r-sm)',
                  letterSpacing: '0.08em',
                }}>
                  CURRENT PLAN
                </div>
              )}
              {tier.highlighted && !isCurrent && (
                <div style={{
                  position: 'absolute', top: '-1px', right: '16px',
                  background: 'var(--ink)', color: 'var(--paper)',
                  fontFamily: 'var(--ff-mono)', fontSize: '10px',
                  padding: '3px 8px', borderRadius: '0 0 var(--r-sm) var(--r-sm)',
                  letterSpacing: '0.08em',
                }}>
                  MOST POPULAR
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: '18px', color: 'var(--ink)', marginBottom: '4px' }}>
                  {tier.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: 'var(--ink)' }}>{tier.priceLabel}</span>
                  <span style={{ fontSize: '12px', color: 'var(--ink-3)' }}>/agent/mo</span>
                </div>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  {tier.description}
                </p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', flex: 1 }}>
                {tier.features.map((f) => (
                  <li key={f} style={{
                    display: 'flex', gap: '8px', alignItems: 'flex-start',
                    padding: '5px 0', fontSize: '12px', color: 'var(--ink-2)',
                    borderBottom: '1px solid var(--paper-edge)',
                  }}>
                    <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'var(--green)', fill: 'none', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0, marginTop: '2px' }}>
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrent ? (
                hasStripeCustomer ? (
                  <form action={createPortalSession}>
                    <button
                      type="submit"
                      style={{
                        width: '100%', padding: '10px',
                        background: 'transparent', border: '1px solid var(--hairline-2)',
                        borderRadius: 'var(--r-sm)', cursor: 'pointer',
                        fontFamily: 'var(--ff-mono)', fontSize: '12px',
                        color: 'var(--ink-2)', letterSpacing: '0.04em',
                      }}
                    >
                      Manage subscription →
                    </button>
                  </form>
                ) : (
                  <div style={{
                    padding: '10px', textAlign: 'center',
                    fontFamily: 'var(--ff-mono)', fontSize: '11px',
                    color: 'var(--green)', background: 'var(--green-paper)',
                    borderRadius: 'var(--r-sm)',
                  }}>
                    Active plan
                  </div>
                )
              ) : isHigher ? (
                <form action={createCheckoutSession.bind(null, planKey)}>
                  <button
                    type="submit"
                    style={{
                      width: '100%', padding: '10px',
                      background: tier.highlighted ? 'var(--ink)' : 'var(--green)',
                      border: 'none',
                      borderRadius: 'var(--r-sm)', cursor: 'pointer',
                      fontFamily: 'var(--ff-mono)', fontSize: '12px',
                      color: 'var(--paper)', letterSpacing: '0.04em',
                      fontWeight: 600,
                    }}
                  >
                    Upgrade to {tier.name} →
                  </button>
                </form>
              ) : (
                <div style={{
                  padding: '10px', textAlign: 'center',
                  fontFamily: 'var(--ff-mono)', fontSize: '11px',
                  color: 'var(--ink-3)',
                }}>
                  Downgrade via portal
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel subscription — only when Stripe customer exists */}
      {hasStripeCustomer && (
        <div style={{
          marginBottom: '16px', padding: '14px 18px',
          background: 'var(--card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
        }}>
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-2)', fontWeight: 600, marginBottom: '2px' }}>
              Cancel subscription
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              Your subscription will remain active until the end of the billing period.
            </div>
          </div>
          <form action={createPortalSession}>
            <button
              type="submit"
              style={{
                padding: '8px 16px', whiteSpace: 'nowrap',
                background: 'transparent', border: '1px solid var(--red)',
                borderRadius: 'var(--r-sm)', cursor: 'pointer',
                fontFamily: 'var(--ff-mono)', fontSize: '11px',
                color: 'var(--red)', letterSpacing: '0.04em',
              }}
            >
              Cancel via portal →
            </button>
          </form>
        </div>
      )}

      {/* Trial / enterprise note */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px',
      }}>
        <div style={{
          padding: '16px 18px',
          background: 'var(--paper-warm)', border: '1px dashed var(--paper-edge)',
          borderRadius: 'var(--r-sm)',
          fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--ink-2)', display: 'block', marginBottom: '4px' }}>30-day free trial</strong>
          All new subscriptions include a 30-day free trial. No charge until day 31.
          Cancel any time from the billing portal.
        </div>
        <div style={{
          padding: '16px 18px',
          background: 'var(--paper-warm)', border: '1px dashed var(--paper-edge)',
          borderRadius: 'var(--r-sm)',
          fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--ink-2)', display: 'block', marginBottom: '4px' }}>Enterprise procurement</strong>
          Need PO, MSA, or custom SLA?{' '}
          <a href="mailto:hello@kakunin.ai" style={{ color: 'var(--green)', textDecoration: 'none' }}>
            hello@kakunin.ai
          </a>
          {' '}— we handle EUCS and tender frameworks.
        </div>
      </div>

      {/* Billing history / receipts */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '16px' }}>
          Billing history · {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
        </div>
        {invoices.length === 0 ? (
          <div style={{
            padding: '32px 0', textAlign: 'center',
            fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
          }}>
            {hasStripeCustomer
              ? 'No invoices yet — first charge occurs when trial ends.'
              : 'No billing account yet. Start a subscription to see receipts.'}
          </div>
        ) : (
          <div className="agents-table-wrap" style={{ margin: 0 }}>
            <table className="agents-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Period</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const statusStyle = INVOICE_STATUS_STYLE[inv.status ?? 'draft'] ?? INVOICE_STATUS_STYLE['draft'];
                  const amount = inv.amount_paid != null
                    ? `$${(inv.amount_paid / 100).toFixed(2)}`
                    : inv.amount_due != null
                    ? `$${(inv.amount_due / 100).toFixed(2)}`
                    : '—';
                  const date = inv.created
                    ? new Date(inv.created * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—';
                  const periodStart = inv.period_start
                    ? new Date(inv.period_start * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : null;
                  const periodEnd = inv.period_end
                    ? new Date(inv.period_end * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : null;

                  return (
                    <tr key={inv.id}>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
                        {inv.number ?? inv.id.slice(0, 14) + '…'}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: statusStyle.color, fontWeight: 600 }}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '13px', fontWeight: 600 }}>
                        {amount}
                      </td>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                        {periodStart && periodEnd ? `${periodStart} – ${periodEnd}` : '—'}
                      </td>
                      <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                        {date}
                      </td>
                      <td>
                        {inv.hosted_invoice_url && (
                          <a
                            href={inv.hosted_invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="row-action"
                          >
                            View PDF
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                              <polyline points="15 3 21 3 21 9" />
                              <line x1="10" y1="14" x2="21" y2="3" />
                            </svg>
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feature flags debug (plan features enabled) */}
      {flags && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--r-md)', padding: '16px 20px',
        }}>
          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '12px' }}>
            Active feature flags
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
            {([
              ['max_agents', flags.max_agents === 99999 ? '∞' : String(flags.max_agents)],
              ['reports', flags.reports_enabled],
              ['webhooks', flags.webhooks_enabled],
              ['agentmail', flags.agentmail_enabled],
              ['autonomous_reply', flags.autonomous_reply_enabled],
            ] as [string, boolean | string][]).map(([label, val]) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 10px', borderRadius: 'var(--r-sm)',
                background: 'var(--paper-warm)',
                fontFamily: 'var(--ff-mono)', fontSize: '11px',
              }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: val === true || (typeof val === 'string' && val !== '0')
                    ? 'var(--green)'
                    : 'var(--ink-3)',
                }} />
                <span style={{ color: 'var(--ink-2)' }}>{label}</span>
                <span style={{ marginLeft: 'auto', color: 'var(--ink-3)' }}>
                  {typeof val === 'boolean' ? (val ? 'on' : 'off') : val}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
