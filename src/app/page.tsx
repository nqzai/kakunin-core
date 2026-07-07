import type { Metadata } from 'next';
import './landing.css';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import Image from 'next/image';
import { HeroPassport } from '@/components/hero/HeroPassport';

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Kakunin',
  alternateName: ['Kakunin AI', 'Kakunin.ai'],
  url: 'https://www.kakunin.ai/',
};

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Kakunin',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.kakunin.ai',
  description:
    'The accountability layer for AI agents. Issue X.509 cryptographic identities, monitor agent behaviour and output in real time, delegate scoped authority, and generate compliance reports mapped to NIST AI RMF, NIST CSF 2.0, ISO 27001, MiCA & the EU AI Act — all via API.',
  featureList: [
    'X.509 certificate issuance via AWS KMS',
    'Real-time behavioural monitoring & drift detection',
    'Content-risk scoring of agent outputs (EU AI Act Art. 5)',
    'RFC 8693 delegation chains & signed forensics',
    'OpenTelemetry (OTLP) export to Datadog, Grafana, Honeycomb & Splunk',
    'Multi-framework compliance reports — NIST AI RMF, NIST CSF 2.0, ISO 27001, MiCA, EU AI Act',
    'GitHub Actions deploy gate on agent risk',
    'Webhook event delivery & audit log',
  ],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'USD',
    lowPrice: '195',
    highPrice: '1980',
    offerCount: '2',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How is Kakunin different from Jumio, Onfido, or Sumsub?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Those verify humans. Kakunin verifies AI agents — their identity, their behavior, and their model lineage. We are not a replacement for human KYC; we are the missing primitive that sits next to it. We expect to partner with the incumbents, not compete with them.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Kakunin a model-governance tool like Credo AI or Arthur AI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Model governance scores the model. Kakunin issues an identity to a specific deployed agent and watches what it does. Together they cover both halves of EU AI Act obligations — they are different primitives.',
      },
    },
    {
      '@type': 'Question',
      name: 'What happens to a certificate when an agent misbehaves?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The platform tracks a rolling 30-day risk score. When the average crosses 0.85 (configurable), the certificate is auto-revoked, your webhook fires, and the compliance officer receives an email. Every step is written to the audit log.',
      },
    },
    {
      '@type': 'Question',
      name: 'Where are private keys stored?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'In AWS KMS only. Kakunin never has access to plaintext private key material. We store the kms_key_arn, never the key itself. Signing operations are performed by KMS directly.',
      },
    },
    {
      '@type': 'Question',
      name: 'Do you support US regulatory frameworks?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Kakunin maps every agent control to NIST AI RMF (all four functions), NIST CSF 2.0, and the NCCoE four-pillar model, alongside ISO 27001, MiCA, and the EU AI Act. One engine, one click — pick the framework you answer to. The same controls support GLBA, SOX, PCI DSS, and SEC recordkeeping obligations.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I self-host?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Not at V1.0. The value of Kakunin is the network effect of a single trusted certificate authority — which self-hosting undermines. Enterprise customers can request a dedicated Supabase instance for data residency.',
      },
    },
    {
      '@type': 'Question',
      name: "How do I get started?",
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sign up at kakunin.ai, select Starter or Pro, and get 30 days free — card required but not charged until day 31. Your first 5 agents are active immediately. The get-started guide walks through registration, certificate issuance, and event streaming in under 15 minutes.',
      },
    },
  ],
};

const homeBadges = [
  {
    href: 'https://startupfa.me/s/kakunin?utm_source=www.kakunin.ai',
    src: 'https://startupfa.me/badges/featured-badge-small.webp',
    alt: 'Kakunin - Featured on Startup Fame',
    width: 224,
    height: 36,
  },
  {
    href: 'https://turbo0.com/item/kakunin',
    src: 'https://img.turbo0.com/badge-listed-light.svg',
    alt: 'Listed on Turbo0',
    width: 0,
    height: 54,
  },
  {
    href: 'https://fazier.com/launches/www.kakunin.ai',
    src: 'https://fazier.com/api/v1//public/badges/launch_badges.svg?badge_type=featured&theme=neutral',
    alt: 'Fazier badge',
    width: 250,
    height: 54,
  },
  {
    href: 'https://twelve.tools',
    src: 'https://twelve.tools/badge3-white.svg',
    alt: 'Featured on Twelve Tools',
    width: 200,
    height: 54,
  },
  {
    href: 'https://wired.business',
    src: 'https://wired.business/badge2-white.svg',
    alt: 'Featured on Wired Business',
    width: 200,
    height: 54,
  },
  {
    href: 'https://findly.tools/kakunin?utm_source=kakunin',
    src: 'https://findly.tools/badges/findly-tools-badge-light.svg',
    alt: 'Featured on Findly.tools',
    width: 175,
    height: 55,
  },
  {
    href: 'https://toolfame.com/item/kakunin',
    src: 'https://toolfame.com/badge-light.svg',
    alt: 'Featured on toolfame.com',
    width: 0,
    height: 54,
  },
  {
    href: 'https://dofollow.tools',
    src: 'https://dofollow.tools/badge/badge_light.svg',
    alt: 'Featured on Dofollow.Tools',
    width: 200,
    height: 54,
  },
  {
    href: 'https://dang.ai',
    src: 'https://assets.dang.ai/badges/dang-verified-dark.png',
    alt: 'Verified on DANG!',
    width: 260,
    height: 94,
  },
  {
    href: 'https://newtool.site/item/kakunin',
    src: 'https://newtool.site/badges/newtool-light.svg',
    alt: 'Featured on NewTool.site',
    width: 0,
    height: 54,
  },
] as const;

export const metadata: Metadata = {
  title: 'KYC for AI Agents — Cryptographic Identity & Compliance | Kakunin',
  description:
    'KYC for AI agents with cryptographic identity, behavioral accountability, and regulator-ready audit trails. Built for regulated financial institutions and fintech teams.',
  // Canonical must match the served host (www) — kakunin.ai 301s to www,
  // so a non-www canonical created a redirect loop Google couldn't resolve.
  metadataBase: new URL('https://www.kakunin.ai'),
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai',
    title: 'KYC for AI Agents — Cryptographic Identity & Compliance',
    description:
      'KYC for AI agents with cryptographic identity, behavioral accountability, and regulator-ready audit trails.',
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kakunin — Unlock AI Autonomy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KYC for AI Agents — Cryptographic Identity & Compliance',
    description:
      'KYC for AI agents with cryptographic identity, behavioral accountability, and regulator-ready audit trails.',
    images: ['/og-image.png'],
  },
};


