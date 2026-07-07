import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import '../persona-pages.css';

export const metadata: Metadata = {
  title: { absolute: 'MiCA Compliance for FinTech Founders — AI Agents for EU Markets | Kakunin' },
  description: 'Deploy trading, AML, and settlement AI agents into EU regulated markets with MiCA compliance, X.509 identity, and behavioral audit trails.',
  alternates: { canonical: '/for-fintech-founders' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/for-fintech-founders',
    title: 'MiCA Compliance for FinTech Founders — AI Agents for EU Markets | Kakunin',
    description: 'Deploy AI agents to regulated EU markets with MiCA compliance, X.509 identity, and behavioral audit trails.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — MiCA Compliance for FinTech Founders' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MiCA Compliance for FinTech Founders — Kakunin',
    description: 'Deploy AI agents to EU regulated markets with MiCA compliance and behavioral audit trails.',
    images: ['/og-image.png'],
  },
};

const breadcrumbSchema = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { '@type': 'ListItem', position: 2, name: 'For FinTech Founders', item: 'https://www.kakunin.ai/for-fintech-founders' },
  ],
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How quickly can a FinTech startup launch AI agents to EU regulated markets with Kakunin?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Technical integration takes about 15 minutes. A full production launch — including agent build, compliance review with a regulator, and beta deployment — typically takes 4–6 months versus 18 months without Kakunin. The compliance checklist, audit trail, and MiCA Art. 61–75 mapping are provided as part of the platform.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does Kakunin cost for a FinTech startup?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin charges per certified agent per month. Starter is $39/agent/month (minimum 5 agents, from $195/month). Pro is $99/agent/month (minimum 20 agents, from $1,980/month). Every plan includes a 30-day free trial. A typical trading agent handling €10–50M daily volume generates Kakunin costs equivalent to 0.05–0.1% of returns, paid off within a week of operation.',
      },
    },
    {
      '@type': 'Question',
      name: 'What AI agent use cases does Kakunin support for FinTech?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Kakunin supports quantitative trading agents (millisecond execution, X.509 identity, MiCA Art. 70 proof), AML and fraud detection agents (real-time risk scoring, FATF-compliant audit trail), settlement agents (atomic operations with behavioral proof, certificate revocation on anomaly), and supply chain finance agents. All receive cryptographic identity and immutable behavioral audit.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Kakunin create a competitive moat for FinTech companies?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'EU-regulated institutions (banks, asset managers, payment processors) require MiCA-compliant AI agents before they can deploy them. Kakunin provides the certified infrastructure — X.509 identity, behavioral audit, revocation — that competitors cannot easily replicate. First movers get 12+ months of market exclusivity while competitors wait 18 months to build equivalent compliance infrastructure.',
      },
    },
  ],
};

