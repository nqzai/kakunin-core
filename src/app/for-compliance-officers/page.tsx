import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Agent Compliance & Audit Trails — Kakunin for Compliance Officers' },
  description: 'Audit trails, WORM logs, real-time risk scoring, and regulator-accessible verification for AI agents. Built for MiCA, EU AI Act, GDPR, and HIPAA evidence needs.',
  alternates: { canonical: '/for-compliance-officers' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/for-compliance-officers',
    title: 'AI Agent Compliance & Audit Trails — Kakunin for Compliance Officers',
    description: 'WORM audit logs, real-time risk scoring, and regulator-accessible verification for AI agents. Built for MiCA, EU AI Act, GDPR, and HIPAA.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Agent Compliance Infrastructure' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Compliance & Audit Trails — Kakunin',
    description: 'WORM audit logs, real-time risk scoring, and regulator verification for AI agents.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'For Compliance Officers', item: 'https://www.kakunin.ai/for-compliance-officers' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What audit trails does Kakunin provide for AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin provides a WORM (Write-Once-Read-Many) immutable audit log. Every agent action — registration, certificate issuance, behavioral events, risk score changes, and revocations — is logged with timestamp and cryptographic proof. No UPDATE or DELETE operations are permitted. The full evidence chain is exportable for regulators and supervisors.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which regulatory frameworks does Kakunin satisfy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin satisfies MiCA Articles 61–75 (X.509 365-day certificates per Art. 70, revocation reason logging per Art. 72), EU AI Act Annex III (high-risk system logging, transparency, human oversight), GDPR Articles 22 and 30 (automated decision records, DPA documentation), and HIPAA (tamper-proof log requirements, WORM immutability, access controls).',
      },
    },
    {
      '@type': 'Question',
      name: 'How does auto-revocation work for non-compliant agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin calculates a rolling 30-day risk score from behavioral events. When the score reaches 0.75, a pre-revocation warning is issued. When it reaches 0.85, the certificate is automatically revoked within 60 seconds. Every step — warning, revocation, reason — is written to the immutable audit log and a webhook fires to notify your team.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can regulators and supervisors verify agent certificates without Kakunin credentials?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The public endpoint /api/v1/verify/{cert_serial} requires no authentication. Regulators and supervisors can independently verify any certificate, check revocation status via the public CRL endpoint /api/v1/crl, and confirm standing. Response time is under 500ms p99, globally cached via CDN.',
      },
    },
  ],
};

