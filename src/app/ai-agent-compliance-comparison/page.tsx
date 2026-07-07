import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'AI Agent Compliance Comparison — Kakunin',
  description:
    'Compare Kakunin with DIY compliance, generic monitoring tools, and manual governance approaches. See how cryptographic identity, automated scope enforcement, and WORM audit trails reduce operational risk.',
  alternates: { canonical: '/ai-agent-compliance-comparison' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/ai-agent-compliance-comparison',
    title: 'AI Agent Compliance Comparison — Kakunin',
    description:
      'Why purpose-built AI agent compliance infrastructure outperforms generic monitoring, API key authentication, and manual governance processes.',
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Comparison' }],
  },
};

const comparisonSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'AI Agent Compliance Comparison — Kakunin',
  description: 'Comparison of Kakunin against DIY compliance, generic monitoring, and manual governance for autonomous AI agents.',
  url: 'https://www.kakunin.ai/ai-agent-compliance-comparison',
};

type CheckMark = '✓' | '✗' | '~';

interface Feature {
  feature: string;
  kakunin: CheckMark;
  diy: CheckMark;
  generic: CheckMark;
  manual: CheckMark;
  detail: string;
}

const features: Feature[] = [
  { feature: 'Per-instance X.509 agent identity', kakunin: '✓', diy: '~', generic: '✗', manual: '✗', detail: 'Cryptographic identity bound to each agent deployment, not a shared API key or service account.' },
  { feature: 'KMS-backed private key custody', kakunin: '✓', diy: '~', generic: '✗', manual: '✗', detail: 'Private key generated in AWS KMS HSM and never exposed to application code.' },
  { feature: 'Certificate-embedded scope policy', kakunin: '✓', diy: '✗', generic: '✗', manual: '✗', detail: 'Authority limits are signed into the certificate and cannot be changed without CA reissuance.' },
  { feature: 'Scope enforcement independent of LLM', kakunin: '✓', diy: '✗', generic: '✗', manual: '✗', detail: 'Scope is checked at the tool layer before any action executes.' },
  { feature: 'Behavioral baseline profiling', kakunin: '✓', diy: '~', generic: '~', manual: '✗', detail: 'Per-agent baseline established from observation and scored against recent deviation patterns.' },
  { feature: 'Per-action anomaly scoring', kakunin: '✓', diy: '~', generic: '~', manual: '✗', detail: 'Every action produces a normalized risk score against the behavioral baseline.' },
  { feature: 'Automatic certificate revocation', kakunin: '✓', diy: '✗', generic: '✗', manual: '✗', detail: 'Score ≥ 0.85 triggers instant revocation with no human required.' },
  { feature: 'Pre-revocation human review window', kakunin: '✓', diy: '✗', generic: '✗', manual: '~', detail: 'Score 0.75–0.84 triggers a configurable grace period before auto-revocation.' },
  { feature: 'WORM audit log', kakunin: '✓', diy: '~', generic: '✗', manual: '✗', detail: 'PostgreSQL rules block UPDATE and DELETE on audit_log.' },
  { feature: 'Cryptographic action signatures', kakunin: '✓', diy: '~', generic: '✗', manual: '✗', detail: 'Each logged action includes a KMS signature over the payload.' },
  { feature: 'MiCA Articles 67–72 compliance evidence', kakunin: '✓', diy: '~', generic: '✗', manual: '~', detail: 'Compliance report exports the evidence package regulators request.' },
  { feature: 'EU AI Act Annex III technical documentation', kakunin: '✓', diy: '✗', generic: '✗', manual: '~', detail: 'Article 11 package generated on demand with risk and oversight records.' },
  { feature: 'LangChain / AutoGen / CrewAI integration', kakunin: '✓', diy: '~', generic: '✗', manual: '✗', detail: 'Native SDK integrations support common agent orchestration stacks.' },
  { feature: 'Time to first agent registered', kakunin: '✓', diy: '✗', generic: '~', manual: '✗', detail: '5 minutes via API or CLI; DIY requires building CA and enforcement plumbing from scratch.' },
];

