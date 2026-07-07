import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../../landing.css';
import '../../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'Non-Human Identity for AI Agents — Kakunin' },
  description: 'X.509 certificates as NHI credentials for AI agents. Cryptographic identity, behavioral monitoring, auto-revocation, and MiCA/EU AI Act compliance for non-human identity.',
  alternates: { canonical: '/platform/non-human-identity' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/platform/non-human-identity',
    title: 'Non-Human Identity for AI Agents — Kakunin',
    description: 'X.509 certificates as NHI credentials for AI agents. Cryptographic identity, behavioral monitoring, and auto-revocation built for regulated environments.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — Non-Human Identity for AI Agents' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Non-Human Identity for AI Agents — Kakunin',
    description: 'X.509 certificates, behavioral monitoring, auto-revocation. NHI infrastructure built for MiCA and EU AI Act.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'Platform', item: 'https://www.kakunin.ai/platform' },
    { '@type': 'ListItem', position: 3, name: 'Non-Human Identity', item: 'https://www.kakunin.ai/platform/non-human-identity' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is non-human identity (NHI) for AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Non-human identity (NHI) refers to the cryptographic credentials that uniquely identify automated systems — AI agents, service accounts, bots, scripts — rather than human users. For AI agents, NHI means issuing each agent an X.509 certificate that encodes its identity, permitted scope, and validity window. Unlike API keys, NHI credentials are time-bounded, cryptographically signed by a trusted CA, and independently verifiable by any counterparty without contacting the issuer.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why are AI agents a new NHI challenge compared to traditional service accounts?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Traditional service accounts act on well-defined, static workflows. AI agents act autonomously, change behavior at runtime, and may operate across dozens of external APIs in a single session. This creates three new NHI requirements: (1) scope must be cryptographically enforced, not just advisory; (2) behavioral drift must trigger automated credential revocation; (3) every action must be non-repudiably linked to a specific agent identity for regulatory audit. Static API keys satisfy none of these requirements.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Kakunin implement NHI for AI agents?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin issues each AI agent an X.509 RSA-2048 certificate via AWS KMS. The private key is generated inside the KMS hardware security module and never leaves it — Kakunin stores only the KMS key ARN. The certificate encodes the agent\'s permitted actions as extensions. Behavioral events stream continuously to Kakunin\'s risk engine; when the rolling 30-day risk score exceeds 0.85, the certificate is automatically revoked within 60 seconds. The revocation is published to the public CRL and takes effect at the next gateway verification.',
      },
    },
    {
      '@type': 'Question',
      name: 'What do MiCA and the EU AI Act require for non-human identity?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'MiCA Article 70 requires AI agent operators to maintain defined credential validity periods and renewal processes. MiCA Article 72 requires the capability to withdraw or revoke agent authority when risk thresholds are breached. EU AI Act Article 12 requires logs that allow monitoring of specific high-risk AI system operations — which requires cryptographic identity linkage between log entries and agent instances. X.509 certificates satisfy all three requirements: time-bounded validity (Art. 70), automated revocation (Art. 72), and non-repudiable audit trails (Art. 12).',
      },
    },
  ],
};

