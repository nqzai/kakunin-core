import type { Metadata } from 'next';
import '../landing.css';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'Know Your Agent (KYA) — AI Agent Governance Framework',
  description:
    'Know Your Agent (KYA) applies KYC principles to autonomous AI systems: cryptographic identity verification, behavioral baseline, continuous monitoring, and automatic enforcement. The framework regulators are converging on.',
  alternates: { canonical: '/kya' },
  openGraph: {
    type: 'website',
    url: 'https://kakunin.ai/kya',
    title: 'Know Your Agent (KYA) — AI Agent Governance Framework | Kakunin',
    description:
      'KYA framework: verify agent identity, establish behavioral baselines, detect anomalies, enforce limits. Built for MiCA, EU AI Act, and DORA compliance.',
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Know Your Agent — Kakunin' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Know Your Agent (KYA) — AI Agent Governance Framework | Kakunin',
    description:
      'KYA: cryptographic identity, behavioral baselines, anomaly detection, and auto-enforcement for autonomous AI agents.',
    images: ['/og-image.png'],
  },
};

const kyaSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Know Your Agent (KYA) Framework',
  description:
    'Know Your Agent applies KYC-equivalent governance to autonomous AI systems operating in regulated environments.',
  url: 'https://kakunin.ai/kya',
  mainEntity: {
    '@type': 'HowTo',
    name: 'Implement Know Your Agent (KYA)',
    step: [
      { '@type': 'HowToStep', name: 'Agent Registration', text: 'Create a permanent cryptographic identity for each agent instance.' },
      { '@type': 'HowToStep', name: 'Scope Definition', text: 'Define authority limits embedded in the X.509 certificate.' },
      { '@type': 'HowToStep', name: 'Baseline Observation', text: 'Collect 7–14 days of behavioral data before enforcing anomaly limits.' },
      { '@type': 'HowToStep', name: 'Continuous Monitoring', text: 'Score every action against the baseline and enforce automatically.' },
    ],
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is Know Your Agent (KYA)?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Know Your Agent (KYA) is a governance framework that applies KYC (Know Your Customer) principles to autonomous AI systems. It establishes cryptographic identity for each agent, defines its authority limits, profiles its normal behavior, and continuously monitors for deviations.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is KYA required by regulation?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'KYA is not mandated by name, but the obligations it fulfills are already in force under MiCA (Articles 67–72), the EU AI Act (Articles 9, 12, 14), and DORA (Article 9). Implementing KYA positions operators to meet current and upcoming AI governance requirements.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does KYA differ from KYC?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'KYA adapts KYC logic for autonomous agents. Identity uses X.509 certificates instead of documents. Monitoring is continuous per-action instead of periodic. Anomaly response is automatic (certificate revocation) instead of requiring human review. Audit trails include cryptographic proof of authorship.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is verify_agent_scope?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'verify_agent_scope is a Python decorator in the Kakunin SDK that checks agent identity and scope before any tool or function executes. It integrates with LangChain, AutoGen, CrewAI, LangGraph, and LlamaIndex.',
      },
    },
  ],
};

