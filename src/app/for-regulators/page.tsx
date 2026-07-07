import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Agent Verification for Regulators — Public No-Auth APIs | Kakunin' },
  description: 'Verify AI agent certificates, revocation status, and audit trails with public no-auth APIs. Built for regulators, auditors, and API platforms.',
  alternates: { canonical: '/for-regulators' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/for-regulators',
    title: 'AI Agent Verification for Regulators — Public No-Auth APIs | Kakunin',
    description: 'Verify AI agent certificates, revocation status, and audit trails with public no-auth APIs.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Agent Verification for Regulators' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Verification for Regulators — Kakunin',
    description: 'Public no-auth APIs to verify AI agent certificates, CRLs, and audit trails.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'For Regulators', item: 'https://www.kakunin.ai/for-regulators' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do regulators verify AI agent certificates without Kakunin credentials?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Regulators call GET /api/v1/verify/{cert_serial} with no authentication required. The endpoint returns certificate details including issuer, subject, validity window, key algorithm, and current status (active, revoked, or expired). Response time is under 500ms p99 and the endpoint is globally cached via CDN. Rate limit: 1,000 requests per minute per IP.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the Certificate Revocation List (CRL) and how is it accessed?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The public CRL endpoint at GET /api/v1/crl lists all revoked certificates with revocation reason, timestamp, and the actor who initiated revocation. No authentication is required. The list is updated in real-time as revocations occur, with p99 response time under 300ms. Regulators can poll this endpoint during inspections or incident investigations.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which regulatory frameworks is Kakunin compliant with?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin satisfies: MiCA Articles 61–75 (Art. 70 365-day certificate validity, Art. 72 revocation reason logging, Art. 73 behavioral monitoring SLA, Art. 75 audit trail proof); EU AI Act Annex III, Articles 13–15 (high-risk system logging, transparency, human oversight capability); GDPR Articles 22 and 30 (automated decision records, DPA documentation); and HIPAA (audit log requirements, WORM immutability, encryption at rest).',
      },
    },
    {
      '@type': 'Question',
      name: 'Can regulators request a full audit trail export for an AI agent?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Full WORM audit trail exports are available upon request to the regulated institution. The trail includes: agent registration, certificate issuance (with KMS key ARN), all behavioral events, risk score history, and revocation details. Exports are available in JSON or CSV format and cover the full lifecycle from registration through revocation.',
      },
    },
  ],
};

