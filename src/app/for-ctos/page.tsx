import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Agent Integration for CTOs — SDK, API & Webhooks | Kakunin' },
  description: 'Integrate AI agent compliance into your stack with TypeScript SDK, REST API, event streaming, and webhooks. X.509 identity and behavioral monitoring built for engineering teams.',
  alternates: { canonical: '/for-ctos' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/for-ctos',
    title: 'AI Agent Integration for CTOs — SDK, API & Webhooks | Kakunin',
    description: 'TypeScript SDK, REST API, event streaming, and webhooks for AI agent compliance. X.509 identity + behavioral monitoring for engineering teams.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Agent Integration for CTOs' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Integration for CTOs — Kakunin',
    description: 'TypeScript SDK + REST API for AI agent compliance. X.509 identity, behavioral monitoring, and webhooks.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'For CTOs', item: 'https://www.kakunin.ai/for-ctos' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I integrate Kakunin into my AI agent stack?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Integration takes roughly 15 minutes. Install the TypeScript SDK (npm install @kakunin/sdk), register your agent via POST /api/v1/agents, receive an X.509 certificate (private key stays in AWS KMS), and start streaming behavioral events. A sandbox mode is available for testing without production risk.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where is the agent private key stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Private key material never leaves AWS KMS. Kakunin stores only the KMS key ARN in the database. All signing operations are delegated to KMS directly. You receive the certificate PEM and the ARN — never the raw private key.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the event ingestion latency and throughput?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin supports 1,000 behavioral events per second per tenant. Ingestion p99 latency is under 200ms. The rolling 30-day risk score updates in real-time. Public certificate verification at /api/v1/verify adds less than 5ms overhead when called at the edge.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a sandbox mode for testing?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Kakunin provides a full sandbox environment with isolated data, test API keys, and simulated certificate issuance. Sandbox certificates are clearly marked and never appear in the public CRL. You can reset sandbox state via the API at any time.',
      },
    },
  ],
};

