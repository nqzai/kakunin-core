import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import '../landing.css';
import './assessment.css';
import { AssessmentClient } from './AssessmentClient';

export const metadata: Metadata = {
  title: { absolute: 'Free Compliance Readiness Report for AI Agents | Kakunin' },
  description:
    'Get a free trust readiness report for your AI agent website. We scan public signals, highlight visible trust gaps, and email practical next steps to strengthen customer confidence.',
  alternates: { canonical: '/assessment' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/assessment',
    title: 'Free Compliance Readiness Report for AI Agents | Kakunin',
    description:
      'Scan your public site for AI agent trust signals, likely governance gaps, and practical next steps to strengthen buyer and customer confidence.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Free Compliance Readiness Report' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Compliance Readiness Report for AI Agents | Kakunin',
    description:
      'Scan your public site for AI agent trust signals, likely governance gaps, and practical next steps.',
    images: ['/og-image.png'],
  },
};

export default function AssessmentPage() {
  return (
    <>
      <SiteNav />
      <main className="assessment-page">
        <section className="assessment-hero">
          <div className="assessment-hero-noise" />
          <div className="container assessment-shell">
            <div className="assessment-copy">
              <span className="eyebrow">Free readiness report</span>
              <h1 className="assessment-title">
                See what your public site says about confidence in your AI agents.
              </h1>
              <p className="assessment-subtitle">
                Drop in a website URL and work email. We scan the public homepage for static signals,
                map the likely stack, and send a free report showing what a buyer, customer, or
                reviewer can already infer about your agent&apos;s trust posture, governance gaps, and
                readiness for higher-stakes use.
              </p>

              <div className="assessment-points">
                <div className="assessment-point">
                  <strong>Static scan only</strong>
                  <span>We inspect public HTML, metadata, and script hints. No login, no browser extension.</span>
                </div>
                <div className="assessment-point">
                  <strong>Email-delivered report</strong>
                  <span>You get a concise trust readout by email, with practical next steps and optional implementation resources.</span>
                </div>
                <div className="assessment-point">
                  <strong>Useful before any vendor choice</strong>
                  <span>The goal is to help you decide where identity, provenance, and oversight would most improve customer confidence.</span>
                </div>
              </div>

              <p className="assessment-note" style={{ marginTop: '18px' }}>
                If you want the architectural context first, compare our
                {' '}<Link href="/platform/non-human-identity">non-human identity model</Link>{' '}
                with the wider{' '}
                <Link href="/platform/ai-governance-tools">AI governance infrastructure layer</Link>{' '}
                before you run the report.
              </p>

              <div className="assessment-links">
                <Link href="/attestation-template" className="btn btn--dark">
                  See attestation template
                </Link>
                <Link href="/docs/quickstart-ai-agents" className="btn btn--ghost">
                  View setup docs
                </Link>
              </div>
            </div>

            <div className="assessment-panel">
              <AssessmentClient />
            </div>
          </div>
        </section>

        <section className="assessment-section">
          <div className="container assessment-grid">
            <div className="assessment-card">
              <div className="section-num">01 — WHAT YOU GET</div>
              <h2>Free report, not a generic lead form</h2>
              <p>
                The report highlights the detected ecosystem, the public trust signals already
                visible, the likely governance questions a buyer might raise, and the first place
                to tighten identity or accountability controls.
              </p>
              <p>
                Teams that want a concrete example of what “good” evidence looks like usually pair
                this with the <Link href="/attestation-template">attestation template</Link> and the
                {' '}<Link href="/api-docs">API reference</Link> to see how public trust signals connect
                to real implementation surfaces.
              </p>
              <ul className="assessment-list">
                <li>Detected AI stack and confidence level</li>
                <li>Likely EU AI Act, MiCA, and NIST relevance</li>
                <li>Trust gaps visible to customers, buyers, or internal reviewers</li>
                <li>Suggested next step and optional implementation resources</li>
              </ul>
            </div>

            <div className="assessment-card assessment-card--accent">
              <div className="section-num">02 — REAL-WORLD COST</div>
              <h2>Unchecked AI actions already create liability</h2>
              <p>
                This is not theoretical. When AI systems act with unclear authority, weak oversight,
                or misleading public claims, the cost can show up as compensation, fines, sanctions,
                or buyer distrust.
              </p>
              <ul className="assessment-list">
                <li><strong>Air Canada, February 2024:</strong> ordered to compensate a customer after its chatbot gave incorrect bereavement-fare guidance.</li>
                <li><strong>SEC, March 2024:</strong> Delphia and Global Predictions paid $400,000 to settle charges over false and misleading AI claims.</li>
                <li><strong>Mata v. Avianca, June 2023:</strong> lawyers were sanctioned $5,000 after filing fake citations generated by AI.</li>
                <li><strong>Rite Aid, December 2023:</strong> FTC settlement imposed a five-year ban on the retailer’s facial-recognition use after faulty matches and weak safeguards.</li>
              </ul>
            </div>

          </div>
        </section>

        <section className="assessment-section">
          <div className="container assessment-grid">
            <div className="assessment-card">
              <div className="section-num">03 — RESULTS EXPLAINER</div>
              <h2>How to read the score</h2>
              <p>
                The report estimates the risk of shipping an AI agent without a cryptographic identity
                certificate. Higher scores mean more exposure to impersonation, missing audit evidence,
                slower revocation, and weaker compliance proof.
              </p>
              <ul className="assessment-list">
                <li><strong>0-49:</strong> low exposure, but identity proof still improves trust.</li>
                <li><strong>50-69:</strong> moderate exposure, especially for AI or enterprise workflows.</li>
                <li><strong>70-84:</strong> high exposure, worth remediating before launch.</li>
                <li><strong>85-100:</strong> critical exposure, certificate-first is the safer path.</li>
              </ul>
            </div>

            <div className="assessment-card">
              <div className="section-num">04 — WHAT WE FLAG</div>
              <h2>What the heuristics look for</h2>
              <p>
                We only use public signals. The score rises when we see agent frameworks, regulated
                activity, or clear enterprise/compliance language, because those combinations tend to
                increase the cost of weak identity, unclear authority, or missing provenance.
              </p>
              <div className="assessment-stack">
                <span>Impersonation</span>
                <span>Auditability</span>
                <span>Revocation</span>
                <span>Regulatory proof</span>
              </div>
              <p className="assessment-note">
                The readout is decision support, not legal advice. The email turns it into a concrete
                next step for improving customer trust, governance, and buyer-readiness.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
