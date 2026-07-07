import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import '../../../landing.css';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import Link from 'next/link';

interface HubData {
  cityId: string;
  cityName: string;
  country: string;
  focus: string;
  heroTitle: string;
  heroSubtitle: string;
  regulationsTitle: string;
  regulationsDesc: string;
  regulationsList: Array<{ title: string; desc: string }>;
  personaMatch: {
    name: string;
    role: string;
    avatar: string;
    quote: string;
    url: string;
  };
  metrics: Array<{ value: string; label: string }>;
  ctaText: string;
}

const hubs: Record<string, HubData> = {
  berlin: {
    cityId: 'berlin',
    cityName: 'Berlin',
    country: 'Germany',
    focus: 'Legal Tech & Algorithmic Audit Hub',
    heroTitle: 'Secure EU AI Act Agent Compliance in Berlin',
    heroSubtitle: 'Empower Berlin legal tech firms and financial platforms to deploy compliant, HSM-backed autonomous agent fleets aligned with BaFin standards.',
    regulationsTitle: 'German & European Algorithmic Controls',
    regulationsDesc: 'Germany’s BaFin and the EU AI Act impose stringent rules on algorithmic decision-making. De-risk your automated agents with Kakunin’s compliance layers.',
    regulationsList: [
      { title: 'BaFin Algorithmic Audits', desc: 'Satisfy German financial supervisors with immutable, verifiable records of model inputs, prompts, and executed trades.' },
      { title: 'EU AI Act Article 12 Logs', desc: 'Secure automated traceability and audit-readiness through cryptographic WORM log storage that developers cannot alter.' },
      { title: 'X.509 Cryptographic Identity', desc: 'Replace raw API keys with short-lived certificates issued via secure cloud HSM/KMS setups.' },
    ],
    personaMatch: {
      name: 'Clara',
      role: 'Chief Compliance Officer',
      avatar: '/persona_clara.png',
      quote: 'Kakunin provides the exact cryptographic proof we need to satisfy BaFin audits without slowing down our engineering sprints.',
      url: '/docs/compliance-checklist'
    },
    metrics: [
      { value: '< 2ms', label: 'Edge Verify Latency' },
      { value: '100%', label: 'Immutable Audit Trails' },
      { value: 'Zero-Trust', label: 'Credential Security' },
    ],
    ctaText: 'Deploy Compliant Agents in Berlin',
  },
  paris: {
    cityId: 'paris',
    cityName: 'Paris',
    country: 'France',
    focus: 'AI Tech & Cryptographic Verification Hub',
    heroTitle: 'Cryptographic AI Agent Identity for Paris Ecosystems',
    heroSubtitle: 'Secure the French AI innovation corridor. Verify Mistral-class and custom model lineage at the API gateway layer with under 2ms overhead.',
    regulationsTitle: 'Securing the French AI Frontier',
    regulationsDesc: 'As France pioneers AI research and ACPR/AMF shape token standards, Kakunin provides the machine-identity layer required for high-risk deployments.',
    regulationsList: [
      { title: 'mTLS Edge Gateways', desc: 'Validate agent identity at the gateway layer using Kong or Tyk integrations before requests reach internal microservices.' },
      { title: 'Model Lineage Verification', desc: 'Hash model weights and verify the integrity of parameter files at boot-time to prevent agent tampering.' },
      { title: 'ACPR & AMF Compliance', desc: 'Generate tamper-proof logs matching crypto asset transaction regulations and public fintech audit requirements.' },
    ],
    personaMatch: {
      name: 'Alex',
      role: 'API Platform Engineer',
      avatar: '/persona_alex.png',
      quote: 'Verifying certificates at our edge gateways keeps our latencies low and our systems protected from looping agents.',
      url: '/docs/verify'
    },
    metrics: [
      { value: '< 2ms', label: 'Verification Latency' },
      { value: 'Kong', label: 'Native Gateway Plugin' },
      { value: 'Mistral-Ready', label: 'Model Hashing Support' },
    ],
    ctaText: 'Integrate Paris Gateway Security',
  },
  dublin: {
    cityId: 'dublin',
    cityName: 'Dublin',
    country: 'Ireland',
    focus: 'EU Headquarter & Platform Scale Hub',
    heroTitle: 'Scale GDPR-Compliant AI Agent Infrastructure in Dublin',
    heroSubtitle: 'Build zero-trust database bindings for global platforms. Map client-certificate scopes directly to Supabase Postgres RLS policies.',
    regulationsTitle: 'Data Protection & Enterprise Scalability',
    regulationsDesc: 'Irish DPC oversight requires strict boundaries for automated processing. Kakunin enables enterprise-grade data isolation for autonomous systems.',
    regulationsList: [
      { title: 'Supabase RLS Protection', desc: 'Bind short-lived agent certificates directly to Postgres Row-Level Security contexts to prevent data leakage.' },
      { title: 'GDPR Processing Accountability', desc: 'Establish non-repudiation and clear operational tracking for user data mutations triggered by AI agents.' },
      { title: 'Global Edge Performance', desc: 'Utilize high-performance OCSP checks and cached CRL responders for zero-downtime platform execution.' },
    ],
    personaMatch: {
      name: 'Ian',
      role: 'Infrastructure Partner',
      avatar: '/persona_ian.png',
      quote: 'By mapping agent certificates directly to Supabase RLS, we guarantee customer data isolation with zero extra database queries.',
      url: '/docs/sdks'
    },
    metrics: [
      { value: 'Postgres', label: 'RLS Native Binding' },
      { value: '< 100ms', label: 'Global OCSP Checks' },
      { value: '99.99%', label: 'Infrastructure Uptime' },
    ],
    ctaText: 'Establish Zero-Trust Dublin Infrastructure',
  },
  brussels: {
    cityId: 'brussels',
    cityName: 'Brussels',
    country: 'Belgium',
    focus: 'EU Governance & Policy Compliance Hub',
    heroTitle: 'Enforce EU AI Act Compliance in Brussels',
    heroSubtitle: 'The heart of European AI policy demands cryptographic accountability. Build compliant, transparent, and auditable agent systems from day one.',
    regulationsTitle: 'Strict Governance & Risk Management',
    regulationsDesc: 'The EU AI Act classifies autonomous workflows. Satisfy transparency and human-in-the-loop governance checks using Kakunin.',
    regulationsList: [
      { title: 'AI Act Article 12 Traceability', desc: 'Provide automatic, non-repudiation audit trails logging prompts, agent decisions, and tool usage.' },
      { title: 'Real-time Risk Engine', desc: 'Evaluate prompt safety, calculate loop drift, and trigger automatic certificate revocation at scale.' },
      { title: 'Human Oversight Signatures', desc: 'Digitally sign supervisor overrides and compliance approvals directly into the cryptographic record.' },
    ],
    personaMatch: {
      name: 'Devlin',
      role: 'VP of Engineering / CTO',
      avatar: '/persona_devlin.png',
      quote: 'Kakunin ensures that our high-risk compliance workflows are 100% compliant with the EU AI Act without affecting dev velocity.',
      url: '/docs/compliance-checklist'
    },
    metrics: [
      { value: 'EU AI Act', label: 'Article 12 Aligned' },
      { value: 'Real-time', label: 'Risk Loop Revocation' },
      { value: '100% Valid', label: 'WORM Compliance Logs' },
    ],
    ctaText: 'Validate Brussels Regulatory Strategy',
  },
  zug: {
    cityId: 'zug',
    cityName: 'Zug',
    country: 'Switzerland',
    focus: 'Crypto Valley & Decoupled Token Transaction Hub',
    heroTitle: 'MiCA Compliance Logs for Autonomous Agents in Zug',
    heroSubtitle: 'Unlocking transaction-level machine identity in Crypto Valley. Generate audit trails compliant with MiCA Article 72 for on-chain flows.',
    regulationsTitle: 'MiCA Compliance & Blockchain Identity',
    regulationsDesc: 'Crypto Valley operations require strict AML, compliance logging, and identity attribution. Kakunin bridges autonomous agents and financial networks.',
    regulationsList: [
      { title: 'MiCA Article 72 Audit', desc: 'Satisfy MiCA requirements for crypto-asset transactions executed by autonomous agent networks.' },
      { title: 'did:kakunin W3C Standards', desc: 'Cryptographically bind model hashes, prompt signatures, and owner keys to a resolvable decentralized identity.' },
      { title: 'Financial Risk Guardrails', desc: 'Enforce token spend limits and leverage automatic circuit breakers to block runaway trading loops.' },
    ],
    personaMatch: {
      name: 'C-Suite',
      role: 'Strategic Boardroom Partner',
      avatar: '/persona_csuite.png',
      quote: 'Deploying agents with MiCA compliance safeguards our capital and lets us lead in autonomous decentralized finance (DeFi).',
      url: '/docs/did-method'
    },
    metrics: [
      { value: 'MiCA', label: 'Article 72 Ready' },
      { value: 'W3C Spec', label: 'did:kakunin Standards' },
      { value: '< 100ms', label: 'Circuit Breaker Kill-Switch' },
    ],
    ctaText: 'Secure On-chain Zug Agent Identity',
  },
};

