import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'Kakunin Platform — AI Agent Compliance Infrastructure' },
  description: 'Kakunin compliance infrastructure for AI agents. Non-human identity, AI governance tools, behavioral monitoring, and auto-revocation — built for MiCA and EU AI Act.',
  alternates: { canonical: '/platform' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/platform',
    title: 'Kakunin Platform — AI Agent Compliance Infrastructure',
    description: 'Compliance infrastructure for AI agents. X.509 identity, behavioral monitoring, WORM audit logs, and auto-revocation built for regulated environments.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Platform' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kakunin Platform — AI Agent Compliance Infrastructure',
    description: 'AI agent compliance infrastructure. Non-human identity, governance tools, behavioral monitoring, and auto-revocation.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'Platform', item: 'https://www.kakunin.ai/platform' },
  ],
};

export default function PlatformPage() {
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
            <span>Platform</span>
          </div>
          <span className="eyebrow">Infrastructure · Compliance · AI Agents</span>
          <h1 className="pp-hero-title">
            Compliance infrastructure
            <em> for AI agents.</em>
          </h1>
          <p className="pp-hero-sub">
            Kakunin is an API-first compliance layer that issues cryptographic identities to AI agents,
            monitors their behavior in real time, and auto-revokes credentials when risk thresholds are
            crossed — built to satisfy MiCA and EU AI Act requirements without manual oversight.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs" className="btn btn--primary btn--lg">
              Read the Docs →
            </Link>
            <Link href="/docs/quickstart-ai-agents" className="btn btn--ghost btn--lg">
              Quickstart
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">X.509</span>
              <span className="stat-l">Per-agent machine identity</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;60s</span>
              <span className="stat-l">Auto-revocation SLA</span>
            </div>
            <div className="stat">
              <span className="stat-v">WORM</span>
              <span className="stat-l">Tamper-proof audit log</span>
            </div>
            <div className="stat">
              <span className="stat-v">KMS</span>
              <span className="stat-l">Key never leaves HSM</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Technical Foundation ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">TECHNICAL FOUNDATION</div>
            <h2 className="pp-section-title">Built for enterprise scale</h2>
            <p className="pp-section-sub">
              Kakunin&apos;s production infrastructure is fully-featured, deployed globally, and backed by comprehensive compliance documentation.
            </p>
          </div>
          <div className="pp-metrics-grid">
            <div className="pp-metric">
              <div className="pp-metric-value">85+</div>
              <div className="pp-metric-label">API Routes</div>
              <p className="pp-metric-desc">Complete REST API surface: v1 endpoints, internal workers, webhooks, and well-known metadata.</p>
            </div>
            <div className="pp-metric">
              <div className="pp-metric-value">10</div>
              <div className="pp-metric-label">Core Services</div>
              <p className="pp-metric-desc">Certificates, compliance, chat, audit, alerts, inbox, webhooks, credentials, monitoring, and queue infrastructure.</p>
            </div>
            <div className="pp-metric">
              <div className="pp-metric-value">3</div>
              <div className="pp-metric-label">Deployment Targets</div>
              <p className="pp-metric-desc">Vercel for the main app, Railway for async Discord bot, Supabase Edge Functions for ultra-low latency.</p>
            </div>
            <div className="pp-metric">
              <div className="pp-metric-value">100%</div>
              <div className="pp-metric-label">Audit Coverage</div>
              <p className="pp-metric-desc">Every state change written to WORM audit log. Tamper-proof, append-only, immutable by design.</p>
            </div>
            <div className="pp-metric">
              <div className="pp-metric-value">MiCA</div>
              <div className="pp-metric-label">Article 70 Compliant</div>
              <p className="pp-metric-desc">365-day certificate validity, HSM-backed key material, and regulatory export for supervisory authorities.</p>
            </div>
            <div className="pp-metric">
              <div className="pp-metric-value">EU AI Act</div>
              <div className="pp-metric-label">Article 50 Ready</div>
              <p className="pp-metric-desc">Behavioral monitoring, risk scoring, and automated response logs for high-risk AI systems.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Platform Areas ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — PLATFORM</div>
            <h2 className="pp-section-title">Two areas of coverage</h2>
            <p className="pp-section-sub">
              Kakunin addresses the two core challenges regulators impose on AI agent deployments:
              proving who the agent is, and proving it behaved within its authorised scope.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>
                <Link href="/platform/non-human-identity" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Non-Human Identity →
                </Link>
              </h3>
              <p>
                Every AI agent gets an X.509 certificate issued via AWS KMS — a machine identity with
                cryptographically bound scope, a 365-day validity window, and automated revocation when
                behavioral risk exceeds threshold. Private key material never leaves the HSM.
              </p>
              <p style={{ marginTop: '0.75rem' }}>
                <Link href="/platform/non-human-identity" className="btn btn--ghost">
                  Explore NHI →
                </Link>
              </p>
            </div>
            <div className="pp-feature">
              <h3>
                <Link href="/platform/ai-governance-tools" style={{ color: 'inherit', textDecoration: 'none' }}>
                  AI Governance Tools →
                </Link>
              </h3>
              <p>
                Real-time behavioral monitoring scores every agent action across eight risk dimensions.
                WORM audit logs satisfy EU AI Act Article 12. Compliance reports export a signed
                PDF snapshot for regulators — generated without human intervention.
              </p>
              <p style={{ marginTop: '0.75rem' }}>
                <Link href="/platform/ai-governance-tools" className="btn btn--ghost">
                  Explore Governance →
                </Link>
              </p>
            </div>
            <div className="pp-feature">
              <h3>
                <Link href="/platform/sandbox" style={{ color: 'inherit', textDecoration: 'none' }}>
                  Live Sandbox →
                </Link>
              </h3>
              <p>
                Trigger rogue agent behaviors in the browser, watch the risk score climb on a live
                gauge, and see the X.509 certificate auto-revoke at 0.85. No account or signup
                required — the full revocation lifecycle in under 60 seconds.
              </p>
              <p style={{ marginTop: '0.75rem' }}>
                <Link href="/platform/sandbox" className="btn btn--ghost">
                  Try the Demo →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- How It Fits Together ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — ARCHITECTURE</div>
            <h2 className="pp-section-title">One layer, two guarantees</h2>
            <p className="pp-section-sub">
              Identity and governance are not separate products — they share the same cryptographic
              foundation. Every behavioral event is attributed to a named X.509 identity. Every
              compliance report is signed by the same CA that issued the agent&apos;s certificate.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Agent registration</h3>
              <p>Register an agent via API. Kakunin issues an X.509 certificate backed by an AWS KMS RSA-2048 key. The certificate encodes operator, scope, and model hash — all cryptographically bound.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Behavioral event ingestion</h3>
              <p>Your agent reports actions to <code>/api/v1/events</code>. Each event is risk-scored in real time across eight dimensions and written to the WORM audit log with the agent&apos;s certificate serial as the attribution anchor.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Automated response</h3>
              <p>Risk score above 0.75 triggers a pre-revocation warning. Above 0.85, the agent&apos;s certificate is revoked within 60 seconds — blocking it at the gateway layer before it reaches any downstream service.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Compliance reporting</h3>
              <p>On demand, Kakunin generates a signed PDF compliance report: agent identity, risk history, revocation events, and audit log hash — ready for regulators, auditors, or counterparties.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-section-inner">
          <div className="pp-cta">
            <h2 className="pp-cta-title">Start with one agent. Scale to thousands.</h2>
            <p className="pp-cta-sub">
              Kakunin&apos;s API-first design means you can register your first agent in under five minutes,
              with no infrastructure to provision. Native SDK integrations are available for LangChain,
              LlamaIndex, CrewAI, AutoGen, and LangGraph.
            </p>
            <div className="pp-cta-actions">
              <Link href="/docs/quickstart-ai-agents" className="btn btn--primary btn--lg">
                Get Started →
              </Link>
              <Link href="/docs/python-sdk" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
                Python SDK →
              </Link>
              <Link href="/docs" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
                Full Docs
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
