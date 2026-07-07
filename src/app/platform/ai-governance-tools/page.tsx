import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../../landing.css';
import '../../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Governance Tools for Regulated Agent Deployments — Kakunin' },
  description: 'AI governance infrastructure for regulated agent deployments. Cryptographic identity, behavioral monitoring, audit logging, revocation, and compliance reporting — built as an API layer.',
  alternates: { canonical: '/platform/ai-governance-tools' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/platform/ai-governance-tools',
    title: 'AI Governance Tools for Regulated Agent Deployments — Kakunin',
    description: 'AI governance infrastructure: X.509 identity, behavioral monitoring, WORM audit logs, auto-revocation, compliance reports. API-first layer for MiCA and EU AI Act.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Governance Tools' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Governance Tools for Regulated Agent Deployments — Kakunin',
    description: 'AI governance as infrastructure, not a dashboard. X.509 identity, behavioral monitoring, auto-revocation, compliance reports.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'Platform', item: 'https://www.kakunin.ai/platform' },
    { '@type': 'ListItem', position: 3, name: 'AI Governance Tools', item: 'https://www.kakunin.ai/platform/ai-governance-tools' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the difference between AI governance tools and AI governance infrastructure?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AI governance tools are typically dashboards — visualization layers where humans review agent behavior after the fact. AI governance infrastructure is the underlying layer that enforces governance controls in real time: cryptographic identity so each agent is uniquely identifiable, behavioral monitoring that triggers automated responses, and revocation that blocks non-compliant agents at the network layer before they reach your services. Kakunin is infrastructure, not a dashboard — it sits in the request path and operates at machine speed.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Kakunin satisfy EU AI Act compliance requirements for AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EU AI Act Article 12 requires logs that allow monitoring of high-risk AI system operations — which requires cryptographic identity linkage between log entries and specific agent instances. Article 13 requires transparency documentation accessible to regulators. Kakunin satisfies both: every behavioral event is cryptographically attributed to a named agent identity (X.509 certificate serial), and the public verification endpoint gives regulators direct access to operator, scope, and revocation status without a Kakunin account.',
      },
    },
    {
      '@type': 'Question',
      name: 'What behavioral events does Kakunin monitor for AI governance?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin ingests ten behavioral event types: api_call (external service calls), authentication_attempt (auth attempts), authentication_failure (failed auth), data_access (database and file reads), data_mutation (record creation, update, or deletion), transaction_initiated (financial operations), transaction_anomaly (anomalous transaction patterns), unauthorized_access_attempt (out-of-scope actions), message_signed (KMS signing operations), and message_verification_failed (signature verification failures). All events are attributed to the agent\'s cryptographic identity and scored in the rolling 30-day risk engine.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can Kakunin generate compliance reports for MiCA and EU AI Act audits?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Kakunin generates structured compliance reports that map behavioral data and credential history against MiCA Articles 70–72 and EU AI Act Articles 12–13 requirements. Reports include: agent identity verification history, behavioral event summary with risk score timeline, credential issuance and renewal record, revocation events with triggering risk scores, and WORM audit trail export. Reports are generated via POST /api/v1/reports and delivered as signed PDFs via QStash async pipeline.',
      },
    },
  ],
};

