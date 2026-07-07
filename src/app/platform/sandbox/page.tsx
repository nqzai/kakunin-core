import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SandboxDemo } from './SandboxDemo';
import '../../landing.css';
import '../../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'Live Compliance Sandbox — Kakunin' },
  description: 'Interactive demo: simulate a rogue AI agent, watch its risk score climb, and see its X.509 certificate auto-revoke in real time. No account required.',
  alternates: { canonical: '/platform/sandbox' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/platform/sandbox',
    title: 'Live Compliance Sandbox — Kakunin',
    description: 'Simulate a rogue AI agent. Watch risk score climb. See the certificate auto-revoke in under 60 seconds.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Compliance Sandbox' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Compliance Sandbox — Kakunin',
    description: 'Simulate a rogue AI agent and watch it get auto-revoked. Interactive demo, no account needed.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home',     item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'Platform', item: 'https://www.kakunin.ai/platform' },
    { '@type': 'ListItem', position: 3, name: 'Sandbox',  item: 'https://www.kakunin.ai/platform/sandbox' },
  ],
};

export default function SandboxPage() {
  return (
    <div className="pp-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <SiteNav />

      {/* ---- Hero ---- */}
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="pp-hero-inner">
          <div className="pp-breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/platform">Platform</Link>
            <span>/</span>
            <span>Sandbox</span>
          </div>
          <span className="eyebrow">Interactive Demo · Live Simulation</span>
          <h1 className="pp-hero-title">
            Watch an agent get
            <em> auto-revoked.</em>
          </h1>
          <p className="pp-hero-sub">
            Trigger rogue behaviors below. Each action raises the agent&apos;s behavioral risk score.
            At 0.75 a pre-revocation warning fires. At 0.85 the X.509 certificate is revoked — the
            agent is blocked at the gateway layer in under 60 seconds, without human intervention.
            It&apos;s the fastest way to see how Kakunin&apos;s
            <Link href="/platform/ai-governance-tools"> governance layer</Link> and
            <Link href="/platform/non-human-identity"> agent identity model</Link> behave before you move into
            a real integration.
          </p>
        </div>
      </section>

      {/* ---- Demo ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <SandboxDemo />
        </div>
      </section>

      {/* ---- Docs link ---- */}
      <div style={{ maxWidth: 'var(--container)', margin: '0 auto', padding: '0 32px 8px', display: 'flex', justifyContent: 'flex-end' }}>
        <Link href="/docs/sandbox" style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)', textDecoration: 'underline' }}>
          → Sandbox API docs
        </Link>
      </div>

      {/* ---- How it works ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — UNDER THE HOOD</div>
            <h2 className="pp-section-title">What just happened</h2>
            <p className="pp-section-sub">
              The simulation above mirrors Kakunin&apos;s production behaviour exactly. Here&apos;s what fires
              in a real deployment when a behavioural risk threshold is crossed. If you want to take the
              next step after the demo, the <Link href="/assessment">assessment</Link> and
              <Link href="/api-docs"> API docs</Link> help convert the sandbox flow into a live rollout plan.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Event ingestion</h3>
              <p>Your agent reports each action to <code>POST /api/v1/events</code>. Kakunin scores the
              event in real time across eight risk dimensions — anomaly magnitude, scope drift, velocity,
              and five others.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Rolling risk score</h3>
              <p>Each score is a 30-day rolling weighted average. A single unusual event has limited
              impact. Repeated violations compound — matching how real agent misbehaviour manifests
              (gradual drift, not a single obvious breach).</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Pre-revocation warning</h3>
              <p>At 0.75, Kakunin pushes a proactive notification to <code>/api/v1/notifications</code>
              — an operator can intervene before the agent is revoked. This window gives engineering
              teams a chance to investigate without service interruption.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Auto-revocation</h3>
              <p>At 0.85, the agent&apos;s X.509 certificate is revoked via AWS KMS. The CRL is updated,
              the gateway blocks the agent&apos;s certificate within 60 seconds, and a webhook delivers
              the revocation event to your SIEM or incident management platform.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-section-inner">
          <div className="pp-cta">
            <h2 className="pp-cta-title">Ready to protect your real agents?</h2>
            <p className="pp-cta-sub">
              Register your first agent in under five minutes. Kakunin issues the certificate,
              monitors behaviour, and handles revocation — you just report events. Security teams can pair
              that setup with the <Link href="/attestation-template">attestation template</Link> to document the
              control design for internal review.
            </p>
            <div className="pp-cta-actions">
              <Link href="/docs/quickstart-ai-agents" className="btn btn--primary btn--lg">
                Register Your First Agent →
              </Link>
              <Link href="/docs/concepts" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
                Architecture Concepts
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
