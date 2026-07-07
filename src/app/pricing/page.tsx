import type { Metadata } from 'next';
import Link from 'next/link';
import '../landing.css';
import './pricing.css';
import { SafeEmailLink } from '@/components/site/SafeEmailLink';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'AI Agent Compliance Pricing — Kakunin | MiCA Plans',
  description:
    'Simple, transparent pricing for AI agent compliance. Starter from $39/agent/month. Includes X.509 certificates, behaviour monitoring, and MiCA compliance reports. No hidden fees.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/pricing',
    title: 'AI Agent Compliance Pricing — Kakunin',
    description:
      'Starter from $39/agent/month. X.509 identities, behaviour monitoring, MiCA compliance reports. 30-day free trial — no charge until day 31.',
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Pricing' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Compliance Pricing — Kakunin',
    description:
      'Starter from $39/agent/month. X.509 identities, behaviour monitoring, MiCA compliance reports.',
    images: ['/og-image.png'],
  },
};

/** JSON-LD: SoftwareApplication with per-tier Offer items */
const pricingSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kakunin',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.kakunin.ai',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '39',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '39',
        priceCurrency: 'USD',
        referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitText: 'agent/month' },
      },
      description: 'Up to 5 agents. Certificate issuance, behaviour monitoring, compliance reports. Minimum 5 agents ($195/mo).',
    },
    {
      '@type': 'Offer',
      name: 'Professional',
      price: '99',
      priceCurrency: 'USD',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: '99',
        priceCurrency: 'USD',
        referenceQuantity: { '@type': 'QuantitativeValue', value: '1', unitText: 'agent/month' },
      },
      description: 'Up to 20 agents. Higher quotas, priority support, optional alert channels. Minimum 20 agents ($1,980/mo).',
    },
    {
      '@type': 'Offer',
      name: 'Enterprise',
      description: 'Unlimited agents. Custom SLAs, dedicated support, SSO, on-prem option. Contact for pricing.',
    },
  ],
};

