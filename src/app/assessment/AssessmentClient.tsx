'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';

type AssessmentRiskCategory = {
  label: string;
  score: number;
  reason: string;
};

type AssessmentReport = {
  segment: string;
  ecosystemLabel: string;
  frameworkLabels: string[];
  observedSignals: string[];
  externalEvidence: string[];
  missingTrustSignals: string[];
  whyKakuninNow: string;
  whyNotNow: string;
  recommendedNextStep: string;
  confidence: number;
  limitations: string[];
  summary: string;
  certificateRisk: {
    overallScore: number;
    overallLabel: string;
    headline: string;
    disclaimer: string;
    categories: AssessmentRiskCategory[];
  };
};

function getPreviewVariant(segment: string): {
  title: string;
  intro: string;
  matterLabel: string;
  transition: string;
  nextStepLabel: string;
} {
  switch (segment) {
    case 'regulated_operator':
      return {
        title: 'Your regulated AI trust readout is on the way.',
        intro:
          'If the public page was readable, the report will focus on what customers, partners, and reviewers can already infer about authority, provenance, and control in a trust-sensitive environment.',
        matterLabel: 'Why this matters in a regulated or high-trust environment',
        transition:
          'In higher-scrutiny contexts, the question is not only whether the agent works, but whether its authority and control boundaries are clear when something needs to be reviewed.',
        nextStepLabel: 'Priority next step',
      };
    case 'autonomous_enterprise_software':
      return {
        title: 'Your agent trust readout is on the way.',
        intro:
          'If the public page was readable, the report will focus on what a buyer, customer, or security reviewer can already infer about how responsibly the software acts on a user’s behalf.',
        matterLabel: 'Why this matters for customer trust',
        transition:
          'For customer-facing automation, trust usually depends on whether actions can be approved, traced, and contained when real workflows are involved.',
        nextStepLabel: 'Priority next step',
      };
    case 'early_ai_productivity_tool':
      return {
        title: 'Your AI trust readiness report is on the way.',
        intro:
          'If the public page was readable, the report will focus on what users and future enterprise buyers can already infer about how this product could scale into more trusted workflows.',
        matterLabel: 'Why this matters before autonomy expands',
        transition:
          'At this stage, stronger trust signals help the product grow into higher-autonomy use cases without creating credibility gaps later.',
        nextStepLabel: 'Best next step before scale',
      };
    default:
      return {
        title: 'Your free compliance readiness report is on the way.',
        intro:
          'If the public page was readable, the report will include observed public signals, confidence, missing trust controls, and concrete steps you can take to improve confidence in the way your agent acts on behalf of users.',
        matterLabel: 'Why this matters for trust',
        transition:
          'Where public evidence is thin, the useful next step is usually to clarify the real autonomy, authority, and oversight boundaries before making a larger implementation decision.',
        nextStepLabel: 'Priority next step',
      };
  }
}

