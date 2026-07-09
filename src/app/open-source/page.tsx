import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'Open Source vs Hosted — Kakunin AI Agent Compliance' },
  description:
    'Kakunin is open core: every SDK, framework integration, and MCP server is Apache-2.0 on GitHub with npm provenance. The certificate authority, risk engine, and WORM audit log run as a hosted platform. Here is exactly what lives where — and why.',
  alternates: { canonical: '/open-source' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/open-source',
    title: 'Open Source vs Hosted — Kakunin',
    description:
      'Every Kakunin SDK is Apache-2.0 with verifiable npm provenance. The trust anchor — CA, risk engine, WORM audit — is hosted. What lives where, and why.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Open Source' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Open Source vs Hosted — Kakunin',
    description:
      'Open-core compliance infrastructure for AI agents: Apache-2.0 SDKs with npm provenance, hosted certificate authority and risk engine.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'Open Source', item: 'https://www.kakunin.ai/open-source' },
  ],
};

const REPOS = [
  {
    name: 'kakunin-sdk-typescript',
    pkg: '@kakunin/sdk',
    registry: 'npm',
    desc: 'Core TypeScript SDK — agent registration, certificate issuance, event ingestion, public verification, webhook signatures, and the @kakunin/sdk/verify enforcement middleware (incl. the Supabase RLS binding).',
  },
  {
    name: 'kakunin-sdk-python',
    pkg: 'kakunin',
    registry: 'PyPI',
    desc: 'Async Python SDK with framework integrations for LangChain, LlamaIndex, CrewAI, AutoGen, LangGraph, CAMEL-AI, and OpenAI Assistants — plus the verify_agent_scope decorator.',
  },
  {
    name: 'kakunin-integrations',
    pkg: '@kakunin/middleware · @kakunin/langchain · @kakunin/mastra · @kakunin/ai-sdk',
    registry: 'npm',
    desc: 'Gateway middleware (Express / Fastify / Next.js) and typed compliance tools for LangChain JS, Mastra, and the Vercel AI SDK.',
  },
  {
    name: 'kakunin-mcp',
    pkg: '@kakunin/mcp',
    registry: 'npm',
    desc: 'Model Context Protocol server — lets any MCP-capable agent check its own scope, read its risk score, and append audit events.',
  },
  {
    name: 'kakunin-samples',
    pkg: '13 runnable examples',
    registry: 'GitHub',
    desc: 'End-to-end sample agents across the supported frameworks: certificate lifecycle, scope enforcement, and risk-event patterns you can copy.',
  },
];

const COMPARISON: Array<{ area: string; oss: string; hosted: string }> = [
  {
    area: 'SDKs & framework integrations',
    oss: '✓ Apache-2.0 — full source, fork freely',
    hosted: 'Same packages — no private forks',
  },
  {
    area: 'Enforcement middleware (gateway, RLS binding)',
    oss: '✓ Apache-2.0 — runs in your infrastructure',
    hosted: 'Same code, verifying against the hosted CA',
  },
  {
    area: 'MCP server',
    oss: '✓ Apache-2.0 — run it next to your agents',
    hosted: 'Also available hosted at kakunin.ai/api/mcp',
  },
  {
    area: 'Supply-chain verifiability',
    oss: '✓ npm provenance + PyPI attestations — every artifact traceable to a public commit and CI run',
    hosted: 'Inherits the same published artifacts',
  },
  {
    area: 'X.509 certificate authority',
    oss: '— (trust anchor; see below)',
    hosted: '✓ AWS KMS RSA-2048, keys never leave the HSM',
  },
  {
    area: 'Behavioral risk engine',
    oss: '—',
    hosted: '✓ Real-time scoring, 30-day baselines, drift detection',
  },
  {
    area: 'WORM audit log',
    oss: '—',
    hosted: '✓ Append-only, S3 Object-Lock backed, regulator-exportable',
  },
  {
    area: 'Auto-revocation & CRL',
    oss: '—',
    hosted: '✓ Sub-60s revocation, CDN-cached CRL, revocation webhooks',
  },
  {
    area: 'Compliance reports (MiCA / EU AI Act)',
    oss: '—',
    hosted: '✓ Signed PDF exports for regulators and counterparties',
  },
  {
    area: 'Public certificate verification',
    oss: '✓ Keyless — anyone can verify any cert serial, no account',
    hosted: 'Served by the hosted platform, free for all parties',
  },
  {
    area: 'Cost',
    oss: 'Free forever',
    hosted: 'Free sandbox tier · paid plans for production CA',
  },
];

