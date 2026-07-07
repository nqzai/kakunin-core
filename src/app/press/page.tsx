import type { Metadata } from 'next';
import '../landing.css';
import './press.css';
import { SafeEmailLink } from '@/components/site/SafeEmailLink';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { CopyPromptButton } from './CopyPromptButton';
import { generateWebPage } from '@/lib/schema/generators';

export const metadata: Metadata = {
  title: 'Kakunin Press Kit — Brand Assets & Company Facts',
  description:
    'Media resources, brand assets, company facts, and AI-powered press release generator for journalists covering Kakunin.',
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/press',
    title: 'Press Kit — Kakunin',
    description: 'Media resources, brand assets, and facts for journalists.',
  },
};

export default function PressPage() {
  const pressSchema = generateWebPage(
    'Press Kit — Kakunin',
    'https://www.kakunin.ai/press',
    'Media resources, brand assets, company facts, and AI-powered press release generator for journalists covering Kakunin.',
    [
      { position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
      { position: 2, name: 'Press', item: 'https://www.kakunin.ai/press' },
    ]
  );
  const pressPrompt = `You are a tech journalist. Write a 300-word press release about Kakunin based on the following facts:

Company: Kakunin
Website: https://www.kakunin.ai/
Tagline: Cryptographic identity + behavioral proof for AI agents in regulated industries
Founded: 2025
Headquarters: Pittsburgh, PA

Core offering:
- X.509 certificate issuance for AI agents via AWS KMS
- Real-time behavioral monitoring with auto-revocation at risk threshold
- MiCA + EU AI Act compliance reports (PDF + JSON)
- Public verification endpoint (sub-500ms, no auth required)
- AgentMail: verifiable inbox per agent

Market:
- Target: Financial institutions, fintechs, enterprises deploying autonomous agents
- Regulatory drivers: MiCA (Aug 2026), EU AI Act
- Use cases: Trading bots, AML agents, payment processors, diagnostic assistants, customs filing

Key differentiator:
- Only platform that issues cryptographic identity to deployed agents AND monitors behavior AND generates regulator-ready reports as one product
- Incumbents (Jumio, Onfido, Sumsub) verify humans. Kakunin verifies AI agents.

Pricing:
- Starter: $39/agent/month (min 5 agents = $195/month)
- Pro: $99/agent/month
- Enterprise: custom
- 30-day free trial with every plan (card required, no charge until day 31)

The press release should emphasize the regulatory urgency, market gap, and product differentiation.`;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pressSchema) }}
      />
      <SiteNav active="home" />

      {/* ============================================================
           HERO
           ============================================================ */}
      <section className="press-hero">
        <div className="container">
          <div className="hero-copy">
            <span className="eyebrow">MEDIA & PRESS</span>
            <h1>Kakunin Press Kit</h1>
            <p>
              Resources for journalists, analysts, and media partners covering AI agent compliance and
              cryptographic identity.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================
           COMPANY FACTS
           ============================================================ */}
      <section className="facts-sec">
        <div className="container">
          <h2>Company at a Glance</h2>
          <div className="facts-grid">
            <div className="fact-card">
              <div className="fact-label">Founded</div>
              <div className="fact-value">2025</div>
            </div>
            <div className="fact-card">
              <div className="fact-label">Headquarters</div>
              <div className="fact-value">Pittsburgh, PA</div>
            </div>
            <div className="fact-card">
              <div className="fact-label">Stage</div>
              <div className="fact-value">Pre-seed MVP</div>
            </div>
            <div className="fact-card">
              <div className="fact-label">Mission</div>
              <div className="fact-value">Unlock AI autonomy in regulated industries</div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           ELEVATOR PITCH
           ============================================================ */}
      <section className="pitch-sec">
        <div className="container">
          <h2>One-liner</h2>
          <p className="pitch">
            Cryptographic identity + behavioral proof for AI agents in regulated industries. Think SSL
            certificates for autonomous systems.
          </p>

          <h2 style={{ marginTop: '64px' }}>What Kakunin Does</h2>
          <ul className="features-list">
            <li>
              <b>Identity:</b> Issues X.509 certificates to deployed AI agents via AWS KMS (private keys
              never leave HSM)
            </li>
            <li>
              <b>Behavioral monitoring:</b> Real-time event ingestion + risk scoring. Auto-revocation at 0.85
              threshold.
            </li>
            <li>
              <b>Compliance:</b> Auto-generates PDF/JSON reports mapped to MiCA Articles 67–75 and EU AI Act
              Annex III
            </li>
            <li>
              <b>Verification:</b> Public endpoint lets regulators/auditors/counterparties verify agent
              identity in &lt;500ms
            </li>
          </ul>
        </div>
      </section>

      {/* ============================================================
           BRAND ASSETS
           ============================================================ */}
      <section className="assets-sec">
        <div className="container">
          <h2>Brand Assets</h2>
          <div className="assets-grid">
            <div className="asset-card">
              <div className="asset-preview logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.png" alt="Kakunin Logo" />
              </div>
              <div className="asset-info">
                <h4>Logo — Primary</h4>
                <p>Wordmark in Archivo Black. Use on light backgrounds.</p>
                <a href="/logo.png" className="btn btn--ghost">
                  Download SVG
                </a>
              </div>
            </div>

            <div className="asset-card">
              <div className="asset-preview mark">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/mark-metallic-green.png" alt="Kakunin Mark" />
              </div>
              <div className="asset-info">
                <h4>Mark — Icon</h4>
                <p>Standalone icon for avatars, favicon, social. Metallic green.</p>
                <a href="/mark-metallic-green.png" className="btn btn--ghost">
                  Download PNG
                </a>
              </div>
            </div>

            <div className="asset-card">
              <div className="asset-preview color-swatch">
                <div className="swatch primary"></div>
              </div>
              <div className="asset-info">
                <h4>Color Palette</h4>
                <p>
                  Primary: <code>#2B934F</code> (green)<br />
                  Paper: <code>#F4F1E8</code> (beige)<br />
                  Ink: <code>#14181B</code> (near-black)
                </p>
              </div>
            </div>

            <div className="asset-card">
              <div className="asset-info">
                <h4>Typography</h4>
                <p>
                  Display: <b>Archivo Black</b> (headlines)<br />
                  Body: <b>Geist</b> (copy)<br />
                  Mono: <b>Geist Mono</b> (code)
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           AI PROMPT BUILDER
           ============================================================ */}
      <section className="prompt-builder-sec">
        <div className="container">
          <h2>Generate a Press Release with AI</h2>
          <p>
            Copy the prompt below, paste it into your AI chatbot, and get a press release generated in
            seconds.
          </p>

          <div className="prompt-box">
            <pre>{pressPrompt}</pre>
            <CopyPromptButton text={pressPrompt} />
          </div>
        </div>
      </section>

      {/* ============================================================
           FAQ
           ============================================================ */}
      <section className="press-faq-sec">
        <div className="container">
          <h2>Frequently Asked Questions</h2>

          <details className="faq-item">
            <summary>What problem does Kakunin solve?</summary>
            <p>
              Financial institutions can&apos;t deploy autonomous AI agents without proving behavioral
              boundaries to regulators. Kakunin bridges the gap: cryptographic identity + behavioral
              monitoring + compliance reports. Agencies can now ship agents safely.
            </p>
          </details>

          <details className="faq-item">
            <summary>Who is Kakunin built for?</summary>
            <p>
              Primary: EU financial institutions (banks, crypto exchanges, fintechs) subject to MiCA and EU
              AI Act. Secondary: any enterprise (healthcare, supply chain, public sector) deploying
              autonomous agents in regulated workflows.
            </p>
          </details>

          <details className="faq-item">
            <summary>How is Kakunin different from competitors?</summary>
            <p>
              Jumio, Onfido, Sumsub verify <em>humans</em>. Kakunin verifies <em>AI agents</em> — their
              identity, behavior, and model lineage. Not a replacement; a new primitive. Credo AI and
              Arthur AI score models. Kakunin issues identity to deployed agents and watches what they do.
            </p>
          </details>

          <details className="faq-item">
            <summary>What&apos;s the market opportunity?</summary>
            <p>
              AI agents market: $5.4B (2024) → $32.8B (2028), 40%+ CAGR. MiCA + EU AI Act enforcement:
              Aug 2026. Regulators will mandate audit trails for autonomous agents. No incumbent covers
              this gap.
            </p>
          </details>

          <details className="faq-item">
            <summary>Is there a free trial?</summary>
            <p>
              Yes. 30-day free trial on every plan — card required, no charge until day 31, cancel anytime before.
              We provision your tenant, certify your first agents together, and wire your event stream.
            </p>
          </details>

          <details className="faq-item">
            <summary>How do I get in touch with the team?</summary>
            <p>
              Press inquiries: <SafeEmailLink email="press@kakunin.ai" />
              <br />
              General: <SafeEmailLink email="ai@kakunin.ai" />
            </p>
          </details>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