export default function NonHumanIdentityPage() {
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
            <span>Non-Human Identity</span>
          </div>
          <span className="eyebrow">NHI · Machine Identity · AI Agents</span>
          <h1 className="pp-hero-title">
            Non-Human Identity
            <em> for AI Agents.</em>
          </h1>
          <p className="pp-hero-sub">
            AI agents are the fastest-growing category of non-human identity. Unlike service accounts,
            they act autonomously, change behavior at runtime, and touch regulated systems at machine speed.
            Kakunin issues each agent a cryptographic machine identity — X.509 certificates backed by AWS KMS,
            continuous behavioral monitoring, and auto-revocation in under 60 seconds. Pair it with our
            <Link href="/platform/ai-governance-tools"> AI governance infrastructure</Link>, test controls in the
            <Link href="/platform/sandbox"> live sandbox</Link>, or benchmark your deployment with the
            <Link href="/assessment"> agent readiness assessment</Link>.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/agents" className="btn btn--primary btn--lg">
              Register Your First Agent →
            </Link>
            <Link href="/docs/certificates" className="btn btn--ghost btn--lg">
              Certificate Docs
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">X.509</span>
              <span className="stat-l">RSA-2048 per agent</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;60s</span>
              <span className="stat-l">Auto-revocation SLA</span>
            </div>
            <div className="stat">
              <span className="stat-v">KMS</span>
              <span className="stat-l">Private key never leaves HSM</span>
            </div>
            <div className="stat">
              <span className="stat-v">365 days</span>
              <span className="stat-l">MiCA Art. 70 validity window</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 01: What is NHI ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — NON-HUMAN IDENTITY</div>
            <h2 className="pp-section-title">What is non-human identity?</h2>
            <p className="pp-section-sub">
              Non-human identity (NHI) is the practice of issuing cryptographic credentials to automated
              systems — not users — so that every action taken by a machine can be attributed, scoped, and
              revoked independently. Kakunin is purpose-built NHI infrastructure for AI agents, with
              implementation guidance in the <Link href="/attestation-template">attestation template</Link> and
              endpoint-level details in the <Link href="/api-docs"> API docs</Link>.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Beyond API keys</h3>
              <p>An API key proves that someone once had access to it. An X.509 machine identity proves
              that this specific agent instance, with this specific scope, is operating within its
              authorised window — and that every action it takes is cryptographically signed and
              attributable to a named identity, not a shared secret.</p>
            </div>
            <div className="pp-feature">
              <h3>Cryptographic scope binding</h3>
              <p>Kakunin encodes permitted actions directly in each agent&apos;s X.509 credential
              as certificate extensions. An agent with <code>read:accounts</code> in its machine
              identity physically cannot call a <code>write:payments</code> endpoint — the scope
              is cryptographic, not advisory, and enforced at the gateway layer before any
              application code runs.</p>
            </div>
            <div className="pp-feature">
              <h3>Time-bounded authority</h3>
              <p>Unlike API keys, X.509 credentials expire by design. Every Kakunin-issued machine
              identity carries a <code>notAfter</code> timestamp — 365 days by default, shorter for
              high-risk agents. Expiry forces renewal, limits blast radius, and satisfies MiCA
              Article 70 without any manual credential hygiene process.</p>
            </div>
            <div className="pp-feature">
              <h3>Public verifiability</h3>
              <p>Any counterparty — a downstream service, a regulator, an auditor — can verify an
              agent&apos;s machine identity via <code>GET /api/v1/verify/{'{serial}'}</code> with
              no Kakunin account required. The response includes operator, scope, model hash,
              validity window, and revocation status. Under 500ms, globally CDN-cached.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 02: AI Agents as a New NHI Challenge ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — THE NHI CHALLENGE</div>
            <h2 className="pp-section-title">Why AI agents are a new NHI challenge</h2>
            <p className="pp-section-sub">
              Traditional service accounts follow predictable, audited scripts. AI agents are different:
              they reason, adapt, and take novel actions at runtime. That autonomy creates three NHI
              problems that existing credential systems cannot solve. For a practical walkthrough of those
              controls in motion, the <Link href="/platform/sandbox">sandbox simulation</Link> shows how risk
              scoring and revocation behave under pressure.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Autonomous scope drift</h3>
              <p>AI agents may attempt actions outside their original design — not through compromise, but through reasoning errors or prompt injection. NHI credentials must enforce permitted scope at the cryptographic layer, not the application layer.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Multi-agent attribution</h3>
              <p>Large deployments run dozens of agent instances sharing underlying models. Shared API keys make attribution impossible when an incident occurs. Each agent instance needs its own machine identity with a unique serial number in every log entry.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Behavioral revocation triggers</h3>
              <p>Traditional NHI revocation is manual — a human decides a credential needs to be retired. AI agents need automated revocation: when behavioral risk crosses a threshold, the agent&apos;s machine identity must be withdrawn in under 60 seconds, without human intervention.</p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Regulatory non-repudiation</h3>
              <p>EU AI Act Article 12 and MiCA Article 72 require audit trails where each entry is cryptographically linked to a specific agent identity. Log entries attributed only to an API key do not satisfy this requirement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 03: X.509 as NHI Credential ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — NHI CREDENTIAL</div>
            <h2 className="pp-section-title">X.509 certificates as NHI credentials</h2>
            <p className="pp-section-sub">
              The X.509 standard (RFC 5280) provides the NHI credential format that AI agents
              need. It was designed for exactly this class of problem — proving the identity of a
              machine to another machine — and has been battle-tested across three decades and
              billions of TLS connections.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Structured machine identity</h3>
              <p>The certificate Subject field encodes a structured identifier: organisation, department,
              agent name, and unique agent ID. This is not a secret — it is publicly readable by any
              counterparty. The CA&apos;s signature on that subject is the proof of identity. Subject:
              <code>CN=trading-agent-003, O=fintech-startup, OU=agent-fleet</code></p>
            </div>
            <div className="pp-feature">
              <h3>AWS KMS key custody</h3>
              <p>Each agent&apos;s RSA-2048 private key is generated inside AWS KMS and never
              exported. Kakunin stores only the KMS ARN. All signing operations are delegated to KMS
              via API. Even full database access yields no exploitable key material — only ARN
              references to hardware-protected keys.</p>
            </div>
            <div className="pp-feature">
              <h3>Certificate extensions for agent scope</h3>
              <p>Kakunin uses X.509 extensions to encode agent-specific data: permitted action array,
              model hash, tenant ID, and deployment environment. This data is cryptographically bound
              to the credential — it cannot be modified after issuance without invalidating the
              CA signature.</p>
            </div>
            <div className="pp-feature">
              <h3>Chain of trust to Kakunin CA</h3>
              <p>Every agent credential chains to Kakunin&apos;s root Certificate Authority. This
              creates a verifiable trust anchor: any system that trusts the Kakunin CA automatically
              trusts all agent credentials it has issued, and can verify their revocation status
              without a direct relationship with the issuing operator.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 04: Behavioral Monitoring ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — BEHAVIORAL MONITORING</div>
            <h2 className="pp-section-title">Behavioral monitoring for NHI</h2>
            <p className="pp-section-sub">
              Static NHI credentials answer the question: is this agent who it claims to be? Behavioral
              monitoring answers the harder question: is this agent still acting within acceptable bounds?
              Kakunin combines both — machine identity and continuous behavioral assessment — in a single
              infrastructure layer.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Continuous event streaming</h3>
              <p>Every action an agent takes — API calls, data access, transaction submissions,
              authentication attempts — is streamed to Kakunin&apos;s event ingestion endpoint and
              attributed to its machine identity via certificate serial. 1,000 events per second
              per tenant. p99 ingestion latency under 200ms.</p>
            </div>
            <div className="pp-feature">
              <h3>Rolling 30-day risk score</h3>
              <p>Kakunin maintains a continuously-updated risk score for each agent based on
              behavioral patterns: action frequency, scope boundary tests, authentication failures,
              and anomalous transaction patterns. The score is computed over a rolling 30-day window
              and updates in real time as events are ingested.</p>
            </div>
            <div className="pp-feature">
              <h3>Risk bands and thresholds</h3>
              <p>Score ≥0.85 triggers automatic credential revocation. Score ≥0.75 triggers a
              pre-revocation warning pushed to <Link href="/api/v1/notifications" className="text-link">
              /api/v1/notifications</Link>. Score ≥0.3 is medium risk — monitored but not blocked.
              Score &lt;0.3 is low risk. All thresholds are configurable per-tenant.</p>
            </div>
            <div className="pp-feature">
              <h3>WORM audit trail</h3>
              <p>All behavioral events and NHI credential operations are written to an append-only,
              immutable audit log. PostgreSQL-level rules prevent any UPDATE or DELETE — the log
              is cryptographically tamper-evident. Regulators and auditors access a complete,
              unmodifiable history from agent registration through every action to final revocation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 05: Auto-Revocation ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">05 — AUTO-REVOCATION</div>
            <h2 className="pp-section-title">Automated NHI revocation</h2>
            <p className="pp-section-sub">
              When an agent&apos;s behavioral risk crosses the 0.85 threshold, Kakunin revokes its
              machine identity automatically — no human approval required. The revocation is
              propagated to the public CRL within seconds. The next gateway verification from that
              agent returns a 403. Total time from risk breach to first blocked request: under 60 seconds.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Automatic revocation at 0.85 risk</h3>
              <p>No manual step, no approval queue. When the risk engine records a score ≥0.85,
              the credential revocation is triggered synchronously. The KMS key is scheduled for
              deletion, the serial is added to the public CRL, and the audit log receives a
              <code>certificate.revoked</code> event with full metadata.</p>
            </div>
            <div className="pp-feature">
              <h3>Pre-revocation warning at 0.75</h3>
              <p>At 0.75 risk, operators receive a proactive warning via the notification inbox
              before revocation occurs. This creates a 10-point risk buffer for human review:
              investigate the anomaly, determine if it is a bug or a genuine threat, and either
              remediate or manually revoke before the automatic threshold is hit.</p>
            </div>
            <div className="pp-feature">
              <h3>Webhook delivery within 5 seconds</h3>
              <p>Every revocation event triggers a webhook to registered endpoints with HMAC-SHA256
              verification. Your downstream systems — API gateways, monitoring platforms, incident
              management tools — are notified within 5 seconds of credential revocation. Zero
              polling required.</p>
            </div>
            <div className="pp-feature">
              <h3>MiCA Art. 72 compliance by design</h3>
              <p>MiCA Article 72 requires that AI agent operators maintain the capability to withdraw
              agent authority when risk conditions are met. Kakunin&apos;s automated revocation
              pipeline is a direct implementation of this requirement: the capability is always
              active, the threshold is documented, and every activation is logged in the WORM
              audit trail.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- 06: MiCA & EU AI Act ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">06 — REGULATORY COMPLIANCE</div>
            <h2 className="pp-section-title">MiCA and EU AI Act NHI obligations</h2>
            <p className="pp-section-sub">
              Three regulatory frameworks directly mandate non-human identity controls for AI agents
              operating in the EU. Kakunin&apos;s NHI infrastructure is designed to satisfy all three
              without requiring separate compliance tooling.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>MiCA Article 70 — credential validity</h3>
              <p>Requires defined validity periods for AI agent authority. Kakunin issues X.509
              machine identities with 365-day validity windows by default. Annual renewal forces
              re-verification of agent identity and scope. Each renewal generates an audit log
              entry and produces fresh credential material. Agents that have drifted from their
              original specification become visible at renewal time.</p>
            </div>
            <div className="pp-feature">
              <h3>MiCA Article 72 — authority withdrawal</h3>
              <p>Requires the capability to withdraw agent authority when risk conditions are met.
              Kakunin&apos;s automated revocation at risk score ≥0.85 directly implements this
              obligation. Every withdrawal is logged in the WORM audit trail with timestamp,
              triggering risk score, and affected agent identity. Regulators can access this
              history via the public verification endpoint.</p>
            </div>
            <div className="pp-feature">
              <h3>EU AI Act Article 12 — audit logging</h3>
              <p>Requires logs that allow post-hoc monitoring of high-risk AI system operations.
              Log entries attributed only to an API key do not satisfy this requirement — you
              cannot prove which specific agent instance generated a given entry. Kakunin&apos;s
              cryptographic attribution links every behavioral event to a specific machine identity
              via certificate serial, creating the non-repudiable audit trail Article 12 requires.</p>
            </div>
            <div className="pp-feature">
              <h3>EU AI Act Article 13 — transparency</h3>
              <p>Requires transparency documentation for high-risk AI systems. The publicly
              verifiable machine identity gives regulators and auditors direct access to operator,
              scope, model hash, and deployment context — without requiring a Kakunin account. The
              same endpoint used by downstream systems for enforcement is available to compliance
              reviewers for audit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>NHI infrastructure</p>
          <h2 className="pp-cta-title">Issue your first agent machine identity.</h2>
          <p className="pp-cta-sub">
            X.509 credentials via AWS KMS, behavioral monitoring, automated revocation.
            Register your first agent in under 15 minutes.
          </p>
          <div className="pp-cta-actions">
            <Link href="/docs/agents" className="btn btn--primary btn--lg">
              Register Agent →
            </Link>
            <Link href="/docs/certificates" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              Certificate Docs
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