const ChevronRight = () => (
  <svg className="arrow" viewBox="0 0 14 14" aria-hidden="true">
    <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PricingPage() {
  return (
    <div className="pricing-page">
      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingSchema) }}
      />

      {/* ── Nav ── */}
      <SiteNav active="pricing" />

      {/* ── Hero ── */}
      <section className="pricing-hero container">
        <div className="eyebrow">Pricing</div>
        <h1>
          Simple, transparent pricing
          <br />
          for AI compliance
        </h1>
        <p className="subtitle">
          Per-agent monthly pricing. No platform fees, no seat fees, no surprise invoices.
          Every plan includes a 30-day free trial — card required, no charge until day 31.
        </p>
        <div className="pricing-logic-note">
          Kakunin charges per certified agent — the unit you operate and report on.
          Starter suits teams deploying up to 5 agents. Pro suits teams scaling to production.
          Enterprise adds custom SLAs and dedicated infrastructure for banks and exchanges.
        </div>
      </section>

      {/* ── Tier grid ── */}
      <div className="tier-grid">

        {/* Starter */}
        <div className="tier-card">
          <p className="tier-name">Starter</p>
          <div className="tier-price">
            <span className="currency">$</span>
            <span className="amount">39</span>
            <span className="period">/agent/mo</span>
          </div>
          <p className="tier-price-sub">Minimum 5 agents &middot; from $195/mo</p>
          <p className="tier-tagline">
            Up to 5 certified agents. Full production feature set — try free for 30 days.
          </p>
          <div className="tier-divider" />

          {/* Core features */}
          <ul className="tier-features">
            <li>Up to <strong>5 certified agents</strong></li>
            <li>X.509 certificate issuance via AWS KMS</li>
            <li>Real-time behaviour monitoring &amp; risk scoring</li>
            <li>MiCA &amp; EU AI Act compliance reports</li>
            <li>Audit log — append-only, immutable (90-day retention)</li>
            <li>Webhook event delivery (HMAC-signed)</li>
            <li>Daily email digest for high-risk alerts</li>
            <li>REST API + TypeScript SDK</li>
            <li>Email support (48h SLA)</li>
            <li className="muted">Optional alert channels (add-on)</li>
            <li className="muted">Priority support</li>
            <li className="muted">Audit export API</li>
            <li className="muted">SSO / SAML</li>
          </ul>

          {/* Quota accordion */}
          <details className="quota-accordion">
            <summary>View detailed quotas</summary>
            <table className="quota-table">
              <thead>
                <tr><th>Resource</th><th>Per agent</th><th>Tenant total</th></tr>
              </thead>
              <tbody>
                <tr><td>Certified agents</td><td>—</td><td>5 max</td></tr>
                <tr><td>Behaviour events</td><td>10,000 / mo</td><td>50,000 / mo</td></tr>
                <tr><td>Compliance reports</td><td>1 / mo</td><td>5 / mo</td></tr>
                <tr><td>API rate limit</td><td>—</td><td>60 req / min</td></tr>
                <tr><td>Certificate operations</td><td>1 (issue)</td><td>5 / mo</td></tr>
                <tr><td>Webhook endpoints</td><td>—</td><td>1</td></tr>
                <tr><td>API keys</td><td>—</td><td>2</td></tr>
                <tr><td>Audit log retention</td><td>—</td><td>90 days</td></tr>
                <tr><td>Report window</td><td>—</td><td>30 days</td></tr>
              </tbody>
            </table>
          </details>

          <div className="tier-cta">
            <Link href="/signup" className="btn btn--primary">
              Start free trial
              <ChevronRight />
            </Link>
            <Link href="/docs" className="btn btn--ghost">Read docs</Link>
          </div>
        </div>

        {/* Pro — featured */}
        <div className="tier-card featured">
          <div className="tier-badge">Most popular</div>
          <p className="tier-name">Professional</p>
          <div className="tier-price">
            <span className="currency">$</span>
            <span className="amount">99</span>
            <span className="period">/agent/mo</span>
          </div>
          <p className="tier-price-sub">Minimum 20 agents &middot; from $1,980/mo</p>
          <p className="tier-tagline">
            Up to 20 agents. Higher quotas, priority support, and optional BYOA alert channels.
          </p>
          <div className="tier-divider" />

          {/* Core features */}
          <ul className="tier-features">
            <li>Up to <strong>20 certified agents</strong></li>
            <li>Everything in Starter</li>
            <li>Priority support (8h SLA)</li>
            <li>Audit export API (JSON / CSV)</li>
            <li>Bulk certificate operations</li>
            <li>Compliance report scheduling</li>
            <li>Dedicated onboarding session</li>
            <li>1 optional BYOA alert channel included</li>
            <li className="muted">SSO / SAML</li>
            <li className="muted">Custom SLAs</li>
            <li className="muted">On-prem data residency</li>
          </ul>

          {/* Quota accordion */}
          <details className="quota-accordion">
            <summary>View detailed quotas</summary>
            <table className="quota-table">
              <thead>
                <tr><th>Resource</th><th>Per agent</th><th>Tenant total</th></tr>
              </thead>
              <tbody>
                <tr><td>Certified agents</td><td>—</td><td>20 max</td></tr>
                <tr><td>Behaviour events</td><td>50,000 / mo</td><td>1,000,000 / mo</td></tr>
                <tr><td>Compliance reports</td><td>4 / mo</td><td>80 / mo</td></tr>
                <tr><td>API rate limit</td><td>—</td><td>300 req / min</td></tr>
                <tr><td>Certificate operations</td><td>3 (issue, renew, revoke)</td><td>60 / mo</td></tr>
                <tr><td>Webhook endpoints</td><td>—</td><td>5</td></tr>
                <tr><td>API keys</td><td>—</td><td>10</td></tr>
                <tr><td>Audit log retention</td><td>—</td><td>12 months</td></tr>
                <tr><td>Report window</td><td>—</td><td>Up to 90 days</td></tr>
                <tr><td>BYOA alert channels</td><td>—</td><td>1 included</td></tr>
              </tbody>
            </table>
          </details>

          {/* Optional channels accordion */}
          <details className="quota-accordion">
            <summary>Optional alert channels (BYOA)</summary>
            <p className="quota-note">
              Bring your own API account. Kakunin routes high-risk alerts through your credentials.
              You pay your provider directly; Kakunin charges a monthly provisioning fee.
            </p>
            <table className="quota-table">
              <thead>
                <tr><th>Channel</th><th>Add-on fee</th><th>Notes</th></tr>
              </thead>
              <tbody>
                <tr><td>Slack</td><td>$9 / mo</td><td>BYOA Slack workspace token</td></tr>
                <tr><td>PagerDuty</td><td>$15 / mo</td><td>BYOA PagerDuty routing key</td></tr>
                <tr><td>SMS (Twilio)</td><td>$12 / mo</td><td>BYOA Twilio account SID + auth token</td></tr>
                <tr><td>WhatsApp (Twilio)</td><td>$12 / mo</td><td>BYOA Twilio WhatsApp-enabled number</td></tr>
              </tbody>
            </table>
          </details>

          <div className="tier-cta">
            <Link href="/signup" className="btn btn--primary">
              Start free trial
              <ChevronRight />
            </Link>
            <Link href="/docs" className="btn btn--ghost">Read docs</Link>
          </div>
        </div>

        {/* Enterprise */}
        <div className="tier-card">
          <p className="tier-name">Enterprise</p>
          <div className="tier-price enterprise-price">
            <span className="amount">Custom</span>
          </div>
          <p className="tier-price-sub">Negotiated &middot; unlimited agents &middot; dedicated infra</p>
          <p className="tier-tagline">
            Unlimited agents with full SLA guarantees, dedicated infrastructure, and on-prem options
            for banks, top-tier exchanges, and regulated platforms.
          </p>
          <div className="tier-divider" />

          {/* Core features */}
          <ul className="tier-features">
            <li>Unlimited certified agents</li>
            <li>Everything in Pro</li>
            <li>Dedicated support engineer</li>
            <li>Custom SLAs (uptime, response time)</li>
            <li>SSO / SAML integration</li>
            <li>On-prem / dedicated Supabase instance</li>
            <li>Custom compliance report templates</li>
            <li>Regulatory liaison support</li>
            <li>Quarterly compliance review</li>
            <li>Early access to V2 features</li>
            <li>NDA + custom DPA on request</li>
          </ul>

          {/* Enterprise quotas accordion */}
          <details className="quota-accordion">
            <summary>What&apos;s negotiated?</summary>
            <table className="quota-table">
              <thead>
                <tr><th>Resource</th><th>Enterprise</th></tr>
              </thead>
              <tbody>
                <tr><td>Certified agents</td><td>Unlimited</td></tr>
                <tr><td>Behaviour events</td><td>Custom (pooled)</td></tr>
                <tr><td>Compliance reports</td><td>Custom cadence</td></tr>
                <tr><td>API rate limit</td><td>Custom burst + sustained</td></tr>
                <tr><td>Certificate operations</td><td>Unlimited</td></tr>
                <tr><td>Webhook endpoints</td><td>Unlimited</td></tr>
                <tr><td>API keys</td><td>Unlimited</td></tr>
                <tr><td>Audit log retention</td><td>Custom (up to 7 years)</td></tr>
                <tr><td>BYOA alert channels</td><td>All channels included</td></tr>
                <tr><td>Data residency</td><td>EU-only or on-prem</td></tr>
              </tbody>
            </table>
          </details>

          <div className="tier-cta">
            <SafeEmailLink
              email="ai@kakunin.ai"
              subject="Enterprise enquiry"
              className="btn btn--dark"
              label={
                <>
                  Contact us
                  <ChevronRight />
                </>
              }
            />
            <Link href="/docs" className="btn btn--ghost">Read docs</Link>
          </div>
        </div>

      </div>

      {/* ── Pricing note ── */}
      <div className="pricing-note">
        <p>
          All prices in USD, excluding VAT. Billed monthly or annually (save 15%).
          Pilot fee converts toward your first annual contract.
          Questions?{' '}
          <SafeEmailLink email="ai@kakunin.ai" />
        </p>
      </div>

      {/* ── Full comparison table ── */}
      <section className="compare-section container">
        <div className="eyebrow">Compare plans</div>
        <h2>Everything in the detail</h2>

        <details className="compare-accordion" open>
          <summary>Certificates &amp; Identity</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>X.509 certificate issuance (AWS KMS)</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>Max certified agents</td><td>5</td><td>20</td><td>Unlimited</td></tr>
              <tr><td>Certificate operations / mo</td><td>5</td><td>60</td><td>Unlimited</td></tr>
              <tr><td>Certificate renewal</td><td>Manual</td><td>Scheduled</td><td>Scheduled + custom</td></tr>
              <tr><td>Bulk certificate operations</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>HSM / CloudHSM key storage</td><td>—</td><td>—</td><td>✓</td></tr>
            </tbody>
          </table>
        </details>

        <details className="compare-accordion">
          <summary>Behaviour Monitoring</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Behaviour events / agent / mo</td><td>10,000</td><td>50,000</td><td>Custom</td></tr>
              <tr><td>Total events / tenant / mo</td><td>50,000</td><td>1,000,000</td><td>Custom</td></tr>
              <tr><td>Risk scoring engine</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>High-risk auto-revocation check</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>Financial scope enforcement</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>Custom risk thresholds per agent</td><td>—</td><td>✓</td><td>✓</td></tr>
            </tbody>
          </table>
        </details>

        <details className="compare-accordion">
          <summary>Compliance Reports</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Reports / agent / mo</td><td>1</td><td>4</td><td>Custom cadence</td></tr>
              <tr><td>Total reports / tenant / mo</td><td>5</td><td>80</td><td>Unlimited</td></tr>
              <tr><td>MiCA Art. 70/72 references</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>EU AI Act alignment</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>Report window (max days)</td><td>30</td><td>90</td><td>Custom</td></tr>
              <tr><td>Report scheduling</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>Custom report templates</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Standards frameworks (ISO 27001, SOC 2…)</td><td>—</td><td>✓</td><td>✓</td></tr>
            </tbody>
          </table>
        </details>

        <details className="compare-accordion">
          <summary>Alerts &amp; Notifications</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Webhook delivery (HMAC-signed)</td><td>1 endpoint</td><td>5 endpoints</td><td>Unlimited</td></tr>
              <tr><td>Daily email digest</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>BYOA Slack alerts</td><td>Add-on $9/mo</td><td>Add-on $9/mo</td><td>Included</td></tr>
              <tr><td>BYOA PagerDuty alerts</td><td>Add-on $15/mo</td><td>Add-on $15/mo</td><td>Included</td></tr>
              <tr><td>BYOA SMS alerts (Twilio)</td><td>Add-on $12/mo</td><td>Add-on $12/mo</td><td>Included</td></tr>
              <tr><td>BYOA WhatsApp alerts (Twilio)</td><td>Add-on $12/mo</td><td>Add-on $12/mo</td><td>Included</td></tr>
              <tr><td>Included BYOA channels</td><td>0</td><td>1</td><td>All</td></tr>
            </tbody>
          </table>
        </details>

        <details className="compare-accordion">
          <summary>API &amp; Integrations</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>REST API</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>TypeScript SDK</td><td>✓</td><td>✓</td><td>✓</td></tr>
              <tr><td>API rate limit (req / min)</td><td>60</td><td>300</td><td>Custom</td></tr>
              <tr><td>API keys</td><td>2</td><td>10</td><td>Unlimited</td></tr>
              <tr><td>Audit log retention</td><td>90 days</td><td>12 months</td><td>Up to 7 years</td></tr>
              <tr><td>Audit export API (JSON / CSV)</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>SSO / SAML</td><td>—</td><td>—</td><td>✓</td></tr>
            </tbody>
          </table>
        </details>

        <details className="compare-accordion">
          <summary>Support &amp; SLA</summary>
          <table className="compare-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>Starter</th>
                <th>Pro</th>
                <th>Enterprise</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Email support</td><td>✓ (48h SLA)</td><td>✓ (8h SLA)</td><td>✓ (custom SLA)</td></tr>
              <tr><td>Priority support</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>Dedicated support engineer</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Onboarding session</td><td>—</td><td>✓</td><td>✓</td></tr>
              <tr><td>Quarterly compliance review</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Regulatory liaison</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>Uptime SLA</td><td>99.9%</td><td>99.9%</td><td>Custom (up to 99.99%)</td></tr>
              <tr><td>NDA + custom DPA</td><td>—</td><td>—</td><td>✓</td></tr>
              <tr><td>On-prem / dedicated Supabase</td><td>—</td><td>—</td><td>✓</td></tr>
            </tbody>
          </table>
        </details>
      </section>

      {/* ── FAQ strip ── */}
      <section className="pricing-faq">
        <div className="pricing-faq-inner">
          <div className="eyebrow">Questions</div>
          <h2>Not sure which plan?</h2>
          <p style={{ color: 'var(--ink-2)', marginBottom: 32, lineHeight: 1.6 }}>
            Every plan starts with a 30-day free trial — card required, no charge until day 31.
            We provision your tenant, certify your first agents, and deliver your first compliance
            report inside 30 days. Talk to us and we&apos;ll find the right fit.
          </p>
          <div className="pricing-faq-links">
            <SafeEmailLink
              email="ai@kakunin.ai"
              className="btn btn--primary"
              label={
                <>
                  Talk to us
                  <ChevronRight />
                </>
              }
            />
            <Link href="/docs" className="btn btn--ghost">Read the docs</Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