export default function ForRegulatorsPage() {
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
            <span>For Regulators</span>
          </div>
          <span className="eyebrow">API Platform · Regulators</span>
          <h1 className="pp-hero-title">
            Public AI agent verification
            <em> with no auth required.</em>
          </h1>
          <p className="pp-hero-sub">
            Public no-auth endpoints inspect X.509 certificates, audit trails, and risk scores.
            Verify compliance independently with regulator-friendly APIs and fast response times.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/verify" className="btn btn--primary btn--lg">
              Verification API →
            </Link>
            <Link href="/docs/concepts" className="btn btn--ghost btn--lg">
              Framework Mapping
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">No auth</span>
              <span className="stat-l">Required for verification</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;500ms</span>
              <span className="stat-l">p99 verification latency</span>
            </div>
            <div className="stat">
              <span className="stat-v">1,000/min</span>
              <span className="stat-l">Rate limit per IP</span>
            </div>
            <div className="stat">
              <span className="stat-v">Public CRL</span>
              <span className="stat-l">Real-time revocation list</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Verification Workflow ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — VERIFICATION</div>
            <h2 className="pp-section-title">How regulators verify agents</h2>
            <p className="pp-section-sub">
              Four independent checks — no credentials, no dependencies on the regulated entity.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Query certificate</h3>
              <p>No authentication. Call /api/v1/verify/&#123;cert_serial&#125;. Returns: issuer, subject, validity window, key algorithm, serial number.</p>
              <code className="pp-step-code">GET /api/v1/verify/0x123abc…</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Check revocation status</h3>
              <p>Public CRL endpoint lists all revoked certificates with reason and timestamp. Active, revoked, or expired — &lt;500ms p99.</p>
              <code className="pp-step-code">GET /api/v1/crl</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Request audit trail export</h3>
              <p>Request full WORM audit log export from the issuing institution. Includes: registration, issuance, events, risk changes, revocation reason.</p>
              <code className="pp-step-code">audit_log (WORM, exportable)</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Verify compliance mapping</h3>
              <p>Cross-reference with MiCA Art. 61–75, EU AI Act Annex III, GDPR Art. 22. Each requirement maps to an immutable audit trail proof.</p>
              <code className="pp-step-code">Compliance report (exportable)</code>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Public Endpoints Table ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — PUBLIC APIS</div>
            <h2 className="pp-section-title">Public verification endpoints</h2>
            <p className="pp-section-sub">No API key. No credentials. Globally CDN-cached.</p>
          </div>
          <div className="pp-table-wrap">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Purpose</th>
                  <th>Rate limit</th>
                  <th>Latency (p99)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><code>GET /api/v1/verify/&#123;cert_serial&#125;</code></td>
                  <td>Verify agent certificate</td>
                  <td>1,000 / min per IP</td>
                  <td>&lt;500ms</td>
                </tr>
                <tr>
                  <td><code>GET /api/v1/crl</code></td>
                  <td>Certificate Revocation List</td>
                  <td>1,000 / min per IP</td>
                  <td>&lt;300ms</td>
                </tr>
                <tr>
                  <td><code>GET /api/v1/health</code></td>
                  <td>Service health check</td>
                  <td>Unlimited</td>
                  <td>&lt;100ms</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="pp-table-note">
            <strong>Auth requirement:</strong> None. No API key or credentials needed. Globally cached via CDN.
          </p>
        </div>
      </section>

      {/* ---- Framework Compliance ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — FRAMEWORKS</div>
            <h2 className="pp-section-title">Framework compliance mapping</h2>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>MiCA (Art. 61–75)</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Art. 70: 365-day X.509 validity</li>
                <li>Art. 72: Revocation reason logged</li>
                <li>Art. 73: Behavioral monitoring SLA</li>
                <li>Art. 75: Audit trail proof</li>
              </ul>
            </div>
            <div className="pp-feature">
              <h3>EU AI Act (Annex III)</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Art. 13: High-risk system logging</li>
                <li>Art. 14: Transparency proof</li>
                <li>Art. 15: Oversight capability</li>
                <li>Annex III: Log format compliant</li>
              </ul>
            </div>
            <div className="pp-feature">
              <h3>GDPR (Art. 22, 30)</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Art. 22: Automated decision records</li>
                <li>Art. 30: DPA documentation</li>
                <li>Exportable audit trail for DPA</li>
                <li>Privacy-by-design architecture</li>
              </ul>
            </div>
            <div className="pp-feature">
              <h3>HIPAA</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Audit log requirements met</li>
                <li>WORM immutability enforced</li>
                <li>Access controls (RLS)</li>
                <li>Encryption at rest (AES-256)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Documentation ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — DOCUMENTATION</div>
            <h2 className="pp-section-title">Regulatory documentation</h2>
          </div>
          <div className="pp-resources">
            <Link href="/docs/verify" className="pp-resource-link">
              <h3>Certificate Verification API</h3>
              <p>Complete API docs. Request/response examples. Error codes.</p>
            </Link>
            <Link href="/docs/crl" className="pp-resource-link">
              <h3>Certificate Revocation List</h3>
              <p>CRL access guide. Revocation reasons. Update frequency.</p>
            </Link>
            <Link href="/docs/concepts" className="pp-resource-link">
              <h3>Framework Compliance</h3>
              <p>MiCA, EU AI Act, GDPR, HIPAA mapping. Requirements + evidence.</p>
            </Link>
            <Link href="/test-results" className="pp-resource-link">
              <h3>Test Results (180 passing)</h3>
              <p>Automated security &amp; compliance testing. Full coverage proof.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>Verify now</p>
          <h2 className="pp-cta-title">Ready to verify AI agents?</h2>
          <p className="pp-cta-sub">
            Public no-auth endpoints. &lt;500ms latency. Independent verification — no Kakunin credentials required.
          </p>
          <div className="pp-cta-actions">
            <Link href="/docs/verify" className="btn btn--primary btn--lg">
              View Verification API →
            </Link>
            <Link href="/docs/concepts" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              Framework mapping
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