export default function ForComplianceOfficersPage() {
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
            <span>For Compliance Officers</span>
          </div>
          <span className="eyebrow">Compliance Officers</span>
          <h1 className="pp-hero-title">
            Audit trails for AI agents
            <em> that hold up in an exam.</em>
          </h1>
          <p className="pp-hero-sub">
            WORM audit logs, real-time risk scoring, and regulator-accessible verification.
            Capture defensible evidence chains for every AI agent decision under MiCA, EU AI Act,
            GDPR, and HIPAA.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/compliance-checklist" className="btn btn--primary btn--lg">
              Compliance Checklist →
            </Link>
            <Link href="/docs/concepts" className="btn btn--ghost btn--lg">
              Regulatory Frameworks
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">WORM</span>
              <span className="stat-l">Immutable audit log</span>
            </div>
            <div className="stat">
              <span className="stat-v">0.85</span>
              <span className="stat-l">Auto-revocation threshold</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;60s</span>
              <span className="stat-l">Revocation SLA</span>
            </div>
            <div className="stat">
              <span className="stat-v">4 frameworks</span>
              <span className="stat-l">MiCA · AI Act · GDPR · HIPAA</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Compliance Workflow ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — HOW IT WORKS</div>
            <h2 className="pp-section-title">Your regulatory readiness workflow</h2>
            <p className="pp-section-sub">
              End-to-end regulatory readiness — from agent registration through behavioral monitoring
              to supervisor-ready reporting. Every step leaves a tamper-proof record.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Monitor behaviour events</h3>
              <p>1,000 events/sec: transaction, data_access, api_call, auth_failure. Streamed in
              real-time with timestamps and actor context. Each event is cryptographically signed
              and written to immutable storage — providing an evidence chain that satisfies
              supervisory traceability mandates under the EU AI Act and MiCA Art. 70.</p>
              <code className="pp-step-code">Rolling 30-day risk score</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Risk scoring &amp; alerts</h3>
              <p>Automated risk assessment from behavioral patterns. 0.75 = pre-revocation warning,
              0.85 = auto-revocation. Every score change leaves a traceable record — a timestamped
              entry with the triggering event, calculated band, and responsible actor. Your team
              is notified by webhook before the next API call completes.</p>
              <code className="pp-step-code">GET /api/v1/agents/&#123;id&#125;/risk</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Immutable audit log</h3>
              <p>WORM (Write-Once-Read-Many). No UPDATE/DELETE permitted — enforced at the database
              layer, not just application policy. Full traceability: registration, certificate issuance,
              behavioral events, risk changes, revocation. Append-only by design. A supervisory
              authority sees exactly what happened, when, and in what sequence — nothing redacted,
              nothing reordered.</p>
              <code className="pp-step-code">audit_log table (immutable)</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Regulatory reporting</h3>
              <p>Auto-generated reports mapping to MiCA Art. 61–75, EU AI Act Annex III, GDPR Art. 22,
              HIPAA. Each report includes agent identity, scope, behavioral boundaries, decisions, and
              drift detection — in PDF for supervisors and JSON for downstream pipelines. Signed,
              watermarked, with a traceable evidence chain included.</p>
              <code className="pp-step-code">GET /api/v1/reports/compliance</code>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Regulatory Coverage ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — FRAMEWORKS</div>
            <h2 className="pp-section-title">Regulatory framework coverage</h2>
            <p className="pp-section-sub">
              Four major frameworks, mapped article-by-article. Use Kakunin&apos;s regulatory
              mappings inside your own filings — supervisor-ready language, no rewrite required.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>MiCA (Art. 61–75)</h3>
              <p>Cryptographic asset custody &amp; AI governance. X.509 certificates (365-day per
              Art. 70), behavioral monitoring, auto-revocation SLA, tamper-proof evidence chain.
              The MiCA Article 72 revocation reason is recorded, timestamped, and surfaced in every
              generated report — ready for the supervisory authority without further formatting.</p>
              <Link href="/docs/concepts" className="pp-feature-tag">Learn more</Link>
            </div>
            <div className="pp-feature">
              <h3>EU AI Act (Annex III, Art. 13–15)</h3>
              <p>High-risk system logging, transparency, human oversight, and robustness. The
              immutable event log, rolling risk scoring, and behavioral proof satisfy Annex III
              traceability obligations. The regulator-accessible <code>/v1/verify</code> endpoint
              provides Art. 13 transparency — no authentication, no intermediary.</p>
              <Link href="/docs/verify" className="pp-feature-tag">Verification API</Link>
            </div>
            <div className="pp-feature">
              <h3>GDPR (Art. 22, 30)</h3>
              <p>Automated decision records &amp; Records of Processing Activities (RoPA).
              Every AI agent action that touches personal data is logged with actor, timestamp,
              and scope. The full regulatory record is exportable for the Data Protection
              Authority (DPA) on request — in JSON matching their standard schema.</p>
              <Link href="/docs/event-ingest" className="pp-feature-tag">Event Ingestion</Link>
            </div>
            <div className="pp-feature">
              <h3>HIPAA</h3>
              <p>Healthcare privacy &amp; tamper-proof logging. WORM storage with read-only
              agent scope enforced at the certificate layer — a diagnostic agent physically
              cannot mutate a patient record. Every access is logged for regulatory inspections.
              The evidence chain ships automatically; no separate HIPAA logging tool required.</p>
              <Link href="/docs/case-study-healthcare" className="pp-feature-tag">Healthcare case study</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Why General Compliance Software Falls Short ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — THE GAP</div>
            <h2 className="pp-section-title">Why financial services compliance software wasn&apos;t built for agents</h2>
            <p className="pp-section-sub">
              Traditional financial services compliance software tracks human actors — traders,
              advisors, relationship managers. AI agents operate at a different scale and speed.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Agents act in milliseconds</h3>
              <p>A trading agent executes thousands of decisions per second. Human-centric surveillance
              tools sample events; Kakunin ingests every one at 1,000 events/sec per tenant,
              scoring in real-time. Nothing is sampled. Nothing is lost. The regulatory record
              is complete by construction.</p>
            </div>
            <div className="pp-feature">
              <h3>Agents have no legal identity</h3>
              <p>Without a cryptographic identity, an AI agent is indistinguishable from a rogue
              script. Kakunin issues X.509 certificates to each agent — binding name, operator,
              model version, and permitted actions into a tamper-proof credential that regulators
              and counterparties can verify independently.</p>
            </div>
            <div className="pp-feature">
              <h3>Agents drift without notice</h3>
              <p>A model update, a prompt injection, a context change — any of these can alter
              agent behavior post-deployment. Rolling 30-day risk scoring detects behavioral drift
              before it becomes a breach. Auto-revocation fires within 60 seconds. No human
              needs to notice first.</p>
            </div>
            <div className="pp-feature">
              <h3>Regulators need independent access</h3>
              <p>Supervisory authorities cannot depend on the operator to provide verification.
              The public <code>/v1/verify</code> endpoint requires no credentials — a BaFin
              supervisor, an ECB examiner, or an FCA reviewer can confirm agent identity and
              standing directly, without involving the regulated firm.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Supervisor Access ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — SUPERVISOR ACCESS</div>
            <h2 className="pp-section-title">Verification built for regulators</h2>
            <p className="pp-section-sub">
              Independent, tamper-evident, always available. Supervisors and external reviewers
              get direct access — no intermediary, no portal login, no waiting for your team.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Public verification</h3>
              <p>Regulators &amp; supervisors verify agent certificates via <code>/api/v1/verify/&#123;cert_serial&#125;</code>.
              No authentication required. &lt;500ms p99 latency, globally CDN-cached. Returns
              operator, scope, model hash, validity window, and revocation status in a single call.</p>
            </div>
            <div className="pp-feature">
              <h3>Audit trail export</h3>
              <p>Full regulatory reports exportable in PDF (supervisor-ready) or JSON (pipeline-ready).
              Complete chain-of-custody from agent registration through revocation. WORM guarantee —
              the record cannot have been modified after the fact, by anyone.</p>
            </div>
            <div className="pp-feature">
              <h3>Risk scoring proof</h3>
              <p>Every risk score update logged with triggering event and rationale. 30-day rolling window.
              Threshold breaches trigger pre-warning (0.75) then auto-revocation (0.85). Each step
              leaves a timestamped, immutable entry — defensible in a supervisory exam.</p>
            </div>
            <div className="pp-feature">
              <h3>Certificate revocation list</h3>
              <p>Public CRL endpoint. Revoked certificates listed with reason, timestamp, actor.
              Updated in real-time. Supervisors can monitor the CRL feed independently —
              no coordination with the operator required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Resources ---- */}
      <section className="pp-section pp-section--alt" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">05 — DOCUMENTATION</div>
            <h2 className="pp-section-title">Regulatory resources</h2>
          </div>
          <div className="pp-resources">
            <Link href="/docs/compliance-checklist" className="pp-resource-link">
              <h3>Compliance Checklist</h3>
              <p>Step-by-step MiCA &amp; EU AI Act readiness checklist for AI agent deployments.</p>
            </Link>
            <Link href="/docs/concepts" className="pp-resource-link">
              <h3>Core Concepts &amp; Frameworks</h3>
              <p>MiCA, EU AI Act, GDPR, HIPAA mapping. Regulatory architecture explained.</p>
            </Link>
            <Link href="/docs/verify" className="pp-resource-link">
              <h3>Certificate Verification API</h3>
              <p>Public no-auth endpoint. Supervisor-accessible. Verify any agent in real-time.</p>
            </Link>
            <Link href="/docs/event-ingest" className="pp-resource-link">
              <h3>Event Ingestion &amp; Audit Trail</h3>
              <p>Behavioral monitoring. WORM evidence log. Real-time risk scoring.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>Get started</p>
          <h2 className="pp-cta-title">Ready to govern your AI agent fleet?</h2>
          <p className="pp-cta-sub">
            Immutable audit trail + regulator-accessible verification. Deploy AI agents with
            cryptographic defensibility — built for financial services teams that cannot afford
            a supervisory gap.
          </p>
          <div className="pp-cta-actions">
            <Link href="/signup" className="btn btn--primary btn--lg">
              Start free trial
            </Link>
            <Link href="/docs/compliance-checklist" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              View checklist
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