export default function KyaPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(kyaSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SiteNav />
        <main style={{ flex: 1 }}>
          {/* Hero */}
          <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '16px' }}>
                Framework
              </div>
              <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 700, lineHeight: 1.1, marginBottom: '24px', maxWidth: '720px' }}>
                Know Your Agent (KYA)
              </h1>
              <p style={{ fontSize: '20px', color: 'var(--ink-2)', maxWidth: '640px', lineHeight: 1.6, marginBottom: '40px' }}>
                KYC for autonomous AI systems. Cryptographic identity, behavioral baselines, continuous monitoring, and automatic enforcement — the governance framework regulators are converging on.
              </p>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <Link href="/docs/know-your-agent" style={{ display: 'inline-block', background: 'var(--green)', color: '#000', padding: '12px 24px', borderRadius: '4px', fontWeight: 600, textDecoration: 'none', fontSize: '14px' }}>
                  Read the KYA Guide →
                </Link>
                <Link href="/dashboard" style={{ display: 'inline-block', border: '1px solid var(--border)', color: 'var(--ink-1)', padding: '12px 24px', borderRadius: '4px', fontWeight: 500, textDecoration: 'none', fontSize: '14px' }}>
                  Start Free
                </Link>
              </div>
            </div>
          </section>

          {/* What is KYA */}
          <section style={{ padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '24px' }}>What is Know Your Agent?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '48px', alignItems: 'start' }}>
                <div>
                  <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: '16px' }}>
                    In financial services, &ldquo;Know Your Customer&rdquo; is the standard for verifying who your customers are and monitoring their behaviour continuously.
                  </p>
                  <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.7, marginBottom: '16px' }}>
                    Autonomous AI agents now execute trades, process payments, and manage regulated data — often without per-action human oversight. <strong>Know Your Agent (KYA)</strong> applies the same logic: establish identity, define authority, profile normal behaviour, detect deviations, respond automatically.
                  </p>
                  <p style={{ fontSize: '16px', color: 'var(--ink-2)', lineHeight: 1.7 }}>
                    KYA is the framework that satisfies obligations under MiCA, the EU AI Act, and DORA for operators deploying autonomous AI in regulated environments.
                  </p>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '32px' }}>
                  <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)', marginBottom: '16px' }}>KYC → KYA mapping</div>
                  {[
                    ['Identity document', 'X.509 certificate (KMS-backed)'],
                    ['Due diligence', 'Scope policy in certificate'],
                    ['Ongoing monitoring', 'Per-action anomaly scoring'],
                    ['Periodic refresh', 'Certificate renewal + re-assessment'],
                    ['Account freeze', 'Automatic certificate revocation'],
                    ['Audit trail', 'WORM log with cryptographic proof'],
                  ].map(([kyc, kya]) => (
                    <div key={kyc} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                      <span style={{ color: 'var(--ink-3)' }}>{kyc}</span>
                      <span style={{ color: 'var(--ink-1)', fontWeight: 500 }}>{kya}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Four pillars — NIST NCCoE model */}
          <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px', textAlign: 'center' }}>The Four Pillars of Agent Governance</h2>
              <p style={{ textAlign: 'center', fontSize: '15px', color: 'var(--ink-2)', maxWidth: '640px', margin: '0 auto 48px', lineHeight: 1.6 }}>
                KYA maps one-to-one to the four pillars defined by the NIST NCCoE for non-human identity — the framework the industry is converging on. Defined by NIST, shipped by Kakunin.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '32px' }}>
                {[
                  {
                    num: '01',
                    title: 'Identification',
                    body: 'Every agent instance gets a forgery-proof X.509 identity from Kakunin\'s KMS-backed CA, with the model hash pinned in the certificate. Per-instance and non-repudiable — not a shared API key.',
                  },
                  {
                    num: '02',
                    title: 'Authorization',
                    body: 'Scope — max transaction size, allowed instruments, counterparties, hours — is embedded in the certificate and enforced before the agent acts. RFC 8693 delegation makes the human→agent→sub-agent authority chain explicit.',
                  },
                  {
                    num: '03',
                    title: 'Auditing',
                    body: 'Every action is scored against a behavioral baseline, and content-risk scoring watches what the agent says — not just what it does. Decision chains link events into one causal unit you can reconstruct, or export as signed forensics.',
                  },
                  {
                    num: '04',
                    title: 'Non-repudiation',
                    body: 'Signed actions, signed kill-switch receipts, and a WORM audit log give cryptographic proof of every action. Forensic exports carry a tamper-evident HMAC proof — provable to a regulator, not just claimed.',
                  },
                ].map((pillar) => (
                  <div key={pillar.num} style={{ padding: '32px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--green)', marginBottom: '12px' }}>{pillar.num}</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>{pillar.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{pillar.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Regulatory alignment */}
          <section style={{ padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>Regulatory Alignment</h2>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', marginBottom: '40px', maxWidth: '600px', lineHeight: 1.6 }}>
                KYA is not a named regulation — but the obligations it satisfies are already in force.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                {[
                  {
                    reg: 'MiCA',
                    articles: 'Articles 67–72',
                    desc: 'Governance framework, record-keeping, testing and monitoring for CASP algorithmic trading.',
                    href: '/docs/mica-trading-bots',
                  },
                  {
                    reg: 'EU AI Act',
                    articles: 'Articles 9, 12, 14',
                    desc: 'Risk management system, automatic logging, human oversight for Annex III high-risk AI systems.',
                    href: '/docs/eu-ai-act-annex-iii',
                  },
                  {
                    reg: 'DORA',
                    articles: 'Article 9',
                    desc: 'ICT risk management framework including automated systems in financial operations.',
                    href: '/blog/eu-ai-act-compliance-roadmap-high-risk-ai-systems',
                  },
                ].map((r) => (
                  <Link key={r.reg} href={r.href} style={{ display: 'block', padding: '24px', border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700 }}>{r.reg}</span>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--green)' }}>{r.articles}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.5, margin: 0 }}>{r.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 32px' }}>
            <div style={{ maxWidth: '720px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '48px' }}>Frequently Asked Questions</h2>
              {[
                {
                  q: 'What is Know Your Agent (KYA)?',
                  a: 'Know Your Agent (KYA) is a governance framework that applies KYC principles to autonomous AI systems. It establishes cryptographic identity for each agent, defines authority limits, profiles normal behavior, and continuously monitors for deviations — automating the oversight that KYC applies to human customers.',
                },
                {
                  q: 'Is KYA required by regulation?',
                  a: 'KYA is not mandated by name, but the obligations it fulfills are in force under MiCA Articles 67–72 (governance, monitoring, record-keeping for CASPs), EU AI Act Articles 9, 12, and 14 (risk management, automatic logging, human oversight), and DORA Article 9 (ICT risk management).',
                },
                {
                  q: 'How does KYA differ from standard API key authentication?',
                  a: 'API keys identify a service, not a specific agent instance — they can be shared, leaked, and rotated without audit trail. KYA uses X.509 certificates: per-instance cryptographic identity, KMS-backed private keys that never leave the HSM, scope embedded in the certificate and enforced before the LLM\'s decision runs.',
                },
                {
                  q: 'How does automatic revocation work?',
                  a: 'When an agent\'s anomaly score exceeds 0.85 (configurable), Kakunin revokes the certificate immediately. All subsequent scope checks for that certificate return "revoked" — the agent cannot execute any further guarded actions. The event is written to the WORM audit log. A replacement agent can be spun up with a fresh certificate.',
                },
                {
                  q: 'What frameworks does the verify_agent_scope decorator support?',
                  a: 'verify_agent_scope works with any Python function (sync or async). Framework-specific integrations exist for LangChain (KakuninToolGuard, langchain_scope_callback), AutoGen (KakuninConversableAgent), LangGraph (kakunin_node), LlamaIndex (KakuninFunctionToolGuard), CrewAI, and CAMEL-AI.',
                },
              ].map((faq) => (
                <details key={faq.q} style={{ marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '24px' }}>
                  <summary style={{ fontSize: '16px', fontWeight: 600, cursor: 'pointer', listStyle: 'none', display: 'flex', justifyContent: 'space-between' }}>
                    {faq.q}
                  </summary>
                  <p style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: 1.7, marginTop: '12px', marginBottom: 0 }}>{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section style={{ padding: '80px 32px', textAlign: 'center' }}>
            <div style={{ maxWidth: '560px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>Start implementing KYA</h2>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', marginBottom: '32px', lineHeight: 1.6 }}>
                Register your first agent in 5 minutes. Certificate issued, scope defined, monitoring active.
              </p>
              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/dashboard" style={{ display: 'inline-block', background: 'var(--green)', color: '#000', padding: '14px 28px', borderRadius: '4px', fontWeight: 600, textDecoration: 'none' }}>
                  Get Started Free
                </Link>
                <Link href="/docs/know-your-agent" style={{ display: 'inline-block', border: '1px solid var(--border)', color: 'var(--ink-1)', padding: '14px 28px', borderRadius: '4px', fontWeight: 500, textDecoration: 'none' }}>
                  Read the Docs
                </Link>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
