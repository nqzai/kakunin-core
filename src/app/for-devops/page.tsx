import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Agent Operations for DevOps — Runbooks, SLAs & Revocation | Kakunin' },
  description: 'Run AI agent operations with SLAs, revocation runbooks, webhook delivery, and certificate enforcement. Built for on-call teams managing agent fleets.',
  alternates: { canonical: '/for-devops' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/for-devops',
    title: 'AI Agent Operations for DevOps — Runbooks, SLAs & Revocation | Kakunin',
    description: 'SLA-backed auto-revocation, certificate enforcement, webhook delivery, and incident runbooks for AI fleets.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Agent Operations for DevOps' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Operations for DevOps — Kakunin',
    description: 'Runbooks, SLAs, certificate enforcement, and auto-revocation for AI agent fleets.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'For DevOps', item: 'https://www.kakunin.ai/for-devops' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the auto-revocation SLA for misbehaving AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'When an agent risk score exceeds 0.85, Kakunin revokes the certificate within 60 seconds. A webhook event (certificate.revoked) is delivered within 5 seconds of revocation. A pre-revocation warning fires at the 0.75 threshold, giving your team time to investigate before auto-revocation triggers.',
      },
    },
    {
      '@type': 'Question',
      name: 'What webhook events does Kakunin support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin delivers four webhook event types: certificate.issued (new cert + KMS ARN), certificate.revoked (revocation + reason), risk.warning (score crossed 0.75), and risk.alert (score crossed 0.85, pre-revocation). All events use HMAC-SHA256 signatures. Delivery is at-least-once with 3 retries and exponential backoff.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the uptime SLA and how are credits handled?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin guarantees 99.9% uptime, equivalent to less than 8.76 hours of downtime per year. The public /api/v1/verify endpoint has a separate p99 latency SLA of under 500ms. SLA credits are issued automatically if guarantees are breached. Service is monitored 24/7 via Better Stack with a public status page.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I prevent a runaway AI agent from blowing my budget?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Behavioral monitoring tracks agent actions in real-time — transaction volumes, API call rates, data access patterns. Anomalies trigger risk score increases. When risk crosses 0.85 the agent certificate is revoked and all subsequent operations blocked within 60 seconds. You can also manually halt any agent via POST /api/v1/agents/{id}/halt.',
      },
    },
  ],
};