const colorMap: Record<CheckMark, string> = {
  '✓': 'var(--green)',
  '✗': '#e53e3e',
  '~': '#d69e2e',
};

export default function ComplianceComparisonPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(comparisonSchema) }} />
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SiteNav />
        <main style={{ flex: 1 }}>
          <section style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '16px' }}>
                Compare
              </div>
              <h1 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 700, lineHeight: 1.15, marginBottom: '20px', maxWidth: '680px' }}>
                Kakunin vs. the Alternatives
              </h1>
              <p style={{ fontSize: '18px', color: 'var(--ink-2)', maxWidth: '600px', lineHeight: 1.6, marginBottom: '0' }}>
                Why purpose-built AI agent compliance infrastructure outperforms DIY builds, generic monitoring, and manual governance under MiCA and EU AI Act scrutiny.
              </p>
            </div>
          </section>

          <section style={{ padding: '32px 32px 0' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto', display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '13px', color: 'var(--ink-2)' }}>
              <span><span style={{ color: colorMap['✓'], fontWeight: 700 }}>✓</span> Supported</span>
              <span><span style={{ color: colorMap['~'], fontWeight: 700 }}>~</span> Partial / requires custom build</span>
              <span><span style={{ color: colorMap['✗'], fontWeight: 700 }}>✗</span> Not supported</span>
            </div>
          </section>

          <section style={{ padding: '32px 32px 80px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, minWidth: '260px' }}>Feature</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: 'var(--green)', minWidth: '100px' }}>Kakunin</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: 'var(--ink-2)', minWidth: '100px' }}>DIY Build</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: 'var(--ink-2)', minWidth: '120px' }}>Generic Monitoring</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: 'var(--ink-2)', minWidth: '120px' }}>Manual Governance</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((row, i) => (
                    <tr key={row.feature} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--surface)' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '4px' }}>{row.feature}</div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-3)', lineHeight: 1.4 }}>{row.detail}</div>
                      </td>
                      {(['kakunin', 'diy', 'generic', 'manual'] as const).map((col) => (
                        <td key={col} style={{ textAlign: 'center', padding: '14px 16px', fontSize: '18px', fontWeight: 700, color: colorMap[row[col]] }}>
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '80px 32px' }}>
            <div style={{ maxWidth: 'var(--container)', margin: '0 auto' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '40px' }}>Why Not Build It Yourself?</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '32px' }}>
                {[
                  {
                    title: 'CA infrastructure is non-trivial',
                    body: 'Building a certificate authority requires KMS key policies, certificate profile design, OCSP responder, revocation propagation, and renewal workflows. Most teams underestimate the ongoing maintenance.',
                  },
                  {
                    title: 'Behavioral baselines require statistical modeling',
                    body: 'Anomaly scoring that avoids false positives on variable workloads while catching real threats requires percentile tracking, weighted deviation models, and configurable thresholds per agent type.',
                  },
                  {
                    title: 'WORM logs require database-level enforcement',
                    body: 'Audit trail integrity under MiCA and the EU AI Act requires that even admin code cannot modify records. Postgres-rule WORM enforcement is straightforward to implement but easy to get wrong.',
                  },
                  {
                    title: 'Compliance evidence must be regulator-ready',
                    body: 'MiCA Article 71 and EU AI Act Article 11 require structured evidence packages on request. Generating these from raw logs is an engineering project — Kakunin generates them on demand.',
                  },
                ].map((item) => (
                  <div key={item.title} style={{ padding: '24px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>{item.title}</h3>
                    <p style={{ fontSize: '14px', color: 'var(--ink-2)', lineHeight: 1.6, margin: 0 }}>{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section style={{ padding: '80px 32px', textAlign: 'center' }}>
            <div style={{ maxWidth: '520px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '16px' }}>Ship compliance with less guesswork</h2>
              <p style={{ fontSize: '16px', color: 'var(--ink-2)', marginBottom: '32px', lineHeight: 1.6 }}>
                If your team is evaluating options, the real question is whether you want a bundle of point tools or a single compliance layer that already understands identity, scope, risk, and evidence.
              </p>
              <Link href="/pricing" className="btn btn--primary btn--lg">
                View Pricing →
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