export default function ForCTOsPage() {
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
            <span>For CTOs</span>
          </div>
          <span className="eyebrow">CTO · Engineering</span>
          <h1 className="pp-hero-title">
            Integrate AI agent compliance
            <em> into your stack.</em>
          </h1>
          <p className="pp-hero-sub">
            TypeScript SDK, REST API, event streaming, and webhooks for AI agents.
            Issue X.509 certificates, monitor behavior, and enforce scope in production without
            building a PKI team from scratch.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/docs/quickstart-ai-agents" className="btn btn--primary btn--lg">
              Quick Start Guide →
            </Link>
            <Link href="/docs/sdks" className="btn btn--ghost btn--lg">
              TypeScript SDK
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">15 min</span>
              <span className="stat-l">Time to first certificate</span>
            </div>
            <div className="stat">
              <span className="stat-v">&lt;5ms</span>
              <span className="stat-l">Latency overhead</span>
            </div>
            <div className="stat">
              <span className="stat-v">1,000/s</span>
              <span className="stat-l">Event ingest capacity</span>
            </div>
            <div className="stat">
              <span className="stat-v">RSA-2048</span>
              <span className="stat-l">AWS KMS — key never leaves</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Integration Path ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — INTEGRATION</div>
            <h2 className="pp-section-title">Your integration path</h2>
            <p className="pp-section-sub">
              Four steps from zero to a certified, monitored AI agent. Full TypeScript types throughout.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>Register agent</h3>
              <p>POST /agents with metadata: name, org, permitted_actions, model_hash. Returns agent_id immediately.</p>
              <code className="pp-step-code">kakunin.agents.create(&#123;agent_id, scope&#125;)</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Receive certificate</h3>
              <p>X.509 RSA-2048 cert. Private key stays in AWS KMS — never exposed. Valid 365 days per MiCA Art. 70.</p>
              <code className="pp-step-code">&#123; cert_pem, kms_arn &#125;</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Stream events</h3>
              <p>Agent streams behavioral events: transaction, data_access, api_call, auth_failure. 1,000 events/sec capacity.</p>
              <code className="pp-step-code">events.ingest(agent_id, event[])</code>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>Handle auto-revocation</h3>
              <p>Risk score &gt;0.85 triggers auto-revoke in &lt;60s. Webhook fires. Enforce via /v1/verify at the edge.</p>
              <code className="pp-step-code">webhooks.on(&apos;certificate.revoked&apos;)</code>
            </div>
          </div>
        </div>
      </section>

      {/* ---- SDKs ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — SDKs</div>
            <h2 className="pp-section-title">Available SDKs &amp; languages</h2>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>TypeScript (@kakunin/sdk)</h3>
              <p>Zod validation, automatic retry, sandbox mode. Full type safety. Production-ready.</p>
              <span className="pp-feature-tag">npm install @kakunin/sdk</span>
            </div>
            <div className="pp-feature">
              <h3>REST API (all languages)</h3>
              <p>OpenAPI 3.0 spec. JSON/REST. Available now for Python, Go, Java, and any HTTP client.</p>
              <span className="pp-feature-tag">/api/v1/agents · /api/v1/events</span>
            </div>
            <div className="pp-feature">
              <h3>MCP server</h3>
              <p>Model Context Protocol integration. AI agents can self-register and self-certify via MCP.</p>
              <Link href="/docs/mcp" className="pp-feature-tag">MCP docs</Link>
            </div>
            <div className="pp-feature">
              <h3>Python (V1.1 roadmap)</h3>
              <p>Coming Q3 2026. Early access for enterprise customers. REST API available today.</p>
              <span className="pp-feature-tag" style={{ color: 'var(--amber)' }}>Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Engineering Specs ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — PERFORMANCE</div>
            <h2 className="pp-section-title">Engineering specs</h2>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Event ingestion</h3>
              <p>1,000 events/second capacity. Rolling 30-day risk score. p99 latency: 200ms ingestion, &lt;5ms verification overhead.</p>
            </div>
            <div className="pp-feature">
              <h3>Certificate issuance</h3>
              <p>Register + certify first agent: &lt;3 seconds end-to-end. Async via QStash for scale. KMS RSA-2048 signing.</p>
            </div>
            <div className="pp-feature">
              <h3>Auto-revocation</h3>
              <p>SLA: certificate revoked within 60 seconds of threshold breach. Webhook delivered within 5 seconds.</p>
            </div>
            <div className="pp-feature">
              <h3>Public verification</h3>
              <p>Regulators verify at /v1/verify — no auth, &lt;500ms p99, globally CDN-cached. Zero overhead on your stack.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Documentation ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — DOCUMENTATION</div>
            <h2 className="pp-section-title">Read first</h2>
          </div>
          <div className="pp-resources">
            <Link href="/docs/quickstart-ai-agents" className="pp-resource-link">
              <h3>Quick Start — AI Agents</h3>
              <p>Register, certify, and stream events in under 15 minutes.</p>
            </Link>
            <Link href="/docs/authentication" className="pp-resource-link">
              <h3>API Authentication</h3>
              <p>Bearer token auth. API keys scoped to tenant. Sandbox vs production.</p>
            </Link>
            <Link href="/docs/agents" className="pp-resource-link">
              <h3>Agent Registration</h3>
              <p>Register AI agents. Permitted actions, model hash, org scoping.</p>
            </Link>
            <Link href="/docs/event-ingest" className="pp-resource-link">
              <h3>Event Ingestion</h3>
              <p>Stream behavioral events. Risk scoring in real-time.</p>
            </Link>
            <Link href="/docs/sdks" className="pp-resource-link">
              <h3>TypeScript SDK</h3>
              <p>Full SDK reference. Type-safe wrappers for all API endpoints.</p>
            </Link>
            <Link href="/docs/webhooks" className="pp-resource-link">
              <h3>Webhooks</h3>
              <p>Receive revocation &amp; risk alerts. HMAC-SHA256 verification.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- Non-Human Identity Architecture ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">05 — ARCHITECTURE</div>
            <h2 className="pp-section-title">Non-Human Identity (NHI) architecture</h2>
            <p className="pp-section-sub">
              Non-human identity (NHI) is the cryptographic layer that distinguishes a trusted AI
              agent from a rogue script. Kakunin is the NHI infrastructure layer for agent-native
              teams — purpose-built for systems that act at machine speed in regulated environments.
            </p>
            <p className="pp-section-sub">
              For a buyer-facing explanation of the same model, see the{' '}
              <Link href="/platform/non-human-identity">non-human identity overview</Link>. If you
              want to pressure-test the control path before writing code, the{' '}
              <Link href="/platform/sandbox">live sandbox</Link> shows the revocation flow end to end.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Why machine identity matters</h3>
              <p>AI agents operating in financial services, healthcare, or critical infrastructure
              need verifiable machine identity before touching regulated systems. Without it, an
              agent is indistinguishable from a compromised automation or a supply-chain injection.
              X.509 certificates encode operator, model version, and permitted scope — tamper-proof,
              publicly verifiable, regulator-readable.</p>
            </div>
            <div className="pp-feature">
              <h3>Certificate-bound scope enforcement</h3>
              <p>Permitted actions are encoded in the X.509 certificate at issuance — not in
              application config, not in a database row. An agent with <code>read:invoices</code>
              in its cert physically cannot perform <code>write:payments</code>, even if the
              application code is compromised. Scope is cryptographic, not advisory.</p>
            </div>
            <div className="pp-feature">
              <h3>Short-lived credentials by default</h3>
              <p>X.509 certificates expire. Static API keys do not. Every Kakunin-issued certificate
              has a maximum 365-day validity window — and can be configured shorter for high-risk
              agents. Expiry forces rotation, limits blast radius, and satisfies MiCA Art. 70
              without any manual credential hygiene process.</p>
            </div>
            <div className="pp-feature">
              <h3>Public verification, no account required</h3>
              <p>Any counterparty, regulator, or downstream service can confirm an agent&apos;s
              machine identity via <code>GET /v1/verify/{'{serial}'}</code> — no Kakunin account,
              no API key, under 500ms. The verification response includes operator, scope, model
              hash, validity window, and revocation status.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- AWS KMS Key Custody ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">06 — KEY CUSTODY</div>
            <h2 className="pp-section-title">AWS KMS key custody — private keys that never leave hardware</h2>
            <p className="pp-section-sub">
              AWS KMS HSM-backed RSA-2048 keypairs. The private key is generated inside the hardware
              security module and never exported — not to Kakunin, not to your application, not anywhere.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>AWS KMS — why it matters for agents</h3>
              <p>Traditional agent deployments store private keys in environment variables, secrets
              managers, or worse — application code. A single leaked key compromises every agent
              sharing it. AWS KMS eliminates this: the key is generated inside the HSM, signing
              operations are delegated to KMS directly, and Kakunin stores only the
              <code>kms_key_arn</code> — never the key material.</p>
            </div>
            <div className="pp-feature">
              <h3>Per-agent KMS keys</h3>
              <p>Each agent gets its own AWS KMS RSA-2048 keypair. Revoking one agent does not
              affect any other agent&apos;s key. The blast radius of a compromised agent is bounded
              to that agent&apos;s certificate serial — not the entire fleet. AWS KMS key deletion
              is scheduled automatically on retirement.</p>
            </div>
            <div className="pp-feature">
              <h3>Signing at the edge</h3>
              <p>When an agent needs to sign a request payload, your code calls
              <code>POST /v1/agents/{'{id}'}/sign</code>. Kakunin delegates the signing operation
              to AWS KMS, returns the base64 signature, and logs the event. The private key never
              transits the network. The receiver verifies via <code>POST /v1/verify/message</code>.</p>
            </div>
            <div className="pp-feature">
              <h3>Audit trail for every KMS operation</h3>
              <p>AWS KMS generates a CloudTrail entry for every key usage. Kakunin writes a
              corresponding entry to the immutable behavioral log. Two independent tamper-proof
              records for every signing operation — satisfying the most demanding audit requirements
              with zero additional instrumentation from your team.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Zero-Trust Agent Authentication ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">07 — ZERO-TRUST</div>
            <h2 className="pp-section-title">Zero-trust agent authentication</h2>
            <p className="pp-section-sub">
              Never trust, always verify — applied to the agent layer. Every inbound agent request
              is verified against a live certificate status check before reaching your services.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>mTLS gateway enforcement</h3>
              <p>Add the Kakunin gateway middleware once. Every inbound agent request must present
              a valid <code>X-Kakunin-Cert-Serial</code> header. The middleware calls
              <code>/v1/verify/:serial</code> — public, no credentials — and blocks any request
              from a suspended or revoked agent before it reaches your application layer. Under
              5ms overhead.</p>
              <code className="pp-step-code">kakuninEnforce(req, res, next)</code>
            </div>
            <div className="pp-feature">
              <h3>mTLS flow</h3>
              <pre style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', lineHeight: '1.6', color: 'var(--ink-2)', background: 'var(--surface)', padding: '12px', borderRadius: '6px', overflowX: 'auto' }}>
{`Agent
  │ presents X-Kakunin-Cert-Serial
  ▼
Gateway Middleware
  │ GET /v1/verify/:serial (< 5ms)
  ▼
Kakunin CA
  │ returns { status, scope, risk_score }
  ▼
Gateway
  │ status=active? pass │ revoked? 403
  ▼
Your Service`}
              </pre>
            </div>
            <div className="pp-feature">
              <h3>Scope enforcement at the border</h3>
              <p>The verify response includes the agent&apos;s <code>permitted_actions</code> array.
              Your gateway compares the requested action against the cert-bound scope before the
              request hits your business logic. An agent trying to call an endpoint outside its
              scope gets a <code>403 Scope violation</code> — and the attempt is logged as a
              high-risk behavioral event.</p>
            </div>
            <div className="pp-feature">
              <h3>Instant revocation propagation</h3>
              <p>No TTL cache on the verify endpoint by design. When a certificate is revoked —
              auto or manual — the next request from that agent fails at the gateway. No 15-minute
              JWKS cache window. No stale session. Sub-60-second SLA from risk breach to
              first blocked request.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
          <div className="pp-cta">
            <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>Ship it</p>
            <h2 className="pp-cta-title">Ready to integrate?</h2>
            <p className="pp-cta-sub">
              Add non-human identity (NHI) to your agent stack in ~15 minutes. TypeScript SDK + REST API. Sandbox mode — no production risk.
            </p>
            <p className="pp-cta-sub" style={{ marginTop: '-4px' }}>
              If your evaluation starts with governance rather than code, review the{' '}
              <Link href="/platform/ai-governance-tools" style={{ color: 'var(--green-bright)' }}>
                AI governance tools page
              </Link>
              {' '}or use the{' '}
              <Link href="/assessment" style={{ color: 'var(--green-bright)' }}>
                readiness report
              </Link>
              {' '}to identify the highest-priority control gaps first.
            </p>
            <div className="pp-cta-actions">
            <Link href="/docs/quickstart-ai-agents" className="btn btn--primary btn--lg">
              Start Quick Start →
            </Link>
            <Link href="/docs/api-reference" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              API Reference
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