export default function ForDevOpsPage() {
  return (
    <div className="pp-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <SiteNav />

      {/* ---- Hero ---- */}
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="pp-hero-inner">
          <div className="pp-breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>For DevOps</span>
          </div>
          <span className="eyebrow">Operations &amp; FinOps</span>
          <h1 className="pp-hero-title">
            AI agent operations
            <em> with SLAs and revocation runbooks.</em>
          </h1>
          <p className="pp-hero-sub">
            SLA-backed auto-revocation, certificate enforcement, webhook delivery, and incident
            runbooks. Built for on-call teams responsible for AI agent fleets.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/enforcement" className="btn btn--primary btn--lg">
              Operational Runbooks →
            </Link>
            <Link href="/docs/sla" className="btn btn--ghost btn--lg">
              SLA Terms
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">99.9%</span>
              <span className="stat-l">Uptime SLA</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;60s</span>
              <span className="stat-l">Auto-revocation SLA</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;500ms</span>
              <span className="stat-l">Verification p99</span>
            </div>
            <div className="stat">
              <span className="stat-v">1,000/s</span>
              <span className="stat-l">Event ingest capacity</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Operations Workflow ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — WORKFLOW</div>
            <h2 className="pp-section-title">Your operations workflow</h2>
            <p className="pp-section-sub">
              Deploy, monitor, and respond — four steps to a fully managed agent lifecycle.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Deploy agent</h3>
              <p>Register via API. Receive X.509 certificate. Configure webhooks for revocation alerts. Set up certificate enforcement in your gateway.</p>
              <code className="pp-step-code">POST /api/v1/agents</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Monitor risk score</h3>
              <p>Real-time behavioral monitoring. Risk score updates every minute. Pre-warning at 0.75, auto-revocation at 0.85. Custom alerts via webhooks.</p>
              <code className="pp-step-code">GET /api/v1/agents/&#123;id&#125;/risk</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Auto-revocation SLA</h3>
              <p>Risk &gt;0.85 triggers revocation in &lt;60 seconds. Certificate invalid. Webhook fires immediately. Agent cannot execute transactions.</p>
              <code className="pp-step-code">webhooks.on(&apos;certificate.revoked&apos;)</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Enforce revocation</h3>
              <p>Your gateway checks /api/v1/verify/&#123;cert_serial&#125;. Returns: active, revoked, or expired. Kill switch halts agent execution immediately.</p>
              <code className="pp-step-code">{`if (cert.status !== 'active') block()`}</code>
            </div>
          </div>
        </div>
      </section>

      {/* ---- SLA Guarantees ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — SLA</div>
            <h2 className="pp-section-title">SLA guarantees &amp; performance</h2>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>99.9% uptime</h3>
              <p>&lt;8.76 hours downtime per year. Multi-region failover. Redundant database + cache layers. SLA credits if breached.</p>
              <span className="pp-feature-tag">Backed by SLA credits</span>
            </div>
            <div className="pp-feature">
              <h3>Auto-revocation &lt;60s</h3>
              <p>Risk score &gt;0.85 triggers instant revocation. Maximum latency: 60 seconds. Webhook delivered within 5 seconds.</p>
              <span className="pp-feature-tag">Enforced by circuit breaker</span>
            </div>
            <div className="pp-feature">
              <h3>&lt;500ms verification (p99)</h3>
              <p>Public /api/v1/verify endpoint: &lt;500ms p99 globally. Cached at CDN edge. No auth overhead. Mission-critical latency.</p>
              <span className="pp-feature-tag">Monitored via Better Stack</span>
            </div>
            <div className="pp-feature">
              <h3>1,000 events/second</h3>
              <p>Behavioral event ingestion capacity per tenant. Rolling 30-day risk window. Real-time score updates. Horizontally scalable.</p>
              <span className="pp-feature-tag">Scales via QStash</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Incident Runbooks ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — ON-CALL</div>
            <h2 className="pp-section-title">Incident runbooks</h2>
            <p className="pp-section-sub">
              Copy-paste playbooks for your on-call runbook. Link to full docs for each scenario.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Certificate revoked</h3>
              <p>Agent risk score exceeded 0.85. Webhook received. Check /api/v1/crl for reason. Review audit trail. Contact support if false positive.</p>
              <Link href="/docs/enforcement" className="pp-feature-tag">Enforcement runbook</Link>
            </div>
            <div className="pp-feature">
              <h3>Pre-revocation warning (0.75)</h3>
              <p>Score in pre-warning zone. Agent still active but will revoke if trend continues. Investigate anomalies in event stream now.</p>
              <Link href="/docs/event-ingest" className="pp-feature-tag">Event analysis</Link>
            </div>
            <div className="pp-feature">
              <h3>Webhook delivery failure</h3>
              <p>Endpoint returned 5xx or timeout. System retries 3× with exponential backoff. Check your endpoint logs. Re-register if needed.</p>
              <Link href="/docs/webhooks" className="pp-feature-tag">Webhook guide</Link>
            </div>
            <div className="pp-feature">
              <h3>Certificate expired</h3>
              <p>X.509 cert reached end of 365-day validity. Agent cannot execute. Register new agent, issue new cert, update deployment.</p>
              <Link href="/docs/agents" className="pp-feature-tag">Agent re-registration</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Documentation ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — DOCUMENTATION</div>
            <h2 className="pp-section-title">Operations documentation</h2>
          </div>
          <div className="pp-resources">
            <Link href="/docs/enforcement" className="pp-resource-link">
              <h3>Certificate Enforcement</h3>
              <p>Revocation enforcement. Kill switch implementation. Operational playbooks.</p>
            </Link>
            <Link href="/docs/webhooks" className="pp-resource-link">
              <h3>Webhooks &amp; Event Delivery</h3>
              <p>Setup. Event types. Delivery guarantees. HMAC-SHA256 signature verification.</p>
            </Link>
            <Link href="/docs/crl" className="pp-resource-link">
              <h3>Certificate Revocation List</h3>
              <p>CRL access. Revocation reasons. Real-time updates from the CA.</p>
            </Link>
            <Link href="/docs/sla" className="pp-resource-link">
              <h3>Service Level Agreement</h3>
              <p>Uptime SLA. Performance SLA. Credits. Incident response times.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>Get started</p>
          <h2 className="pp-cta-title">Ready to operate AI agents at scale?</h2>
          <p className="pp-cta-sub">
            SLA-backed guarantees. Auto-revocation. Webhook delivery. Incident runbooks included.
          </p>
          <div className="pp-cta-actions">
            <Link href="/signup" className="btn btn--primary btn--lg">
              Start free trial
            </Link>
            <Link href="/docs/enforcement" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              View runbooks
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