export function AssessmentClient() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [leadId, setLeadId] = useState('');
  const [report, setReport] = useState<AssessmentReport | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteUrl,
          email,
          consent,
        }),
      });

      const payload = await res.json() as {
        error?: string;
        data?: {
          leadId?: string;
          message?: string;
          report?: AssessmentReport;
        };
      };

      if (!res.ok) {
        setError(payload.error ?? 'Something went wrong.');
        return;
      }

      setSubmitted(true);
      setLeadId(payload.data?.leadId ?? '');
      setReport(payload.data?.report ?? null);
    } catch {
      setError('We could not submit your assessment request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    const previewVariant = getPreviewVariant(report?.segment ?? 'insufficient_public_evidence');

    return (
      <div className="assessment-form assessment-form--success">
        <span className="assessment-badge">Report queued</span>
        <h3>{previewVariant.title}</h3>
        <p>
          We’ll email your assessment to <strong>{email}</strong> shortly. {previewVariant.intro}
        </p>
        {report ? (
          <div className="assessment-result">
            <div className="assessment-result-head">
              <span className="assessment-badge">Result preview</span>
              <h4>{report.ecosystemLabel}</h4>
              <p>{report.summary}</p>
              <p className="assessment-risk-flag">
                <strong>{Math.round(report.confidence * 100)}%</strong>
                <span>confidence in this public-evidence assessment</span>
              </p>
              <p className="assessment-risk-flag">
                <strong>{report.certificateRisk.overallScore}%</strong>
                <span>{report.certificateRisk.overallLabel} certificate risk without an identity certificate</span>
              </p>
            </div>

            <div className="assessment-result-grid">
              <div className="assessment-result-card">
                <span className="assessment-mini-label">Observed signals</span>
                <p>{report.observedSignals[0] ?? 'No strong public signals were extracted.'}</p>
                <small>{report.observedSignals.slice(1).join(' ')}</small>
              </div>
              <div className="assessment-result-card">
                <span className="assessment-mini-label">{previewVariant.matterLabel}</span>
                <p>{report.whyKakuninNow}</p>
              </div>
            </div>

            <div className="assessment-result-card">
              <span className="assessment-mini-label">What this suggests</span>
              <p>{previewVariant.transition}</p>
              {report.whyNotNow ? <small>{report.whyNotNow}</small> : null}
            </div>

            {report.missingTrustSignals.length ? (
              <div className="assessment-result-card">
                <span className="assessment-mini-label">Missing trust signals</span>
                <p>{report.missingTrustSignals.join(' ')}</p>
              </div>
            ) : null}

            {report.externalEvidence.length ? (
              <div className="assessment-result-card">
                <span className="assessment-mini-label">External evidence</span>
                <p>{report.externalEvidence[0]}</p>
                <small>{report.externalEvidence.slice(1).join(' ')}</small>
              </div>
            ) : null}

            <div className="assessment-risk-list">
              {report.certificateRisk.categories.map((risk) => (
                <div key={risk.label} className="assessment-risk-item">
                  <div className="assessment-risk-row">
                    <strong>{risk.label}</strong>
                    <span>{risk.score}%</span>
                  </div>
                  <div className="assessment-risk-bar" aria-hidden="true">
                    <span style={{ width: `${risk.score}%` }} />
                  </div>
                  <p>{risk.reason}</p>
                </div>
              ))}
            </div>

            <div className="assessment-result-card">
              <span className="assessment-mini-label">{previewVariant.nextStepLabel}</span>
              <p>{report.recommendedNextStep}</p>
              {report.limitations.length ? <small>{report.limitations.join(' ')}</small> : null}
            </div>
          </div>
        ) : null}
        {leadId ? <p className="assessment-id">Reference: {leadId}</p> : null}
        <div className="assessment-success-links">
          <Link href="/attestation-template" className="btn btn--primary">
            Review identity template
          </Link>
          <Link href="/docs/quickstart-ai-agents" className="btn btn--ghost">
            See implementation guide
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form className="assessment-form" onSubmit={handleSubmit}>
      <div className="assessment-form-head">
        <span className="assessment-badge">Free report</span>
        <h3>Scan your site and email the compliance readiness report.</h3>
        <p>
          We only need a public website URL and an email. The scan is conservative and static —
          we do not render the page in a browser for v1.
        </p>
      </div>

      <label className="assessment-field" htmlFor="websiteUrl">
        <span>Website URL</span>
        <input
          id="websiteUrl"
          name="websiteUrl"
          type="url"
          placeholder="https://example.com"
          value={websiteUrl}
          onChange={(event) => setWebsiteUrl(event.target.value)}
          required
        />
      </label>

      <label className="assessment-field" htmlFor="email">
        <span>Email</span>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label className="assessment-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>I consent to Kakunin scanning the public website and sending the report to my email.</span>
      </label>

      {error ? <div className="assessment-error">{error}</div> : null}

      <button className="btn btn--primary btn--lg assessment-submit" type="submit" disabled={loading || !consent}>
        {loading ? 'Preparing report…' : 'Get a $360 worth Readiness Report for Free'}
      </button>

      <div className="assessment-smallprint">
        <span>Public pages only</span>
        <span>EU AI Act · MiCA · NIST</span>
        <span>Email delivery</span>
      </div>

      <div className="assessment-explainer">
        <div>
          <span className="assessment-mini-label">How we score it</span>
          <p>
            We look for public AI-stack clues, then estimate how risky it would be to operate the
            agent without a cryptographic identity certificate.
          </p>
        </div>
        <div>
          <span className="assessment-mini-label">What the risk means</span>
          <p>
            Higher scores indicate more exposure to impersonation, auditability gaps, revocation
            delays, and weaker evidence for compliance reviews.
          </p>
        </div>
      </div>
    </form>
  );
}