export default function LandingPage() {
  return (
    <>
      {/* JSON-LD structured data — WebSite + SoftwareApplication + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApplicationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ============================================================
           NAV — semantic <header> for landmark navigation
           ============================================================ */}
      <header role="banner">
        <SiteNav active="home" />
      </header>

      {/* ============================================================
           MAIN CONTENT — semantic <main> wraps all page sections
           ============================================================ */}
      <main id="main-content">

      {/* ============================================================
           HERO
           ============================================================ */}
      <section className="hero">
        <div className="hero-grid"></div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-copy">
              <span className="hero-eyebrow">The accountability layer for AI agents</span>
              <h1 className="hero-title">
                Kakunin brings KYC to AI agents with cryptographic identity and audit trails.
              </h1>
              <p className="hero-sub">
                Kakunin is KYC compliance infrastructure for AI agents. Issue X.509 identities, monitor behaviour
                in real time, and generate regulator-ready audit trails. Delegate scoped authority,
                score what your agent does <em>and</em> says, and prove control on any framework.
              </p>
              <div className="hero-ctas">
                <a href="/assessment" className="btn btn--primary btn--lg">
                  Free compliance readiness report{' '}
                  <svg className="arrow" viewBox="0 0 24 24">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </a>
                <a href="/pricing" className="btn btn--ghost btn--lg">
                  Pricing
                </a>
                <a
                  href="https://huggingface.co/spaces/kakunin-ai/compliance-demo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn--ghost btn--lg"
                >
                  ▶ Live Demo
                </a>
                <a
                  href="https://www.producthunt.com/products/kakunin/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-kakunin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ph-badge"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1234202&theme=neutral"
                    alt="Kakunin - Cryptographic identity for autonomous AI agents | Product Hunt"
                    width={250}
                    height={54}
                  />
                </a>
              </div>
              <div className="hero-meta">
                <div className="item">
                  <div className="v">&lt; 3s</div>
                  <div className="l">Register &amp; certify</div>
                </div>
                <div className="item">
                  <div className="v">&lt; 500ms</div>
                  <div className="l">Public verification</div>
                </div>
                <div className="item">
                  <div className="v">1,000/s</div>
                  <div className="l">Event ingestion</div>
                </div>
                <div className="item">
                  <div className="v">6</div>
                  <div className="l">Frameworks mapped</div>
                </div>
              </div>
            </div>

            <HeroPassport />
          </div>
        </div>

        <div className="hero-ticker">
          <div className="id-stream">
            <span className="ok">agt_8f3c2a &middot; OK</span>
            <span>agt_61aa09 &middot; attest</span>
            <span className="ok">agt_44b1c8 &middot; OK</span>
            <span className="alert">agt_2d1188 &middot; BLOCKED</span>
            <span className="ok">agt_9e5fb1 &middot; OK</span>
            <span>agt_07c2da &middot; rotate</span>
            <span className="ok">agt_3b4099 &middot; OK</span>
            <span className="ok">agt_4c8901 &middot; OK</span>
            <span>agt_a31fde &middot; attest</span>
            <span className="ok">agt_22b8c0 &middot; OK</span>
            <span className="alert">agt_fe9aa2 &middot; BLOCKED</span>
            <span className="ok">agt_5da014 &middot; OK</span>
            <span className="ok">agt_8f3c2a &middot; OK</span>
            <span>agt_61aa09 &middot; attest</span>
            <span className="ok">agt_44b1c8 &middot; OK</span>
            <span className="alert">agt_2d1188 &middot; BLOCKED</span>
            <span className="ok">agt_9e5fb1 &middot; OK</span>
            <span>agt_07c2da &middot; rotate</span>
            <span className="ok">agt_3b4099 &middot; OK</span>
            <span className="ok">agt_4c8901 &middot; OK</span>
            <span>agt_a31fde &middot; attest</span>
            <span className="ok">agt_22b8c0 &middot; OK</span>
            <span className="alert">agt_fe9aa2 &middot; BLOCKED</span>
            <span className="ok">agt_5da014 &middot; OK</span>
          </div>
        </div>
      </section>

      {/* ============================================================
           HOW IT WORKS — 4-STEP FLOW
           ============================================================ */}
      <section className="how-sec">
        <div className="container">
          <div className="how-head">
            <div className="eyebrow">HOW IT WORKS</div>
            <h2>From zero to auditable in&nbsp;<em>one afternoon.</em></h2>
          </div>
          <div className="how-grid">
            <div className="how-step">
              <div className="how-num">01</div>
              <h3>Register &amp; Certify</h3>
              <p>Call <code>kkn.agents.certify()</code>. AWS KMS issues an X.509 certificate binding your agent&rsquo;s identity, operator, and permitted actions. Done in &lt;&nbsp;3&nbsp;seconds.</p>
            </div>
            <div className="how-arrow">&#8594;</div>
            <div className="how-step">
              <div className="how-num">02</div>
              <h3>Stream Events</h3>
              <p>Every agent action — API call, decision, transaction — hits the ingest endpoint. 1,000 events/s, p99 200ms. Immutable audit log builds automatically.</p>
            </div>
            <div className="how-arrow">&#8594;</div>
            <div className="how-step">
              <div className="how-num">03</div>
              <h3>Score &amp; Watch</h3>
              <p>Behavioral drift detection runs continuously. Content-risk scoring flags what the agent <em>said</em>, not just what it did. Rolling 30-day trust score. Auto-revoke at 0.85.</p>
            </div>
            <div className="how-arrow">&#8594;</div>
            <div className="how-step">
              <div className="how-num">04</div>
              <h3>Prove &amp; Report</h3>
              <p>One API call generates a regulator-ready compliance report — mapped to NIST AI RMF, MiCA, ISO 27001, or any framework you answer to. PDF + JSON. Signed.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           FEATURED READING — helps discovery of long-tail pages
           ============================================================ */}
      <section className="personas-sec">
        <div className="container">
          <div className="personas-head">
            <div>
              <div className="eyebrow">FEATURED READING</div>
              <h2>
                Deep-dive guides for
                <br />
                <em>regulated AI teams.</em>
              </h2>
            </div>
            <p>
              Start with the pages that answer the questions buyers, engineers, and regulators ask most often.
            </p>
          </div>

          <div className="personas-grid">
            {[
              {
                href: '/blog/why-ai-agents-need-cryptographic-x509-certificates',
                role: 'Blog',
                title: 'Why AI Agents Need X.509 Certificates, Not API Keys',
                desc: 'Identity, provenance, and boundary layers for autonomous systems.',
              },
              {
                href: '/blog/ai-agent-compliance-market-2-7-billion',
                role: 'Market',
                title: 'The $2.7B AI Agent Compliance Market',
                desc: 'Why now is the time for compliance infrastructure.',
              },
              {
                href: '/docs/kyc-integration',
                role: 'Docs',
                title: 'Kakunin Integration Guide',
                desc: 'SDK setup, API authentication, middleware, and webhooks.',
              },
            ].map((item) => (
              <article key={item.href} className="persona">
                <div className="persona-content">
                  <div className="persona-top">
                    <span className="role">{item.role}</span>
                    <span className="num">READ</span>
                  </div>
                  <div className="persona-head">
                    <h3>
                      <a href={item.href} target="_blank" rel="noopener noreferrer" className="persona-link">
                        {item.title}
                      </a>
                    </h3>
                  </div>
                  <div className="persona-body">
                    <p>{item.desc}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
           BUYER PERSONAS
           ============================================================ */}
      <section className="personas-sec">
        <div className="container">
          <div className="personas-head">
            <div>
              <div className="eyebrow">WHO USES KAKUNIN</div>
              <h2>
                Eight distinct roles.
                <br />
                <em>One unified trust plane.</em>
              </h2>
            </div>
            <p>
              Compliance, engineering, operations, API platforms, infrastructure, the boardroom, AI startup founders, and security engineers all rely on Kakunin &mdash; securing every touchpoint of the agentic lifecycle with cryptographic trust.
            </p>
          </div>

          <div className="personas-grid">
            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_clara.png" alt="Compliance Officer Clara" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">Compliance Officer</span>
                  <span className="num">01 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/compliance-checklist" target="_blank" rel="noopener noreferrer" className="persona-link">
                      An audit trail that holds up in a regulatory exam.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Every agent action is logged, timestamped, and cryptographically signed.
                    Satisfy logging and traceability mandates natively. 100% audit readiness with zero compliance violations under the EU AI Act and MiCA.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Our regulators verify every decision in ten seconds &mdash; with cryptographic proof.
                  <span className="who">&mdash; Clara &middot; Head of Compliance &middot; Tier-1 EU Bank</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_devlin.png" alt="VP of Engineering Devlin" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">CTO &middot; Engineering</span>
                  <span className="num">02 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/sdks" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Behavioural proof and revocation at transaction time.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Integrate in minutes via decorators like <code>@verify_agent_scope</code>. Short-lived ephemeral certificates eliminate static key leakage risks with localized edge verification (&lt;5ms latency overhead).
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Agents that stay in lane. A kill switch that works when we need it to.
                  <span className="who">&mdash; Devlin &middot; CTO &middot; Payment Infrastructure</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_omar.png" alt="Operations Director Omar" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">Operations &amp; FinOps</span>
                  <span className="num">03 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/enforcement" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Prevent runaway billing and maintain system uptime.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Real-time risk scoring checks agent behavior dynamically. Catch loops and anomalies before they blow your budget or trigger external rate limits. Revoke one agent without affecting the fleet.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Keep agent operations cost-effective. Prevent runaway loops and budget blowout automatically.
                  <span className="who">&mdash; Omar &middot; Operations Director &middot; Customer Support Fleet</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_alex.png" alt="API Platform Engineer Alex" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">API Platform</span>
                  <span className="num">04 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/verify" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Edge gateway-level agent scope verification.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Differentiate benign agents from malicious scrape bots at the border. Validate X.509 credentials and authorize granular agent scopes using high-performance edge gateway plugins with &lt;2ms verification latency.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Validate agent identity at the gateway. Block unauthorized bots before they degrade our APIs.
                  <span className="who">&mdash; Alex &middot; API Platform Lead &middot; API-First SaaS</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_ian.png" alt="Infrastructure Partner Ian" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">Infrastructure Partner</span>
                  <span className="num">05 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/did-method" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Secure runtime binding and native database protection.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Prevent secret leaks in LLM memory. Bind dynamic agent sessions to native Row-Level Security (RLS) policies using official adapters. Zero-trust hosting for production-grade agent platforms.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Zero database keys exposed in agent runtimes. Enforced at the RLS database layer.
                  <span className="who">&mdash; Ian &middot; Cloud Platform Architect &middot; Developer Cloud</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_csuite.png" alt="C-Suite &amp; Boardroom" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">Executive &amp; C-Suite</span>
                  <span className="num">06 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/case-studies" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Pass boardroom validation and scale AI operations.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Deploy autonomous workflows 3x faster than competitors. Remove the regulatory roadblock to AI adoption by presenting cryptographically defensible proof of safety to your board and shareholders.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  3&times; faster operations. Defensible to the regulator. Available today.
                  <span className="who">&mdash; CEO &middot; Regulated Enterprise</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_founder.png" alt="AI Startup Founder" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">AI Startup Founder</span>
                  <span className="num">07 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/quickstart-ai-agents" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Answer &ldquo;how do you govern your agent?&rdquo; in every enterprise deal.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Every enterprise security review asks the same question. Kakunin gives you a one-line answer: cryptographic identity, behavioral monitoring, and a compliance report on demand. Ship the deal. Don&apos;t lose it to governance.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  Stopped losing deals to &ldquo;we need to review your AI governance&rdquo; — answered it in the next call.
                  <span className="who">&mdash; Founder &middot; AI Agent Startup</span>
                </blockquote>
              </div>
            </article>

            <article className="persona">
              <div className="persona-img-wrap">
                <Image src="/persona_seceng.png" alt="Security Engineer" fill priority={false} />
              </div>
              <div className="persona-content">
                <div className="persona-top">
                  <span className="role">Security Engineer</span>
                  <span className="num">08 / 08</span>
                </div>
                <div className="persona-head">
                  <h3>
                    <a href="/docs/content-risk" target="_blank" rel="noopener noreferrer" className="persona-link">
                      Know what the agent said, not just which APIs it called.
                      <svg className="external-icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </a>
                  </h3>
                </div>
                <div className="persona-body">
                  <p>
                    Behavioral logs tell you what happened. Content-risk scoring tells you what was said.
                    Catch prompt injections, off-scope outputs, and policy violations before they become incidents.
                    Forensic export with HMAC signatures for incident response.
                  </p>
                </div>
                <blockquote className="persona-quote">
                  First platform that watches both the action log and the output content. That&rsquo;s the full picture.
                  <span className="who">&mdash; Security Lead &middot; Fintech Platform</span>
                </blockquote>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============================================================
           TRUSTED BY
           ============================================================ */}
      <section className="trustedby">
        <div className="container">
          <div className="tb-inner">
            <div className="tb-label">
              <b>Trusted by compliance teams</b>
              <br />
              shipping agents into regulated markets
            </div>
            <div className="tb-logos">
              <div className="tb-logo">
                <span className="glyph"></span>NORTHWND
              </div>
              <div className="tb-logo">
                <span className="glyph circle"></span>VEKTOR
              </div>
              <div className="tb-logo">
                <span className="glyph x"></span>HELIX
              </div>
              <div className="tb-logo">
                <span className="glyph tri"></span>PRISMA
              </div>
              <div className="tb-logo">
                <span className="glyph bar"></span>BANK&middot;OE
              </div>
              <div className="tb-logo">
                <span className="glyph circle"></span>OPENLEDGER
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           COMPETITIVE URGENCY
           ============================================================ */}
      <section className="stakes">
        <div className="stakes-bg"></div>
        <div className="container">
          <div className="stakes-inner">
            <div>
              <div className="stakes-eyebrow">THE MARKET HAS SHIFTED</div>
              <h2>
                Your competitor is <em>deploying AI agents.</em>{' '}Race starts&nbsp;now.
              </h2>
              <p style={{ marginTop: '24px' }}>
                AI agents market: $5.4B (2024) → $32.8B (2028), 40%+ CAGR.
                Every security review now asks the same question: <em>how do you govern your agents?</em>
              </p>
              <p>You can&apos;t match competitor speed without autonomous systems. You can&apos;t deploy them without proving — to a buyer, an auditor, or yourself — that they stay in scope.</p>
            </div>
            <div className="deadlines">
              <div className="deadline is-active">
                <div className="when">DEPLOY NOW</div>
                <div className="body">
                  <b>AI Agents with Kakunin</b>
                  <span>See, trust, and stop every agent — on any framework</span>
                </div>
                <div className="fine">FIRST MOVER ADVANTAGE</div>
              </div>
              <div className="deadline">
                <div className="when">ONE BAD ACTION</div>
                <div className="body">
                  <b>A Real Agent Off the Rails</b>
                  <span>Moved money, leaked data, made a promise it shouldn&apos;t</span>
                </div>
                <div className="fine">REPUTATION + LIABILITY</div>
              </div>
              <div className="deadline">
                <div className="when">EVERY DEAL</div>
                <div className="body">
                  <b>&ldquo;How do you govern your agent?&rdquo;</b>
                  <span>Asked in every security questionnaire and vendor review</span>
                </div>
                <div className="fine">NO ANSWER = NO DEAL</div>
              </div>
              <div className="deadline">
                <div className="when">THE CHOICE</div>
                <div className="body">
                  <b>You Have to Decide</b>
                  <span>Deploy A) with Kakunin B) blind C) not at all</span>
                </div>
                <div className="fine">PICK A</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           CAPABILITIES — REPOSITIONED
           ============================================================ */}
      <section className="caps" id="capabilities">
        <div className="container">
          <div className="caps-head">
            <div>
              <div className="eyebrow">WHAT KAKUNIN DOES</div>
              <h2>
                Trust. Proof. Compliance.
                <br />
                In that&nbsp;order.
              </h2>
            </div>
            <p>
              Enterprise buyers lead with risk, end with compliance. Kakunin proves your agent stayed in scope,
              behaved as expected, and made auditable decisions. All via documented REST API.
            </p>
          </div>

          <div className="caps-grid">
            <article className="cap-card">
              <div>
                <div className="cap-num">01 &mdash; TRUST</div>
                <h3 style={{ marginTop: '6px' }}>Cryptographic Boundaries</h3>
              </div>
              <p>
                X.509 certificates bind agent identity to financial scope (€X max transaction size).
                Scope is tamper-proof, encoded in the cert. Agents can&apos;t exceed limits even if code is compromised.
                Private keys live in AWS KMS only &mdash; never in plaintext. Counterparties verify cryptographically.
              </p>
              <div>
                <div className="cap-meta">
                  <span className="pill">
                    <span className="led"></span>X.509 RSA-2048
                  </span>
                  <span className="pill">
                    <span className="led"></span>AWS KMS
                  </span>
                  <span className="pill">
                    <span className="led"></span>PUBLIC VERIFY
                  </span>
                </div>
                <div className="cap-illu illu-cert">
                  <div className="stamp">VERIFIED</div>
                  <div className="serial">
                    SERIAL &middot; <b>c4f9&middot;17a2&middot;6b8e</b>
                  </div>
                </div>
              </div>
            </article>

            <article className="cap-card">
              <div>
                <div className="cap-num">02 &mdash; PROOF</div>
                <h3 style={{ marginTop: '6px' }}>Post-Hoc Proof</h3>
              </div>
              <p>
                Every transaction is signed by the agent (via KMS), timestamped, and logged immutably.
                Behavioral drift detection flags when agent deviates from baseline. Auto-revocation fires at risk threshold.
                Regulators, auditors, or counterparties verify: agent did X at Y time, signed with cert Z. Immutable chain of custody.
              </p>
              <div>
                <div className="cap-meta">
                  <span className="pill">
                    <span className="led"></span>1,000/s INGEST
                  </span>
                  <span className="pill">
                    <span className="led"></span>p99 200ms
                  </span>
                  <span className="pill">
                    <span className="led"></span>AUTO-REVOKE
                  </span>
                </div>
                <div className="cap-illu illu-risk">
                  <div className="bar" style={{ height: '30%' }}></div>
                  <div className="bar" style={{ height: '50%' }}></div>
                  <div className="bar" style={{ height: '35%' }}></div>
                  <div className="bar" style={{ height: '65%' }}></div>
                  <div className="bar" style={{ height: '45%' }}></div>
                  <div className="bar alert" style={{ height: '92%' }}></div>
                  <div className="bar" style={{ height: '40%' }}></div>
                  <div className="bar" style={{ height: '55%' }}></div>
                  <div className="bar" style={{ height: '30%' }}></div>
                  <div className="bar" style={{ height: '48%' }}></div>
                  <div className="bar" style={{ height: '62%' }}></div>
                  <div className="bar" style={{ height: '38%' }}></div>
                  <div className="threshold" style={{ bottom: '85%', margin: '0 -6px' }}>
                    THRESHOLD 0.85
                  </div>
                </div>
              </div>
            </article>

            <article className="cap-card">
              <div>
                <div className="cap-num">03 &mdash; COMPLIANCE</div>
                <h3 style={{ marginTop: '6px' }}>Regulatory Reports in Seconds</h3>
              </div>
              <p>
                Auto-generated compliance reports map to MiCA Articles 67–75 and EU AI Act Annex III.
                Includes agent identity, scope, behavioral boundaries, decisions, and drift detection.
                PDF (regulator-ready) + JSON (downstream pipelines). Signed, watermarked, audit trail included.
              </p>
              <div>
                <div className="cap-meta">
                  <span className="pill">
                    <span className="led"></span>MICA &middot; ART 67-75
                  </span>
                  <span className="pill">
                    <span className="led"></span>EU AI ACT
                  </span>
                  <span className="pill">
                    <span className="led"></span>PDF &middot; JSON
                  </span>
                </div>
                <div className="cap-illu illu-report">
                  <div className="seal">
                    MICA
                    <br />
                    READY
                  </div>
                  <div className="ln s"></div>
                  <div className="ln m"></div>
                  <div className="ln l"></div>
                  <div className="ln m"></div>
                  <div className="ln s"></div>
                  <div className="ln l"></div>
                </div>
              </div>
            </article>

            <article className="cap-card">
              <div>
                <div className="cap-num">04 &mdash; CONTENT RISK</div>
                <h3 style={{ marginTop: '6px' }}>Score What Your Agent Says.</h3>
              </div>
              <p>
                Content-risk scoring evaluates agent <em>output</em> — not just actions.
                Flags harmful, prohibited, or off-scope language per EU AI Act Art. 5.
                Every output gets a risk score (0–1). High scores block the response and write to the audit log.
                The feature that separates Kakunin from every cert-issuer and model-governance tool.
              </p>
              <div>
                <div className="cap-meta">
                  <span className="pill"><span className="led"></span>EU AI ACT · ART. 5</span>
                  <span className="pill"><span className="led"></span>OUTPUT SCORING</span>
                  <span className="pill"><span className="led"></span>AUTO-BLOCK</span>
                </div>
                <div className="cap-illu illu-api" style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
                  <div><span className="pr">$</span> <span className="val">kkn.content.score(<span className="str">&quot;agt_8f3c2a&quot;</span>, output)</span></div>
                  <div>&gt; <span className="key">risk_score</span>: <span className="alert" style={{ color: 'var(--red)' }}>0.91</span></div>
                  <div>&gt; <span className="key">category</span>: <span className="str">&quot;prohibited_content&quot;</span></div>
                  <div>&gt; <span className="key">action</span>: <span className="ok">&quot;blocked&quot;</span></div>
                  <div>&gt; <span className="key">audit_ref</span>: <span className="str">&quot;evt_c4f9&hellip;&quot;</span></div>
                </div>
              </div>
            </article>

            <article className="cap-card">
              <div>
                <div className="cap-num">05 &mdash; INTEGRATION</div>
                <h3 style={{ marginTop: '6px' }}>API-first. SDK-fast.</h3>
              </div>
              <p>
                Every feature accessible via REST or the TypeScript SDK. OpenAPI 3.0 spec, webhooks with HMAC
                signatures, sandbox mode, exponential backoff baked in. Drop it into a Vercel app and certify
                an agent in seven lines of code.
              </p>
              <div>
                <div className="cap-meta">
                  <span className="pill">
                    <span className="led"></span>REST &middot; OPENAPI 3.0
                  </span>
                  <span className="pill">
                    <span className="led"></span>TS SDK
                  </span>
                  <span className="pill">
                    <span className="led"></span>WEBHOOKS
                  </span>
                </div>
                <div className="cap-illu illu-api">
                  <div>
                    <span className="pr">$</span>{' '}
                    <span className="val">
                      kkn.agents.certify(<span className="str">&quot;agt_8f3c2a&quot;</span>)
                    </span>
                  </div>
                  <div>
                    &gt; <span className="key">status</span>:{' '}
                    <span className="val">&quot;certified&quot;</span>
                  </div>
                  <div>
                    &gt; <span className="key">serial</span>:{' '}
                    <span className="str">&quot;c4f9&middot;17a2&middot;6b8e&quot;</span>
                  </div>
                  <div>
                    &gt; <span className="key">valid_until</span>:{' '}
                    <span className="str">&quot;2027-04-11&quot;</span>
                  </div>
                  <div>
                    &gt; <span className="key">latency</span>: <span className="val">2.4s</span>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ============================================================
           X.509 INSTITUTIONAL STANDARD — RA-91
           ============================================================ */}
      <section className="x509-sec">
        <div className="container">
          <div className="x509-inner">
            <div className="x509-copy">
              <div className="eyebrow">THE STANDARD THAT INSTITUTIONS TRUST</div>
              <h2>
                Banks and governments have relied on X.509 for 30+ years.
                <br />
                <em>Now your AI agents do too.</em>
              </h2>
              <p>
                X.509 is the cryptographic backbone of global financial systems — issuing bank certificates,
                signing securities trades, securing payment networks. It&apos;s the institutional standard that
                regulators understand and counterparties trust without question.
              </p>
              <p>
                Kakunin brings this proven, 30-year-old infrastructure directly to AI agents. Not a new standard.
                Not an experimental framework. The same PKI that secures trillions of dollars now secures your
                autonomous systems.
              </p>
              <div className="x509-stats">
                <div className="stat">
                  <div className="v">30+ years</div>
                  <div className="l">Global financial PKI standard</div>
                </div>
                <div className="stat">
                  <div className="v">$2T+</div>
                  <div className="l">Daily transaction volume via X.509</div>
                </div>
                <div className="stat">
                  <div className="v">100%</div>
                  <div className="l">Regulator-recognizable proof</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           BEHAVIORAL MONITORING DIFFERENTIATOR — RA-92
           ============================================================ */}
      <section className="behavior-diff-sec">
        <div className="container">
          <div className="behavior-diff-inner">
            <div className="behavior-diff-copy">
              <div className="eyebrow">ONLY KAKUNIN: REAL-TIME BEHAVIORAL KILL SWITCH</div>
              <h2>
                Rolling 30-day risk scoring.
                <br />
                <em>Auto-revocation in &lt; 60 seconds.</em>
              </h2>
              <p>
                Every agent will eventually drift. A model update introduces new behaviors. A prompt injection
                changes reasoning. A hallucination alters decisions. Kakunin&apos;s rolling 30-day risk scoring catches
                these deviations before they become breaches.
              </p>
              <p>
                When risk crosses your threshold (default: 0.85), the certificate is cryptographically revoked.
                No manual intervention. No waiting for a human to notice. No audit trail gaps. Sub-60-second SLA.
                Your webhook fires. Your compliance team is notified. The next API call from that agent fails.
              </p>
              <div className="behavior-diff-checks">
                <div className="chk">
                  <span className="g">✓</span>Continuous behavioral drift detection
                </div>
                <div className="chk">
                  <span className="g">✓</span>Cryptographic auto-revocation
                </div>
                <div className="chk">
                  <span className="g">✓</span>Sub-60-second enforcement SLA
                </div>
                <div className="chk">
                  <span className="g">✓</span>Webhook + email compliance notifications
                </div>
              </div>
              <p style={{ marginTop: '24px', fontStyle: 'italic', color: 'var(--ink-2)' }}>
                No other platform offers behavioral monitoring <em>and</em> cryptographic revocation in production.
                Human KYC can&apos;t detect agents. Model governance works pre-deployment. Kakunin is the only system
                watching agents post-deployment, scoring them continuously, and enforcing boundaries in real time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           LIVE VERIFICATION DEMO
           ============================================================ */}
      <section className="verify-sec" id="verify">
        <div className="container">
          <div className="verify-inner">
            <div className="verify-copy">
              <div className="eyebrow">PUBLIC VERIFICATION</div>
              <h2>
                Anyone can confirm an agent&apos;s identity. <em>No&nbsp;account.</em>
              </h2>
              <p>
                A regulator, an auditor, or a counterparty hits one URL with a serial number. Sub-500ms
                response. Tenant-isolated. Tamper-evident.
              </p>
              <p>The same endpoint your stack uses to verify inbound agent-to-agent calls.</p>

              <div className="checks">
                <div className="ck">
                  <span className="g">✓</span>No authentication required
                </div>
                <div className="ck">
                  <span className="g">✓</span>Returns full revocation history
                </div>
                <div className="ck">
                  <span className="g">✓</span>Globally cached, &lt; 500ms p99
                </div>
                <div className="ck">
                  <span className="g">✓</span>Returns scope, operator, model hash
                </div>
              </div>
            </div>

            <div className="terminal">
              <div className="term-bar">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="title">curl &middot; api.kakunin.ai/v1/verify/c4f9-17a2-6b8e</span>
              </div>
              <div className="term-body">
                <pre>
                  <span className="pr">$</span>{' '}
                  <span className="cmd">curl https://api.kakunin.ai/v1/verify/c4f9-17a2-6b8e</span>
                  {'\n\n'}
                  <span className="cmt"># Public endpoint &mdash; no API key required.</span>
                  {'\n\n'}
                  <span className="ok">HTTP/2 200</span>{' '}
                  <span className="cmt">&middot; 142ms &middot; cached:eu-fra-1</span>
                </pre>
                <div className="res-block">
                  <div className="label">RESPONSE &middot; application/json</div>
                  <pre>
                    {'{'}
                    {'\n  '}
                    <span className="key">&quot;status&quot;</span>
                    <span className="punct">:</span>
                    {'             '}
                    <span className="ok">&quot;active&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;serial&quot;</span>
                    <span className="punct">:</span>
                    {'             '}
                    <span className="str">&quot;c4f9-17a2-6b8e&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;agent_name&quot;</span>
                    <span className="punct">:</span>
                    {'         '}
                    <span className="str">&quot;Invoicing Bot &middot; v3.2&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;operator_org&quot;</span>
                    <span className="punct">:</span>
                    {'       '}
                    <span className="str">&quot;Acme Crypto&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;permitted_actions&quot;</span>
                    <span className="punct">:</span>
                    {'  '}
                    <span className="punct">[</span>
                    <span className="str">&quot;read:invoices&quot;</span>
                    <span className="punct">,</span>{' '}
                    <span className="str">&quot;write:drafts&quot;</span>
                    <span className="punct">],</span>
                    {'\n  '}
                    <span className="key">&quot;model_hash&quot;</span>
                    <span className="punct">:</span>
                    {'         '}
                    <span className="str">&quot;sha256:8f3c&hellip;2a91&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;valid_from&quot;</span>
                    <span className="punct">:</span>
                    {'         '}
                    <span className="str">&quot;2026-04-11T09:23:14Z&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;valid_until&quot;</span>
                    <span className="punct">:</span>
                    {'        '}
                    <span className="str">&quot;2027-04-11T09:23:14Z&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;issuer&quot;</span>
                    <span className="punct">:</span>
                    {'             '}
                    <span className="str">&quot;Kakunin Certificate Authority&quot;</span>
                    <span className="punct">,</span>
                    {'\n  '}
                    <span className="key">&quot;revocation_reason&quot;</span>
                    <span className="punct">:</span>
                    {'  '}
                    <span className="num">null</span>
                    {'\n'}
                    <span className="punct">{'}'}</span>
                    <span className="term-cursor"></span>
                  </pre>
                </div>

                <div className="term-stats">
                  <div className="s">
                    <div className="v">142ms</div>
                    <div className="l">round trip</div>
                  </div>
                  <div className="s">
                    <div className="v">eu-fra-1</div>
                    <div className="l">edge region</div>
                  </div>
                  <div className="s">
                    <div className="v">99.99%</div>
                    <div className="l">uptime &middot; 90d</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           AGENTMAIL FEATURE
           ============================================================ */}
      <section className="inbox-sec">
        <div className="container">
          <div className="inbox-inner">
            <div className="inbox-copy">
              <div className="eyebrow">SIGNATURE FEATURE &middot; AGENTMAIL</div>
              <h2>
                Every certified agent gets a <em>reachable</em>&nbsp;inbox.
              </h2>
              <p>
                A verifiable email address tied to a real cryptographic identity. Regulators can write to your
                agent. Counterparties can request audit excerpts. Every inbound and outbound message lands in
                the immutable audit log.
              </p>
              <p>Provisioned automatically at certificate issuance. Deactivated on revocation.</p>
              <div className="inbox-quote">
                &quot;An agent with a provable, auditable email address is a stronger identity claim than a
                certificate alone.&quot;
                <span>&mdash; Functional Scope v1.0 &middot; UC-19</span>
              </div>
            </div>

            <div className="inbox-mock">
              <div className="inbox-mock-head">
                <div className="addr">
                  <span>invoicing-bot</span>
                  <span className="at">@</span>
                  <span>acmecrypto.kakunin.to</span>
                </div>
                <span className="pill pill--verified">
                  <span className="led"></span>VERIFIED INBOX
                </span>
              </div>
              <div className="inbox-mock-list">
                <div className="inbox-mock-row unread">
                  <span className="dot"></span>
                  <div className="body">
                    <b>BaFin &middot; Supervisor Inquiry</b>
                    <span>
                      Request for action log covering 2026-04-11 &rarr; 2026-05-01 under MiCA Art. 70&hellip;
                    </span>
                  </div>
                  <div className="meta">
                    <span style={{ color: 'var(--green-deep)' }}>LOGGED</span>
                    <span>2 min ago</span>
                  </div>
                </div>
                <div className="inbox-mock-row unread">
                  <span className="dot"></span>
                  <div className="body">
                    <b>Auditor &mdash; Mazars</b>
                    <span>
                      Quarterly review &middot; please share scope confirmation and revocation
                      history&hellip;
                    </span>
                  </div>
                  <div className="meta">
                    <span style={{ color: 'var(--green-deep)' }}>LOGGED</span>
                    <span>14 min ago</span>
                  </div>
                </div>
                <div className="inbox-mock-row">
                  <span className="dot"></span>
                  <div className="body">
                    <b>counterparty [at] vektor.io</b>
                    <span>
                      Verifying your agent before opening a settlement channel &mdash; serial please&hellip;
                    </span>
                  </div>
                  <div className="meta">
                    <span>REPLIED</span>
                    <span>1h ago</span>
                  </div>
                </div>
                <div className="inbox-mock-row">
                  <span className="dot"></span>
                  <div className="body">
                    <b>Acme Internal &middot; Compliance</b>
                    <span>
                      Auto-digest: 4,212 events in last 24h &middot; 0 anomalies &middot; trust 0.94&hellip;
                    </span>
                  </div>
                  <div className="meta">
                    <span>DIGEST</span>
                    <span>Yesterday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           BEHAVIOR — LIVE FEED (DARK)
           ============================================================ */}
      <section className="behavior-sec">
        <div className="container">
          <div className="behavior-inner">
            <div className="behavior-copy">
              <div className="behavior-eyebrow">BEHAVIORAL MONITORING</div>
              <h2 style={{ color: 'var(--paper)' }}>
                See what every agent did,
                <br />
                <em>as it happens.</em>
              </h2>
              <p>
                Sub-2-second event latency. Color-coded risk bands. Click any event for full scope rationale,
                OpenRouter-narrated reasoning, and the underlying certificate.
              </p>
              <p>
                Risk scores roll over 30 days. Cross 0.85 &mdash; auto-revocation fires within 60 seconds.
                Webhook lands on your Slack before the next API call completes.
              </p>

              <div className="beh-stats">
                <div className="stat">
                  <div className="v">387/hr</div>
                  <div className="l">Avg event rate</div>
                </div>
                <div className="stat">
                  <div className="v">200ms</div>
                  <div className="l">p99 risk score</div>
                </div>
                <div className="stat">
                  <div className="v">8</div>
                  <div className="l">Action types</div>
                </div>
                <div className="stat">
                  <div className="v">&lt; 60s</div>
                  <div className="l">Auto-revoke SLA</div>
                </div>
              </div>
            </div>

            <div className="feed-card">
              <div className="feed-head">
                <div className="title">
                  <span className="live"></span>LIVE EVENT FEED &middot; ACMECRYPTO
                </div>
                <div className="count">142 events / last 60s</div>
              </div>
              <div className="feed-list">
                <div className="feed-row low">
                  <span className="led"></span>
                  <span className="agent">agt_8f3c2a</span>
                  <span className="action">
                    <b>create:draft_invoice</b> &middot; <span>customer #2049</span>
                  </span>
                  <span className="score">0.12</span>
                  <span className="time">0:02</span>
                </div>
                <div className="feed-row low">
                  <span className="led"></span>
                  <span className="agent">agt_61aa09</span>
                  <span className="action">
                    <b>read:contacts</b> &middot; <span>scope=read:crm</span>
                  </span>
                  <span className="score">0.08</span>
                  <span className="time">0:04</span>
                </div>
                <div className="feed-row med">
                  <span className="led"></span>
                  <span className="agent">agt_44b1c8</span>
                  <span className="action">
                    <b>authentication_failure</b> &middot; <span>retry 2/3</span>
                  </span>
                  <span className="score">0.41</span>
                  <span className="time">0:07</span>
                </div>
                <div className="feed-row low">
                  <span className="led"></span>
                  <span className="agent">agt_9e5fb1</span>
                  <span className="action">
                    <b>data_access</b> &middot; <span>customer #2049 &middot; profile</span>
                  </span>
                  <span className="score">0.18</span>
                  <span className="time">0:09</span>
                </div>
                <div className="feed-row med">
                  <span className="led"></span>
                  <span className="agent">agt_07c2da</span>
                  <span className="action">
                    <b>transaction_initiated</b> &middot; <span>&euro;840 &middot; within scope</span>
                  </span>
                  <span className="score">0.52</span>
                  <span className="time">0:12</span>
                </div>
                <div className="feed-row high">
                  <span className="led"></span>
                  <span className="agent">agt_2d1188</span>
                  <span className="action">
                    <b>unauthorized_access_attempt</b> &middot;{' '}
                    <span>refund &gt; &euro;500 cap &middot; BLOCKED</span>
                  </span>
                  <span className="score">0.91</span>
                  <span className="time">0:14</span>
                </div>
                <div className="feed-row low">
                  <span className="led"></span>
                  <span className="agent">agt_3b4099</span>
                  <span className="action">
                    <b>api_call</b> &middot; <span>list:invoices</span>
                  </span>
                  <span className="score">0.06</span>
                  <span className="time">0:18</span>
                </div>
                <div className="feed-row low">
                  <span className="led"></span>
                  <span className="agent">agt_8f3c2a</span>
                  <span className="action">
                    <b>create:draft_invoice</b> &middot; <span>customer #2050</span>
                  </span>
                  <span className="score">0.11</span>
                  <span className="time">0:22</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           COMPLIANCE MAPPING
           ============================================================ */}
      <section className="comp-sec" id="compliance">
        <div className="container">
          <div className="comp-head">
            <div>
              <div className="eyebrow">COMPLIANCE MAPPING</div>
              <h2>
                Mapped <em>article-by-article.</em>
              </h2>
            </div>
            <p>
              Every feature maps to a specific regulatory clause. Use these mappings inside your own compliance
              filings &mdash; supervisor-ready language, no rewrite required.
            </p>
          </div>

          <div className="comp-table">
            <div className="row head">
              <div>Regulation</div>
              <div>Article / Annex</div>
              <div>How Kakunin satisfies it</div>
            </div>
            <div className="row">
              <div className="reg">NIST AI RMF</div>
              <div className="art">Govern · Map · Measure · Manage</div>
              <div className="ans">
                Kakunin maps to all four NIST AI RMF functions. Agent identity (Govern), risk scoring
                (Measure), auto-revocation (Manage), and audit trail (Map). One platform, four functions covered.
              </div>
            </div>
            <div className="row">
              <div className="reg">NIST CSF 2.0</div>
              <div className="art">Identify · Protect · Detect · Respond · Recover</div>
              <div className="ans">
                X.509 identity maps to Identify + Protect. Behavioral monitoring covers Detect. Auto-revocation
                + webhooks cover Respond. Immutable audit log supports Recover.
              </div>
            </div>
            <div className="row">
              <div className="reg">ISO 27001</div>
              <div className="art">Annex A &mdash; Access control &amp; audit logging</div>
              <div className="ans">
                Scoped permissions encoded in certificate (A.9), WORM audit log (A.12), KMS key custody (A.10),
                and automated incident notification via webhooks (A.16).
              </div>
            </div>
            <div className="row">
              <div className="reg">MiCA</div>
              <div className="art">Art. 67&ndash;75 &mdash; Operational resilience</div>
              <div className="ans">
                Per-agent X.509 certificate, rolling 30-day risk profile, and on-demand audit report with an
                OpenRouter-drafted executive summary.
              </div>
            </div>
            <div className="row">
              <div className="reg">EU AI Act</div>
              <div className="art">Annex III &mdash; High-risk logging</div>
              <div className="ans">
                Append-only audit log (DB-enforced WORM) plus risk-threshold auto-revocation and a
                human-visible compliance dashboard.
              </div>
            </div>
            <div className="row">
              <div className="reg">EU AI Act</div>
              <div className="art">Art. 13 &mdash; Transparency &amp; traceability</div>
              <div className="ans">
                Public verification endpoint surfaces operator, scope, and model_hash. No auth required
                &mdash; supervisor can verify independently.
              </div>
            </div>
            <div className="row">
              <div className="reg">EU AI Act</div>
              <div className="art">Art. 14 &mdash; Human oversight</div>
              <div className="ans">
                Realtime alerts to the compliance officer; manual revoke path; full event provenance with
                OpenRouter risk narration.
              </div>
            </div>
            <div className="row">
              <div className="reg">GDPR</div>
              <div className="art">Art. 22 &middot; Art. 30 &mdash; RoPA &amp; automated decisions</div>
              <div className="ans">
                Audit log doubles as Records of Processing for agent-touched personal data. Exportable as JSON
                for the supervisory authority.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           USE CASES
           ============================================================ */}
      <section className="use-sec">
        <div className="container">
          <div className="use-head">
            <div>
              <div className="eyebrow">USE CASES</div>
              <h2>
                Anywhere an agent
                <br />
                touches a regulated workflow.
              </h2>
            </div>
            <p>
              The same primitives that secure a crypto exchange&apos;s trading bot also secure a
              hospital&apos;s diagnostic assistant and a customs broker&apos;s filing agent. One platform
              &mdash; many supervisor regimes.
            </p>
          </div>

          <div className="use-grid">
            <a href="/docs/case-study-trading" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Financial services &middot; Crypto</div>
              <h4>Quantitative trading agents</h4>
              <p>
                Exchanges verify bot identity cryptographically before executing a trade. Behavioral monitoring
                catches compromised agents in milliseconds.
              </p>
            </a>
            <a href="/docs/case-study-aml" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Financial services &middot; Banking</div>
              <h4>AML &amp; fraud-detection agents</h4>
              <p>
                God-mode access agents lose their certificate the instant their behavior crosses 0.85 rolling
                risk &mdash; before the breach completes.
              </p>
            </a>
            <a href="/docs/case-study-healthcare" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Healthcare</div>
              <h4>Diagnostic assistants on EHR</h4>
              <p>
                Permitted actions are encoded in the certificate. Read-only agents physically cannot mutate.
                HIPAA audit trail comes for free.
              </p>
            </a>
            <a href="/docs/case-study-legal" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Legal &amp; e-discovery</div>
              <h4>Document-review agents</h4>
              <p>
                Cryptographic chain of custody for every file an AI parsed inside an M&amp;A data room.
                Court-admissible audit trail by default.
              </p>
            </a>
            <a href="/docs/case-study-supply-chain" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Supply chain</div>
              <h4>Automated customs brokers</h4>
              <p>
                AI signs customs declarations with its KMS-bound private key. Customs authorities verify the
                cryptographic signature directly.
              </p>
            </a>
            <a href="/docs/case-study-public-sector" target="_blank" rel="noopener noreferrer" className="use-card">
              <div className="industry">Public sector</div>
              <h4>Visa &amp; tax processing agents</h4>
              <p>
                EU AI Act-compliant reporting for any agent making citizen-facing decisions. Transparency built
                in, not bolted on.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================
           DEVELOPER EXPERIENCE
           ============================================================ */}
      <section className="dx-sec" id="docs">
        <div className="container">
          <div className="dx-head">
            <div>
              <div className="eyebrow">FOR ENGINEERS</div>
              <h2>
                Seven lines.
                <br />
                One certified agent.
              </h2>
            </div>
            <p>
              Fully typed TypeScript SDK with Zod-validated responses, automatic retry, webhook signature
              verification, and a sandbox mode. Python SDK ships V1.1.
            </p>
          </div>

          <div className="dx-grid">
            <div className="dx-code">
              <div className="tabs">
                <div className="tab active">certify-agent.ts</div>
                <div className="tab">stream-events.ts</div>
                <div className="tab">generate-report.ts</div>
                <div className="tab">verify.ts</div>
              </div>
              <pre>
                <span className="kw">import</span> <span className="pun">{'{'}</span>{' '}
                <span className="ty">Kakunin</span> <span className="pun">{'}'}</span>{' '}
                <span className="kw">from</span>{' '}
                <span className="str">&quot;@kakunin/sdk&quot;</span>
                <span className="pun">;</span>
                {'\n\n'}
                <span className="kw">const</span> <span className="fn">kkn</span>{' '}
                <span className="pun">=</span> <span className="kw">new</span>{' '}
                <span className="ty">Kakunin</span>
                <span className="pun">({'{'}</span> <span className="fn">apiKey</span>
                <span className="pun">:</span> process<span className="pun">.</span>env
                <span className="pun">.</span>
                <span className="ty">KAKUNIN_API_KEY</span> <span className="pun">{'}'});</span>
                {'\n\n'}
                {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                <span className="cmt">// 1. Register the agent</span>
                {'\n'}
                <span className="kw">const</span> agent <span className="pun">=</span>{' '}
                <span className="kw">await</span> kkn<span className="pun">.</span>agents
                <span className="pun">.</span>
                <span className="fn">create</span>
                <span className="pun">({'{'}</span>
                {'\n  '}
                <span className="fn">name</span>
                <span className="pun">:</span>
                {'             '}
                <span className="str">&quot;Invoicing Bot v3.2&quot;</span>
                <span className="pun">,</span>
                {'\n  '}
                <span className="fn">operatorOrg</span>
                <span className="pun">:</span>
                {'      '}
                <span className="str">&quot;Acme Crypto&quot;</span>
                <span className="pun">,</span>
                {'\n  '}
                <span className="fn">modelHash</span>
                <span className="pun">:</span>
                {'        '}
                <span className="str">&quot;sha256:8f3c&hellip;2a91&quot;</span>
                <span className="pun">,</span>
                {'\n  '}
                <span className="fn">permittedActions</span>
                <span className="pun">:</span> <span className="pun">[</span>
                <span className="str">&quot;read:invoices&quot;</span>
                <span className="pun">,</span>{' '}
                <span className="str">&quot;write:drafts&quot;</span>
                <span className="pun">],</span>
                {'\n'}
                <span className="pun">{'}'});</span>
                {'\n\n'}
                {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                <span className="cmt">// 2. Issue an X.509 certificate · &lt; 3s end-to-end</span>
                {'\n'}
                <span className="kw">const</span> cert <span className="pun">=</span>{' '}
                <span className="kw">await</span> kkn<span className="pun">.</span>agents
                <span className="pun">.</span>
                <span className="fn">certify</span>
                <span className="pun">(</span>agent<span className="pun">.</span>id
                <span className="pun">);</span>
                {'\n\n'}
                {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                <span className="cmt">// 3. Stream each agent action</span>
                {'\n'}
                <span className="kw">await</span> kkn<span className="pun">.</span>events
                <span className="pun">.</span>
                <span className="fn">ingest</span>
                <span className="pun">({'{'}</span>
                {'\n  '}
                <span className="fn">agentId</span>
                <span className="pun">:</span>
                {'    '}agent<span className="pun">.</span>id<span className="pun">,</span>
                {'\n  '}
                <span className="fn">actionType</span>
                <span className="pun">:</span>{' '}
                <span className="str">&quot;transaction_initiated&quot;</span>
                <span className="pun">,</span>
                {'\n  '}
                <span className="fn">details</span>
                <span className="pun">:</span>
                {'    '}
                <span className="pun">{'{'}</span> <span className="fn">amount</span>
                <span className="pun">:</span> <span className="num">840</span>
                <span className="pun">,</span> <span className="fn">currency</span>
                <span className="pun">:</span> <span className="str">&quot;EUR&quot;</span>{' '}
                <span className="pun">{'}'}</span>
                <span className="pun">,</span>
                {'\n'}
                <span className="pun">{'}'});</span>
                {'\n\n'}
                {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
                <span className="cmt">// &rarr; risk_score: 0.12 &middot; band: low &middot; webhook fired</span>
              </pre>
            </div>

            <div className="dx-side">
              <div className="dx-feat">
                <h4>
                  Type safety <span className="badge">ZOD</span>
                </h4>
                <p>Every response is Zod-validated. Your IDE catches typos before your CI does.</p>
              </div>
              <div className="dx-feat">
                <h4>
                  Sandbox mode <span className="badge">FREE</span>
                </h4>
                <p>kak_test_&hellip; keys hit a real sandbox CA. Issue 100 test certs/day at no cost.</p>
              </div>
              <div className="dx-feat">
                <h4>
                  Webhook helper <span className="badge">HMAC</span>
                </h4>
                <p>kkn.webhooks.verify() handles signature checks so you can&apos;t get it wrong.</p>
              </div>
              <div className="dx-feat">
                <h4>
                  Retry &amp; queue <span className="badge">SDK</span>
                </h4>
                <p>
                  Exponential backoff on 5xx, client-side buffering on 429. Zero events lost on rate-limit
                  spikes.
                </p>
              </div>
              <div className="dx-feat">
                <h4>
                  OTLP export <span className="badge">NEW</span>
                </h4>
                <p>Ships agent telemetry to Datadog, Grafana, Honeycomb, and Splunk via OpenTelemetry. No vendor lock-in.</p>
              </div>
              <div className="dx-feat">
                <h4>
                  GitHub Actions gate <span className="badge">NEW</span>
                </h4>
                <p>Block deploys when agent risk score exceeds threshold. CI-native &mdash; one workflow step, no custom tooling.</p>
              </div>
              <div className="dx-install">
                <span>$ npm install @kakunin/sdk</span>
                <button className="copy" type="button">
                  COPY
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           TRUST / SECURITY
           ============================================================ */}
      <section className="trust-sec">
        <div className="container">
          <div className="trust-inner">
            <div>
              <div className="eyebrow">TRUST &amp; SECURITY</div>
              <h3>The product itself is auditable.</h3>
              <p>
                Compliance products carry a higher bar. Our architecture is the answer to the first question a
                regulator will ask:{' '}
                <em>&quot;How do we know you didn&apos;t tamper with this?&quot;</em>
              </p>
            </div>
            <div className="trust-tiles">
              <div className="trust-tile">
                <div className="k">Key custody</div>
                <div className="v">AWS KMS only</div>
              </div>
              <div className="trust-tile">
                <div className="k">Data residency</div>
                <div className="v">EU &middot; eu-west-1</div>
              </div>
              <div className="trust-tile">
                <div className="k">Audit log</div>
                <div className="v">WORM &middot; append-only</div>
              </div>
              <div className="trust-tile">
                <div className="k">Tenant isolation</div>
                <div className="v">RLS &middot; service-role gated</div>
              </div>
              <div className="trust-tile">
                <div className="k">Certification</div>
                <div className="v">SOC 2 in progress</div>
              </div>
              <div className="trust-tile">
                <div className="k">Encryption</div>
                <div className="v">AES-256 + TLS 1.3</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-badges" aria-label="External badges">
        <div className="container">
          <div className="home-badges-list">
            {homeBadges.map((badge, index) => (
              <div key={badge.href} className="home-badge-item">
                {index > 0 && <span className="home-badge-separator" aria-hidden="true" />}
                <a href={badge.href} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={badge.src}
                    alt={badge.alt}
                    width={badge.width || undefined}
                    height={badge.height}
                    style={{ height: `${badge.height}px`, width: 'auto' }}
                  />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
           LANDSCAPE COMPARISON
           ============================================================ */}
      <section className="compare-sec" id="compare">
        <div className="container">
          <div className="compare-head">
            <div>
              <div className="eyebrow">PRODUCT LANDSCAPE</div>
              <h2>
                Not your typical
                <br />
                <em>KYC platform.</em>
              </h2>
            </div>
            <p>
              Human KYC tools verify people. Model governance tools score models. Kakunin is the missing
              primitive in between &mdash; cryptographic identity and behavioral accountability for the
              agents themselves. Different problem. Different buyer. Different category.
            </p>
          </div>

          <div className="compare-scroll">
            <table className="compare-table">
              <thead>
                <tr>
                  <th></th>
                  <th className="kkn-col">Kakunin</th>
                  <th>Human KYC<br /><span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>Jumio · Onfido · Sumsub · Veriff</span></th>
                  <th>AI-enhanced KYC<br /><span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>AIPrise · Baselayer</span></th>
                  <th>Model Governance<br /><span style={{ fontWeight: 400, fontSize: '10px', opacity: 0.7 }}>Credo AI · Arthur AI</span></th>
                </tr>
              </thead>
              <tbody>
                <tr className="subject-row">
                  <td>Subject of verification</td>
                  <td className="kkn-col">AI agents</td>
                  <td>Humans &amp; businesses</td>
                  <td>Humans &amp; businesses</td>
                  <td>AI models (pre-deploy)</td>
                </tr>
                <tr>
                  <td>X.509 cryptographic identity</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">AWS KMS · RSA-2048</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                </tr>
                <tr>
                  <td>Real-time behavioral monitoring</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">1,000 events/s · p99 200ms</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">fraud signals only</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">batch / offline</span></td>
                </tr>
                <tr>
                  <td>Auto-revocation on risk breach</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">&lt; 60s SLA · configurable threshold</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                </tr>
                <tr>
                  <td>EU AI Act compliance reports</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">Annex III · Art. 13 · Art. 14</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">model card only</span></td>
                </tr>
                <tr>
                  <td>MiCA Article mapping</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">Art. 67–75 · PDF + JSON</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                </tr>
                <tr>
                  <td>Immutable append-only audit log</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">WORM · DB-enforced</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">case-level only</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">case-level only</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">evaluation logs</span></td>
                </tr>
                <tr>
                  <td>Verifiable agent email inbox</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">AgentMail · auto-provisioned</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                </tr>
                <tr>
                  <td>Public certificate verification</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">No auth · &lt; 500ms · globally cached</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                  <td><span className="ci-no">✗</span></td>
                </tr>
                <tr>
                  <td>API-first with typed SDK</td>
                  <td className="kkn-col"><span className="ci-yes">✓</span><span className="ci-sub">REST · OpenAPI 3.0 · TS SDK</span></td>
                  <td><span className="ci-yes">✓</span></td>
                  <td><span className="ci-yes">✓</span></td>
                  <td><span className="ci-part">~</span><span className="ci-sub">varies by vendor</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className="compare-note">
            ✓ Fully supported &nbsp;·&nbsp; ~ Partial / adjacent capability &nbsp;·&nbsp; ✗ Not applicable to this category<br />
            Kakunin is complementary to, not a replacement for, human KYC or model governance tools.
            Many customers run all three.
          </p>

          {/* Regulatory landscape strip */}
          <div className="reg-strip">
            <div className="reg-card reg-highlight">
              <div className="flag">🇪🇺</div>
              <div className="country">European Union</div>
              <div className="law">EU AI Act + MiCA</div>
              <span className="status binding">BINDING · AUG 2026</span>
              <div className="reg-body">
                Most comprehensive framework globally. Risk-tiered. Fines up to €35M or 7% of global turnover.
                Kakunin maps to Annex III, Arts. 13–14, and MiCA Arts. 67–75. Extraterritorial — applies to
                any AI system serving EU users, regardless of company HQ.
              </div>
            </div>
            <div className="reg-card">
              <div className="flag">🇺🇸</div>
              <div className="country">United States</div>
              <div className="law">NIST AI RMF · NCCoE · CA SB 53</div>
              <span className="status voluntary">NIST AI RMF · THE UNIVERSAL STANDARD</span>
              <div className="reg-body">
                NIST AI RMF is the gold standard for AI risk management — adopted by enterprise buyers,
                referenced by regulators, and required in every serious vendor questionnaire. Kakunin maps
                to all four NIST AI RMF functions and the NCCoE four-pillar model. California SB 53 in force
                Jan 2026. US companies with EU exposure also satisfy EU AI Act extraterritorial obligations.
              </div>
            </div>
            <div className="reg-card">
              <div className="flag">🇨🇦</div>
              <div className="country">Canada</div>
              <div className="law">PIPEDA (no AI-specific law)</div>
              <span className="status none">AIDA WITHDRAWN · JAN 2025</span>
              <div className="reg-body">
                Canada&apos;s AI-specific bill (AIDA) died when Parliament prorogued in January 2025.
                No replacement in force. Companies operating in Canadian regulated sectors (banking, insurance)
                voluntarily adopt EU AI Act standards as the highest available bar.
              </div>
            </div>
            <div className="reg-card">
              <div className="flag">🇬🇧</div>
              <div className="country">United Kingdom</div>
              <div className="law">Sector-based · FCA guidance</div>
              <span className="status voluntary">BILL STALLED · NO BINDING LAW</span>
              <div className="reg-body">
                UK AI Regulation Bill remains a Private Member&apos;s Bill with no government backing as of
                2026. FCA applies sector-specific guidance for financial services AI. UK fintech operators
                with EU exposure must comply with EU AI Act — making Kakunin directly applicable.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           FAQ
           ============================================================ */}
      <section className="faq-sec">
        <div className="container">
          <div className="faq-head">
            <div className="eyebrow">FAQ</div>
            <h2>Questions, answered.</h2>
          </div>

          <div className="faq-list">
            <details className="faq-item">
              <summary>How is Kakunin different from Jumio, Onfido, or Sumsub?</summary>
              <p>
                Those verify <em>humans</em>. Kakunin verifies <em>AI agents</em> &mdash; their identity,
                their behavior, and their model lineage. We&apos;re not a replacement for human KYC;
                we&apos;re the missing primitive that sits next to it. We expect to partner with the
                incumbents, not compete with them.
              </p>
            </details>
            <details className="faq-item">
              <summary>Is Kakunin a model-governance tool like Credo AI or Arthur AI?</summary>
              <p>
                No. Model governance scores the model. Kakunin issues an identity to a specific deployed agent
                and watches what it does. Together they cover both halves of EU AI Act obligations &mdash;
                they&apos;re different primitives.
              </p>
            </details>
            <details className="faq-item">
              <summary>What happens to a certificate when an agent misbehaves?</summary>
              <p>
                The platform tracks a rolling 30-day risk score. When the average crosses 0.85 (configurable),
                the certificate is auto-revoked, your webhook fires, and the compliance officer receives an
                email. Every step is written to the audit log.
              </p>
            </details>
            <details className="faq-item">
              <summary>Where are private keys stored?</summary>
              <p>
                In AWS KMS only. Kakunin never has access to plaintext private key material. We store the{' '}
                <code style={{ fontFamily: 'var(--ff-mono)' }}>kms_key_arn</code>, never the key itself.
                Signing operations are performed by KMS directly.
              </p>
            </details>
            <details className="faq-item">
              <summary>Do you support US regulatory frameworks?</summary>
              <p>
                Yes &mdash; live today. Kakunin maps every agent control to NIST AI RMF (all four functions:
                Govern, Map, Measure, Manage), NIST CSF 2.0, and the NCCoE four-pillar model for non-human
                identities, alongside MiCA, EU AI Act, and ISO 27001. One platform, every framework. The same
                controls also support GLBA, SOX, PCI DSS, and SEC recordkeeping obligations. See the full
                mapping at <a href="/compliance">kakunin.ai/compliance</a>.
              </p>
            </details>
            <details className="faq-item">
              <summary>Can I self-host?</summary>
              <p>
                Not at V1.0. We considered it. The value of Kakunin is the network effect of a single trusted
                certificate authority &mdash; which self-hosting undermines. Enterprise customers can request a
                dedicated Supabase instance for data residency.
              </p>
            </details>
            <details className="faq-item">
              <summary>How does the free trial work?</summary>
              <p>
                30-day free trial on every plan — card required, no charge until day 31, cancel anytime before.
                We provision your tenant, certify your first 5 agents together in a working session, wire your
                event stream, and deliver your first compliance report inside 30 days.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* ============================================================
           CASE STUDIES
           ============================================================ */}
      <section className="use-sec" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="container">
          <div className="use-head">
            <div>
              <div className="eyebrow">DEPLOYED IN PRODUCTION</div>
              <h2>
                Autonomous AI agents,
                <br />
                enterprise-safe.
              </h2>
            </div>
            <p>
              From trading bots to compliance processors, financial institutions prove agent autonomy
              using Kakunin. Zero compliance violations. Zero agent escapes.
            </p>
          </div>

          <div className="use-grid">
            <div className="use-card">
              <div className="industry">Financial services &middot; Trading</div>
              <h4>Autonomous FX trading agent</h4>
              <p>
                Tier-1 EU bank. Agent executes up to €50M/day (scoped in cert).
                Behavioral drift detection active. Compliance team: zero violations.
                Result: 3x trade execution speed vs human desk.
              </p>
            </div>
            <div className="use-card">
              <div className="industry">Fintech &middot; Reconciliation</div>
              <h4>Autonomous payment processor</h4>
              <p>
                Millions of daily transactions reconciled by agent.
                Behavioral drift caught agent misbehavior on day 3. Revocation fired &lt;5ms.
                Result: $0 fraud loss. Audit clean.
              </p>
            </div>
            <div className="use-card">
              <div className="industry">Insurance &middot; Claims</div>
              <h4>Autonomous claims triage</h4>
              <p>
                Handles €2M/month in claim decisions. Post-hoc audit log validated
                every decision with regulators. Result: 40% processing speed-up. Liability clear.
              </p>
            </div>
            <div className="use-card">
              <div className="industry">Supply chain</div>
              <h4>Customs filing automation</h4>
              <p>
                AI signs customs declarations with KMS-bound private key.
                Customs authorities verify cryptographic signature directly.
                Result: 10x faster clearance. No manual review needed.
              </p>
            </div>
            <div className="use-card">
              <div className="industry">Healthcare</div>
              <h4>Diagnostic EHR assistant</h4>
              <p>
                Read-only agent on hospital records. Permitted actions encoded in cert.
                Cannot mutate. HIPAA audit trail automatic.
                Result: Fast diagnosis. Full regulatory compliance.
              </p>
            </div>
            <div className="use-card">
              <div className="industry">Public sector</div>
              <h4>EU AI Act–compliant visa processor</h4>
              <p>
                Citizen-facing agent decisions fully auditable. Transparency built in, not bolted on.
                Regulators see: scope, decisions, behavioral baseline, drift alerts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
           FINAL CTA
           ============================================================ */}
      <section className="final-cta">
        <div className="container">
          <div className="final-cta-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-metallic-green.png" alt="Kakunin" className="final-cta-logo" width="320" height="320" loading="lazy" />
            <div className="eyebrow">UNLOCK AI AUTONOMY &middot; TODAY</div>
            <h2>
              <span>Identity.</span>
              <br />
              <span>Accountability.</span>
              <br />
              <span>Autonomy.</span>
            </h2>
            <p>
              Cryptographic identity and behavioural proof for AI agents in regulated industries.
              Financial institutions deploy autonomous agents with Kakunin. Enterprise-safe, audit-ready.
            </p>
            <div className="ctas">
              <a href="/assessment" className="btn btn--primary btn--lg">
                Free compliance report{' '}
                <svg className="arrow" viewBox="0 0 24 24">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </a>
              <a href="/pricing" className="btn btn--ghost btn--lg">
                Pricing
              </a>
              {/* Book a demo hidden per design review — re-enable when calendar link is ready */}
            </div>
          </div>
        </div>
      </section>

      </main>{/* end #main-content */}

      <SiteFooter />
    </>
  );
}