interface Params {
  city: string;
}

export async function generateStaticParams() {
  return [
    { city: 'berlin' },
    { city: 'paris' },
    { city: 'dublin' },
    { city: 'brussels' },
    { city: 'zug' },
  ];
}

interface PageProps {
  params: Promise<Params>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const hub = hubs[city.toLowerCase()];
  if (!hub) return { title: 'Not Found' };

  return {
    title: `${hub.heroTitle} — Kakunin Hub`,
    description: hub.heroSubtitle,
    alternates: { canonical: `/compliance/hub/${hub.cityId}` },
    openGraph: {
      title: `${hub.heroTitle} — Kakunin Hub`,
      description: hub.heroSubtitle,
      url: `https://www.kakunin.ai/compliance/hub/${hub.cityId}`,
      siteName: 'Kakunin',
      locale: 'en_GB',
      type: 'website',
    },
  };
}

export default async function HubPage({ params }: PageProps) {
  const { city } = await params;
  const hub = hubs[city.toLowerCase()];
  if (!hub) notFound();

  // Create LocalBusiness schema to boost localized search visibility
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `Kakunin AI Agent Compliance Hub — ${hub.cityName}`,
    description: hub.heroSubtitle,
    url: `https://www.kakunin.ai/compliance/hub/${hub.cityId}`,
    telephone: '+1 (412) 543-7290',
    address: {
      '@type': 'PostalAddress',
      addressLocality: hub.cityName,
      addressCountry: hub.country,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SiteNav active="home" />

        <main style={{ flex: 1, width: '100%' }}>
          {/* Breadcrumbs */}
          <div style={{
            background: 'var(--paper)',
            borderBottom: '1px solid var(--paper-edge)',
            padding: '16px 24px',
          }}>
            <div className="container" style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{
                fontSize: '13px',
                color: 'var(--ink-2)',
              }}>
                <Link href="/" style={{ color: 'var(--ink)', textDecoration: 'none' }}>Home</Link>
                <span style={{ margin: '0 8px' }}>/</span>
                <Link href="/compliance" style={{ color: 'var(--ink)', textDecoration: 'none' }}>Compliance Hubs</Link>
                <span style={{ margin: '0 8px' }}>/</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{hub.cityName}</span>
              </div>
            </div>
          </div>

          {/* Hero Section */}
          <section style={{
            background: 'linear-gradient(180deg, var(--paper-warm) 0%, var(--paper) 100%)',
            padding: '120px 24px 80px',
            borderBottom: '1px solid var(--paper-edge)',
            textAlign: 'center',
          }}>
            <div className="container" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <div className="eyebrow" style={{ marginBottom: '24px' }}>
                {hub.focus}
              </div>
              <h1 style={{
                fontFamily: 'var(--ff-display)',
                fontSize: 'clamp(36px, 5vw, 54px)',
                lineHeight: 1.05,
                color: 'var(--ink)',
                marginBottom: '24px',
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
              }}>
                {hub.heroTitle}
              </h1>
              <p style={{
                fontFamily: 'var(--ff-body)',
                fontSize: '18px',
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                marginBottom: '40px',
                maxWidth: '720px',
                margin: '0 auto 40px',
              }}>
                {hub.heroSubtitle}
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <a href="#audit-criteria" className="btn btn--primary btn--lg">
                  {hub.ctaText}
                </a>
                <Link href="/docs" className="btn btn--ghost btn--lg">
                  Explore Developer Documentation
                </Link>
              </div>
            </div>
          </section>

          {/* Metrics Row */}
          <section style={{
            background: 'var(--ink)',
            color: 'var(--paper)',
            padding: '60px 24px',
          }}>
            <div className="container" style={{
              maxWidth: 'var(--container)',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '40px',
              textAlign: 'center',
            }}>
              {hub.metrics.map((metric, idx) => (
                <div key={idx}>
                  <div style={{
                    fontFamily: 'var(--ff-display)',
                    fontSize: '44px',
                    color: 'var(--green-bright)',
                    marginBottom: '8px',
                  }}>
                    {metric.value}
                  </div>
                  <div style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '12px',
                    color: 'var(--ink-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    {metric.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Audit criteria / Specifics */}
          <section id="audit-criteria" style={{
            padding: '100px 24px',
            background: 'var(--paper)',
          }}>
            <div className="container" style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h2 style={{
                  fontFamily: 'var(--ff-display)',
                  fontSize: '32px',
                  textTransform: 'uppercase',
                  color: 'var(--ink)',
                  marginBottom: '16px',
                }}>
                  {hub.regulationsTitle}
                </h2>
                <p style={{
                  fontSize: '16px',
                  color: 'var(--ink-2)',
                  maxWidth: '680px',
                  margin: '0 auto',
                  lineHeight: 1.6,
                }}>
                  {hub.regulationsDesc}
                </p>
              </div>

              {/* Grid of features */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '32px',
                marginBottom: '80px',
              }}>
                {hub.regulationsList.map((item, idx) => (
                  <div key={idx} style={{
                    background: 'var(--card)',
                    border: '1px solid var(--paper-edge)',
                    borderRadius: 'var(--r-md)',
                    padding: '32px',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s ease',
                  }}
                  className="hover-card-effects"
                  >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--green-paper)',
                      color: 'var(--green-deep)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--ff-mono)',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      marginBottom: '20px',
                    }}>
                      0{idx + 1}
                    </div>
                    <h3 style={{
                      fontFamily: 'var(--ff-display)',
                      fontSize: '18px',
                      textTransform: 'uppercase',
                      color: 'var(--ink)',
                      marginBottom: '12px',
                    }}>
                      {item.title}
                    </h3>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--ink-2)',
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Persona Showcase Card */}
              <div style={{
                background: 'var(--paper-warm)',
                border: '1px solid var(--paper-edge)',
                borderRadius: 'var(--r-lg)',
                padding: '48px',
                maxWidth: '860px',
                margin: '0 auto',
                display: 'flex',
                gap: '32px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  position: 'relative',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--card)',
                  border: '2px solid var(--green)',
                  flexShrink: 0,
                  margin: '0 auto',
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hub.personaMatch.avatar} alt={hub.personaMatch.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ flex: 1, minWidth: '280px', textAlign: 'left' }}>
                  <div style={{
                    fontFamily: 'var(--ff-mono)',
                    fontSize: '11px',
                    color: 'var(--green-deep)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: '8px',
                  }}>
                    Featured Persona Match: {hub.personaMatch.role} ({hub.personaMatch.name})
                  </div>
                  <blockquote style={{
                    fontSize: '18px',
                    fontStyle: 'italic',
                    color: 'var(--ink)',
                    lineHeight: 1.6,
                    margin: '0 0 20px 0',
                    fontWeight: 500,
                  }}>
                    &ldquo;{hub.personaMatch.quote}&rdquo;
                  </blockquote>
                  <Link href={hub.personaMatch.url} className="btn btn--dark" style={{ fontSize: '13px', padding: '8px 16px' }}>
                    View Documentation Route &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Quick CTA banner */}
          <section style={{
            background: 'var(--green-deep)',
            color: 'var(--paper)',
            padding: '80px 24px',
            textAlign: 'center',
          }}>
            <div className="container" style={{ maxWidth: '640px', margin: '0 auto' }}>
              <h2 style={{
                fontFamily: 'var(--ff-display)',
                fontSize: '28px',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}>
                Start Your Autonomous Security Sandbox Today
              </h2>
              <p style={{
                fontSize: '15px',
                lineHeight: 1.6,
                marginBottom: '32px',
                color: 'var(--green-paper)',
              }}>
                Issue secure, short-lived X.509 compliance certificates to your AI agents in under 15 minutes. Start verifying model actions and preventing regulatory liability.
              </p>
              <Link href="/pricing" className="btn btn--paper btn--lg">
                Get Started Free
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