export default function ForFintechFoundersPage() {
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
            <span>For FinTech Founders</span>
          </div>
          <span className="eyebrow">Executive &amp; C-Suite</span>
          <h1 className="pp-hero-title">
            MiCA-compliant AI agents
            <em> for EU markets.</em>
          </h1>
          <p className="pp-hero-sub">
            Deploy trading, AML, and settlement agents with MiCA-compliant identity, behavioral audit
            trails, and regulator-ready evidence for EU markets.
          </p>
          <div className="pp-hero-ctas">
            <Link href="/pricing" className="btn btn--primary btn--lg">
              Pricing &amp; Plans →
            </Link>
            <Link href="/docs/case-study-trading" className="btn btn--ghost btn--lg">
              Trading Case Study
            </Link>
          </div>
          <div className="pp-hero-stats">
            <div className="stat">
              <span className="stat-v">3×</span>
              <span className="stat-l">Faster operations</span>
            </div>
            <div className="stat">
              <span className="stat-v">6 months</span>
              <span className="stat-l">Launch vs 18-month alternatives</span>
            </div>
            <div className="stat">
              <span className="stat-v">$2.7B</span>
              <span className="stat-l">TAM by 2028</span>
            </div>
            <div className="stat">
              <span className="stat-v">$100K+</span>
              <span className="stat-l">Annual compliance savings</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Market Positioning ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">01 — WHY NOW</div>
            <h2 className="pp-section-title">Why AI agents win in FinTech</h2>
            <p className="pp-section-sub">
              Regulated markets are the largest untapped AI opportunity. Kakunin removes the only blocker.
            </p>
          </div>
          <div className="pp-steps">
            <div className="pp-step">
              <div className="pp-step-num" style={{ fontSize: '20px' }}>Speed</div>
              <h3>Execution advantage</h3>
              <p>Agents execute trades, AML checks, settlements in milliseconds. Humans take hours. 1ms latency = millions in competitive edge.</p>
              <span className="pp-step-code" style={{ color: 'var(--green-deep)' }}>ROI: 10–50× faster execution</span>
            </div>
            <div className="pp-step">
              <div className="pp-step-num" style={{ fontSize: '20px' }}>Legal</div>
              <h3>Compliance automation</h3>
              <p>Kakunin handles identity, audit trails, and regulatory proof. You focus on market logic. MiCA Art. 61–75 built into every agent.</p>
              <span className="pp-step-code" style={{ color: 'var(--green-deep)' }}>ROI: $100K+ legal savings</span>
            </div>
            <div className="pp-step">
              <div className="pp-step-num" style={{ fontSize: '20px' }}>Entry</div>
              <h3>Market access</h3>
              <p>Licensed EU banks can&apos;t easily deploy AI. Kakunin removes the blocker. Launch in 6 months instead of 18. First to market wins.</p>
              <span className="pp-step-code" style={{ color: 'var(--green-deep)' }}>ROI: 12-month time-to-revenue</span>
            </div>
            <div className="pp-step">
              <div className="pp-step-num" style={{ fontSize: '20px' }}>Moat</div>
              <h3>Competitive moat</h3>
              <p>Competitors can&apos;t match your speed without a regulatory framework. Kakunin is the licensed infrastructure moat. Hard to replicate.</p>
              <span className="pp-step-code" style={{ color: 'var(--green-deep)' }}>ROI: Defensible 3–5 year lead</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Launch Path ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">02 — GO-TO-MARKET</div>
            <h2 className="pp-section-title">Your 6-month launch path</h2>
            <p className="pp-section-sub">
              From first API call to GA launch in regulated EU markets.
            </p>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Month 1–2: Build agent</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Integrate Kakunin SDK (15 min setup)</li>
                <li>Build trading/AML/settlement logic</li>
                <li>Register agent, issue X.509 cert</li>
                <li>Stream behavioral events</li>
              </ul>
              <span className="pp-feature-tag">Cost: €0–5K (dev time only)</span>
            </div>
            <div className="pp-feature">
              <h3>Month 3: Compliance review</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Run compliance checklist (provided)</li>
                <li>Audit trail review with Kakunin</li>
                <li>Bank/regulator pre-approval</li>
                <li>Risk score baseline established</li>
              </ul>
              <span className="pp-feature-tag">Cost: €10–30K (consulting/legal)</span>
            </div>
            <div className="pp-feature">
              <h3>Month 4–5: Beta launch</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>10–20 early-access customers</li>
                <li>Live trading/AML on &lt;10% capital</li>
                <li>Monitor risk scores, audit logs</li>
                <li>Refine behavioral monitoring</li>
              </ul>
              <span className="pp-feature-tag">Cost: 5–10% commission on volume</span>
            </div>
            <div className="pp-feature">
              <h3>Month 6: GA &amp; scale</h3>
              <ul className="pp-checklist" style={{ marginTop: '8px' }}>
                <li>Public launch to all EU banks</li>
                <li>Full capacity deployment</li>
                <li>Regulator validation complete</li>
                <li>SLA 99.9% uptime, &lt;60s revocation</li>
              </ul>
              <span className="pp-feature-tag">Cost: Kakunin licensing + ops</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Pricing & ROI ---- */}
      <section className="pp-section">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">03 — ECONOMICS</div>
            <h2 className="pp-section-title">Pricing model &amp; economics</h2>
          </div>
          <div className="pp-features">
            <div className="pp-feature">
              <h3>Per-agent pricing</h3>
              <p>Pay per certified agent per month. Starter from $195/mo (5 agents). Pro from $1,980/mo (20 agents). 30-day free trial on every plan.</p>
              <Link href="/pricing" className="pp-feature-tag">View pricing</Link>
            </div>
            <div className="pp-feature">
              <h3>Breakeven analysis</h3>
              <p>Typical trading agent handles €10–50M daily volume. Kakunin cost = 0.05–0.1% of agent returns. Paid off in one week.</p>
            </div>
            <div className="pp-feature">
              <h3>Market exclusivity</h3>
              <p>Competitors without Kakunin can&apos;t launch to EU markets. Your agents are compliant from day 1. Market exclusivity worth $2–10M in NPV.</p>
            </div>
            <div className="pp-feature">
              <h3>Hidden savings</h3>
              <p>No expensive audit tools, no 18-month legal reviews, no custom compliance infrastructure. Kakunin = 6-month legal cost avoided.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Use Cases ---- */}
      <section className="pp-section pp-section--alt">
        <div className="pp-section-inner">
          <div className="pp-section-head">
            <div className="pp-section-num">04 — USE CASES</div>
            <h2 className="pp-section-title">Built for your agents</h2>
          </div>
          <div className="pp-resources">
            <Link href="/docs/case-study-trading" className="pp-resource-link">
              <h3>Quantitative Trading Agents</h3>
              <p>Execute strategies at millisecond latency. X.509 identity. Behavioral audit. MiCA Art. 70 proof.</p>
            </Link>
            <Link href="/docs/case-study-aml" className="pp-resource-link">
              <h3>AML &amp; Fraud-Detection Agents</h3>
              <p>Real-time risk scoring. Suspicious activity logs. Regulator-accessible audit trail. FATF compliant.</p>
            </Link>
            <Link href="/docs/case-study-supply-chain" className="pp-resource-link">
              <h3>Settlement &amp; Supply Chain Agents</h3>
              <p>Atomic operations with behavioral proof. Certificate revocation on anomaly. Automated reconciliation.</p>
            </Link>
            <Link href="/docs/case-studies" className="pp-resource-link">
              <h3>All 6 Case Studies</h3>
              <p>Trading, healthcare, legal, supply chain, AML, and public sector regulated deployments.</p>
            </Link>
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="pp-section pp-section--dark">
        <div className="pp-cta">
          <p className="eyebrow" style={{ justifyContent: 'center', marginBottom: '20px' }}>Move first</p>
          <h2 className="pp-cta-title">Ready to launch to EU regulated markets?</h2>
          <p className="pp-cta-sub">
            MiCA compliance in 15 minutes. $2.7B TAM waiting. Defensible to the regulator — available today.
          </p>
          <div className="pp-cta-actions">
            <Link href="/pricing" className="btn btn--primary btn--lg">
              See Plans &amp; Pricing →
            </Link>
            <Link href="/docs/compliance-checklist" className="btn btn--ghost btn--lg" style={{ color: 'var(--paper)', borderColor: 'rgba(244,241,232,0.25)' }}>
              Compliance checklist
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