export default function OpenSourcePage() {
  return (
    <div className="pp-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <SiteNav />

      {/* ---- Hero ---- */}
      <section className="pp-hero">
        <div className="pp-hero-grid" />
        <div className="pp-hero-inner">
          <div className="pp-breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Open Source</span>
          </div>
          <span className="eyebrow">Open Core · Apache-2.0 · Verifiable Supply Chain</span>
          <h1 className="pp-hero-title">
            Open source SDKs.
            <em> Hosted trust anchor.</em>
          </h1>
          <p className="pp-hero-sub">
            Every line of code that runs inside your agents, your gateway, or your CI is Apache-2.0
            on GitHub — published to npm and PyPI with cryptographic provenance. The certificate
            authority, risk engine, and tamper-proof audit log run as a hosted platform, because a
            trust anchor you can fork is not a trust anchor.
          </p>
          <div className="pp-hero-ctas">
            <a
              href="https://github.com/kakunin-ai"
              className="btn btn--primary btn--lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub →
            </a>
            <Link href="/docs/sdks" className="btn btn--ghost btn--lg">
              SDK Docs
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">7</span>
              <span className="stat-l">Packages on npm + PyPI</span>
            </div>
            <div className="stat">
              <span className="stat-v">Apache-2.0</span>
              <span className="stat-l">No copyleft, no CLA wall to read the code</span>
            </div>
            <div className="stat">
              <span className="stat-v">Provenance</span>
              <span className="stat-l">Every artifact attested to a public commit</span>
            </div>
            <div className="stat">
              <span className="stat-v">5</span>
              <span className="stat-l">Public repositories</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Comparison table ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — WHAT LIVES WHERE</div>
            <h2 className="pp-section-title">Open source vs hosted, feature by feature</h2>
            <p className="pp-section-sub">
              No ambiguity, no &ldquo;open-washing&rdquo;: this is the exact split. Everything
              client-side is open. The control plane — the part regulators and counterparties have
              to be able to trust independently of you — is hosted.
            </p>
          </div>
          <div className="pp-table-wrap">
            <table className="pp-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Open source (Apache-2.0)</th>
                  <th>Hosted platform</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.area}>
                    <td>
                      <strong>{row.area}</strong>
                    </td>
                    <td>{row.oss}</td>
                    <td>{row.hosted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="pp-table-note">
            Verify any package yourself: <code>npm audit signatures</code> checks the provenance
            attestation on every <code>@kakunin/*</code> install, and PyPI shows the attested
            GitHub workflow for <code>kakunin</code> on the release page.
          </p>
        </div>
      </section>

      {/* ---- The repos ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — THE REPOSITORIES</div>
            <h2 className="pp-section-title">Five public repos, one scope</h2>
            <p className="pp-section-sub">
              Everything publishes from public source under the <code>@kakunin</code> npm scope and
              the <code>kakunin</code> PyPI project. Each repo carries a security policy
              (48-hour acknowledgment, 90-day coordinated disclosure), contribution guide, and CI
              with dependency audits.
            </p>
          </div>
          <div className="pp-features">
            {REPOS.map((repo) => (
              <div className="pp-feature" key={repo.name}>
                <h3>
                  <a
                    href={`https://github.com/kakunin-ai/${repo.name}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'none' }}
                  >
                    {repo.name} →
                  </a>
                </h3>
                <p>
                  <code>{repo.pkg}</code> · {repo.registry}
                </p>
                <p style={{ marginTop: '0.5rem' }}>{repo.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Why the control plane is hosted ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — THE HONEST PART</div>
            <h2 className="pp-section-title">Why isn&apos;t the CA open source?</h2>
            <p className="pp-section-sub">
              Not a business dodge — a trust-model constraint. Three concrete reasons:
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num">1</div>
              <h3>A forkable trust anchor is worthless</h3>
              <p>
                The value of a Kakunin certificate is that <em>any</em> counterparty can verify it
                against one canonical CA — keylessly, without asking you. A thousand self-hosted CAs
                would mean a thousand roots nobody recognizes. Verification stays free and public
                for everyone precisely because issuance is centralized.
              </p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">2</div>
              <h3>Key custody is the product</h3>
              <p>
                Agent private keys live in AWS KMS HSMs and never leave. Open-sourcing the CA would
                shift key custody onto every operator — recreating the exact secrets-sprawl problem
                agent identity is meant to solve, and voiding the MiCA Art. 70 custody story.
              </p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">3</div>
              <h3>Audit logs must be adversarial-proof</h3>
              <p>
                A WORM audit log you host yourself proves nothing to a regulator — you could have
                rewritten it. Independent custody of the append-only log is what makes the evidence
                admissible. That independence is structural, not a feature flag.
              </p>
            </div>
            <div className="pp-step">
              <div className="pp-step-num">4</div>
              <h3>What could open next</h3>
              <p>
                Core identity primitives (certificate parsing, chain validation, CRL tooling) are
                candidates for open-sourcing as community traction grows. Watch the repos — the
                split can move toward more open, never less.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-section-inner">
          <div className="pp-cta">
            <h2 className="pp-cta-title">Read the source. Then certify an agent.</h2>
            <p className="pp-cta-sub">
              Start with the sandbox — 100 free test certificates a day, real X.509, no card. Every
              SDK you install is code you can audit first.
            </p>
            <div className="pp-cta-actions">
              <a
                href="https://github.com/kakunin-ai/kakunin-sdk-typescript"
                className="btn btn--primary btn--lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Star the SDK →
              </a>
              <Link
                href="/docs/quickstart-ai-agents"
                className="btn btn--ghost btn--lg"
                style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}
              >
                Quickstart
              </Link>
              <Link
                href="/pricing"
                className="btn btn--ghost btn--lg"
                style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}
              >
                Pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