export default function AiGovernanceToolsPage() {
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
            <Link href="/platform">Platform</Link>
            <span>/</span>
            <span>AI Governance Tools</span>
          </div>
          <span className="eyebrow">Governance · Compliance · Infrastructure</span>
          <h1 className="pp-hero-title">
            AI Governance Tools
            <em> for Regulated Agent Deployments.</em>
          </h1>
          <p className="pp-hero-sub">
            AI governance isn&apos;t a dashboard problem — it&apos;s an infrastructure problem. Kakunin
            is the API layer that enforces governance at the machine level: cryptographic agent identity,
            continuous behavioral monitoring, automated revocation, and immutable audit trails. Built
            for MiCA and EU AI Act compliance from day one. Start with
            <Link href="/platform/non-human-identity"> non-human identity</Link>, pressure-test controls in the
            <Link href="/platform/sandbox"> live sandbox</Link>, or review integration paths in the
            <Link href="/api-docs"> API documentation</Link>.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/compliance-checklist" className="btn btn--primary btn--lg">
              Compliance Checklist →
            </Link>
            <Link href="/pricing" className="btn btn--ghost btn--lg">
              Pricing
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">5</span>
              <span className="stat-l">Governance layers</span>
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
              <span className="stat-v">MiCA</span>
              <span className="stat-l">Art. 70 + 72 compliant</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 01: Governance as Infrastructure ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — APPROACH</div>
            <h2 className="pp-section-title">AI governance as infrastructure, not a dashboard</h2>
            <p className="pp-section-sub">
              Most AI governance tools sit above your stack. They watch. They visualise. They alert.
              Kakunin sits in your stack — in the request path, at the gateway layer, in the event
              ingestion pipeline. Governance controls are enforced in real time, not reviewed after the fact.
              Teams comparing operating models can use the <Link href="/assessment">assessment</Link> to map where
              governance enforcement should sit in their deployment.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Enforcement, not observation</h3>
              <p>A gateway that calls <code>GET /api/v1/verify/{'{serial}'}</code> on every inbound
              agent request does not just log a compliance event — it blocks a non-compliant agent
              before any business logic runs. Kakunin governance controls are operational controls,
              not reporting overlays.</p>
            </div>
            <div className="pp-feature">
              <h3>Machine-speed response</h3>
              <p>When an agent&apos;s behavioral risk score crosses 0.85, the revocation happens in
              under 60 seconds with no human in the loop. The governance action — withdrawing the
              agent&apos;s operating authority — occurs at machine speed, not at the pace of a
              compliance review cycle.</p>
            </div>
            <div className="pp-feature">
              <h3>API-first integration</h3>
              <p>Kakunin integrates into your existing stack via REST API and TypeScript SDK. No
              separate governance portal for operators to maintain. No parallel data pipeline to
              keep in sync. The governance layer is the API layer — the same endpoints your agents
              call are the endpoints your compliance team queries. The
              <Link href="/attestation-template"> attestation template</Link> gives security and compliance teams
              a ready-made structure for documenting those controls.</p>
            </div>
            <div className="pp-feature">
              <h3>Single source of compliance truth</h3>
              <p>Identity records, behavioral events, risk scores, revocation history, and compliance
              reports all live in one tamper-proof system. When a regulator asks for audit evidence,
              the answer is a single API call — not a spreadsheet assembled from five different
              monitoring tools.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 02: Monitoring ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — MONITORING</div>
            <h2 className="pp-section-title">Behavioral monitoring for AI governance</h2>
            <p className="pp-section-sub">
              Governance without continuous monitoring is compliance theater. Kakunin ingests behavioral
              events in real time, scores them against risk models, and maintains a rolling 30-day risk
              profile for every agent in your deployment.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>10 behavioral event types</h3>
              <p>Kakunin monitors: <code>api_call</code>, <code>authentication_attempt</code>,
              <code>authentication_failure</code>, <code>data_access</code>, <code>data_mutation</code>,
              <code>transaction_initiated</code>, <code>transaction_anomaly</code>,
              <code>unauthorized_access_attempt</code>, <code>message_signed</code>,
              and <code>message_verification_failed</code>.
              All events are attributed to the issuing agent&apos;s machine identity via certificate serial.</p>
            </div>
            <div className="pp-feature">
              <h3>Rolling 30-day risk engine</h3>
              <p>Each behavioral event contributes to a continuously-updated risk score. The engine
              applies weighted scoring across event types — authentication failures and unauthorized access attempts
              carry higher weight than routine API calls. Scores are available in real time via the
              agent status endpoint.</p>
            </div>
            <div className="pp-feature">
              <h3>Anomaly detection via OpenRouter</h3>
              <p>High-volume event streams are passed to an anomaly detection model (Claude 3 Haiku
              via OpenRouter) that flags statistically unusual patterns — sudden changes in transaction
              frequency, novel API targets, or combinations of events that individually score low but
              collectively indicate compromise.</p>
            </div>
            <div className="pp-feature">
              <h3>SSE event streaming</h3>
              <p>Subscribe to a live server-sent event stream of behavioral data for any agent via
              <code>GET /api/v1/agents/{'{id}'}/events/stream</code>. Real-time governance dashboards,
              incident response tooling, and SIEM integrations can consume this stream directly without
              polling.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 03: Audit ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — AUDIT</div>
            <h2 className="pp-section-title">Immutable audit logging for AI governance</h2>
            <p className="pp-section-sub">
              EU AI Act Article 12 requires logs that allow post-hoc monitoring of high-risk AI system
              operations. Kakunin&apos;s audit log is append-only, PostgreSQL-rule-protected, and
              cryptographically attributed to named agent identities — not API keys.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>WORM protection</h3>
              <p>PostgreSQL-level <code>audit_log_no_update</code> and <code>audit_log_no_delete</code>
              rules block all UPDATE and DELETE operations on the audit table — even for the service
              role. Once written, a log entry cannot be modified or removed. Regulators can trust
              the log as a complete, unmodified record.</p>
            </div>
            <div className="pp-feature">
              <h3>Cryptographic attribution</h3>
              <p>Every audit log entry carries the agent&apos;s certificate serial as
              <code>actor_id</code>. This is cryptographic attribution — the serial is issued once
              at registration, embedded in the X.509 identity, and verifiable independently. Log
              entries cannot be attributed to the wrong agent without detection.</p>
            </div>
            <div className="pp-feature">
              <h3>S3 WORM archival</h3>
              <p>Compliance reports and audit exports are archived to S3 with Object Lock in
              COMPLIANCE mode. S3 WORM provides a second layer of tamper-evidence with legal
              admissibility properties. Reports generated today will be verifiably unmodified
              when a regulator requests them in three years.</p>
            </div>
            <div className="pp-feature">
              <h3>Regulator-accessible verification</h3>
              <p>Any regulator, auditor, or counterparty can verify an agent&apos;s identity and
              current status via the public endpoint — no Kakunin credentials required. The
              verification response includes registration timestamp, issuing operator, permitted
              scope, and revocation history. Audit access is built in, not added later.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 04: Revocation ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — REVOCATION</div>
            <h2 className="pp-section-title">AI governance through automated revocation</h2>
            <p className="pp-section-sub">
              The ultimate AI governance enforcement action is removing an agent&apos;s operating authority.
              Kakunin&apos;s revocation pipeline is automated, sub-60-second, and designed to satisfy
              MiCA Article 72&apos;s requirement for capability withdrawal without human latency.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Risk threshold breach</h3>
              <p>Behavioral risk score reaches ≥0.85. Risk engine triggers revocation pipeline synchronously. No human approval required — MiCA Art. 72 demands automated response capability.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Certificate revocation &lt;60s</h3>
              <p>Agent&apos;s X.509 machine identity is revoked. Serial added to public CRL. KMS key scheduled for deletion. <code>certificate.revoked</code> event written to WORM audit log with full context.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Webhook delivery &lt;5s</h3>
              <p>Registered webhook endpoints receive <code>certificate.revoked</code> payload with HMAC-SHA256 signature within 5 seconds. Your gateway, SIEM, and incident management tools are notified immediately.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Gateway enforcement immediate</h3>
              <p>The next request from the revoked agent fails at the verification endpoint. No TTL cache — revocation is instant. The agent is operationally blocked before any downstream service processes its request.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 05: Compliance Reporting ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">05 — COMPLIANCE REPORTING</div>
            <h2 className="pp-section-title">AI governance compliance reports</h2>
            <p className="pp-section-sub">
              When a regulator asks for evidence of AI governance compliance, Kakunin generates a
              structured report mapping your agent deployment data against MiCA and EU AI Act
              requirements — on demand, signed, and S3-archived.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>On-demand report generation</h3>
              <p>
                <code>POST /api/v1/reports</code> triggers an AI-assisted compliance report via the
                OpenRouter pipeline. The Gemini Flash model narrates risk context; the Claude Sonnet
                model produces the structured compliance analysis. Reports are delivered as signed
                PDFs via QStash async pipeline — typically under 60 seconds.
              </p>
            </div>
            <div className="pp-feature">
              <h3>MiCA and EU AI Act mapping</h3>
              <p>Reports include explicit section-by-section mapping to MiCA Articles 70, 72, and 75,
              and EU AI Act Articles 12 and 13. Each finding references the specific agent behavioral
              data that satisfies (or fails to satisfy) the regulatory requirement. Not a generic
              template — a report grounded in your deployment data.</p>
            </div>
            <div className="pp-feature">
              <h3>Risk narrative and timeline</h3>
              <p>Every report includes a risk score timeline for each agent over the reporting period,
              a narrative explanation of behavioral patterns, and a summary of any revocation events
              with their triggering scores. Compliance officers get both the data and the explanation
              in a single document.</p>
            </div>
            <div className="pp-feature">
              <h3>S3 WORM archival</h3>
              <p>Generated reports are stored in S3 with Object Lock in COMPLIANCE mode — legally
              tamper-evident archival. Your compliance team can retrieve any historical report years
              later and demonstrate to regulators that it has not been modified since generation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>AI governance infrastructure</p>
          <h2 className="pp-cta-title">Governance that enforces, not just observes.</h2>
          <p className="pp-cta-sub">
            X.509 agent identity, behavioral monitoring, automated revocation, WORM audit logs, and
            on-demand compliance reports. All in one API layer.
          </p>
          <div className="pp-cta-actions">
            <Link href="/docs/compliance-checklist" className="btn btn--primary btn--lg">
              View Compliance Checklist →
            </Link>
            <Link href="/docs/concepts" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              Architecture Concepts
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
