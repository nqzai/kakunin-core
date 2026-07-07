/**
 * Email Templates
 *
 * One function per email type. Each returns { subject, html }.
 * Brand: cream #F4F1E8 background, green #2B934F accent, Archivo font.
 * All non-auth emails include unsubscribe footer (CAN-SPAM / GDPR).
 */

export type EmailTemplate =
  | 'auth.signup'
  | 'auth.email_changed'
  | 'auth.password_recovery'
  | 'billing.trial_started'
  | 'billing.payment_recovered'
  | 'lead.assessment_ready'
  | 'certificate.issued'
  | 'certificate.expiring'
  | 'certificate.revoked'
  | 'certificate.auto_revoked'
  | 'risk.pre_revocation_warning'
  | 'risk.alert'
  | 'agent.halted'
  | 'report.ready'
  | 'report.failed'
  | 'quota.warning'
  | 'billing.trial_ending_7d'
  | 'billing.trial_ending_2d'
  | 'billing.payment_failed'
  | 'billing.subscription_cancelled';

export interface EmailPayload {
  subject: string;
  html: string;
}

// ── Shared layout ────────────────────────────────────────────────────────────

function layout(body: string, unsubscribeUrl?: string): string {
  const footer = unsubscribeUrl
    ? `<tr><td style="padding:24px 40px;border-top:1px solid #E8E4DA;text-align:center;">
        <p style="margin:0;font-size:12px;color:#8A8C84;font-family:monospace;">
          You received this because you are a Kakunin tenant admin.<br/>
          <a href="${unsubscribeUrl}" style="color:#8A8C84;">Unsubscribe</a>
          &nbsp;&middot;&nbsp;
          <a href="https://kakunin.ai" style="color:#8A8C84;">kakunin.ai</a>
          &nbsp;&middot;&nbsp;
          <a href="https://discord.gg/FGR4Z4Rxh" style="color:#8A8C84;">Support (Discord)</a>
        </p>
      </td></tr>`
    : `<tr><td style="padding:24px 40px;border-top:1px solid #E8E4DA;text-align:center;">
        <p style="margin:0;font-size:12px;color:#8A8C84;font-family:monospace;">
          <a href="https://kakunin.ai" style="color:#8A8C84;">kakunin.ai</a>
          &nbsp;&middot;&nbsp;ai@kakunin.ai
          &nbsp;&middot;&nbsp;
          <a href="https://discord.gg/FGR4Z4Rxh" style="color:#8A8C84;">Support (Discord)</a>
        </p>
      </td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Kakunin</title>
</head>
<body style="margin:0;padding:0;background:#F4F1E8;font-family:'Archivo',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1E8;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border:1px solid #E2DCC6;border-radius:14px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Brand bar — 4px green accent, brand pattern from design system -->
        <tr><td style="background:#2B934F;height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <!-- Logo header — cream canvas matches logo.png background exactly -->
        <tr>
          <td style="background:#F4F1E8;padding:22px 40px;border-bottom:1px solid #E2DCC6;">
            <a href="https://kakunin.ai" style="text-decoration:none;display:inline-block;">
              <img src="https://kakunin.ai/logo.png" alt="KAKUNIN" width="120" height="auto"
                   style="display:block;height:auto;border:0;outline:none;" />
            </a>
          </td>
        </tr>
        <!-- Body -->
        ${body}
        <!-- Footer -->
        ${footer}
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;background:#2B934F;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;letter-spacing:0.01em;">${text}</a>`;
}

function badge(label: string, color = '#2B934F'): string {
  return `<span style="display:inline-block;background:${color}20;color:${color};font-family:monospace;font-size:11px;font-weight:700;letter-spacing:0.08em;padding:4px 10px;border-radius:100px;text-transform:uppercase;">${label}</span>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function assessmentEmailVariant(segment: string): {
  subjectLead: string;
  intro: string;
  matterLabel: string;
  transition: string;
  resourceIntro: string;
} {
  switch (segment) {
    case 'regulated_operator':
      return {
        subjectLead: 'regulated AI trust readiness',
        intro:
          'We scanned public pages and reporting to estimate what customers, partners, and reviewers can already infer about how safely and accountably your AI agent operates in a trust-sensitive context.',
        matterLabel: 'Why this matters in a regulated or high-trust environment',
        transition:
          'For this type of product, the credibility question is not just whether the agent works, but whether its authority, provenance, and control boundaries can be explained when scrutiny increases.',
        resourceIntro:
          'If you decide to formalize agent identity and provenance, these resources show one practical path for higher-assurance, reviewable deployment.',
      };
    case 'autonomous_enterprise_software':
      return {
        subjectLead: 'agent trust readiness',
        intro:
          'We scanned public pages and reporting to estimate what a buyer, customer, or security reviewer can already infer about how responsibly your software acts on a user’s behalf.',
        matterLabel: 'Why this matters for customer trust',
        transition:
          'For agentic enterprise software, trust tends to hinge on whether automation can be approved, traced, and contained when it touches real customer workflows.',
        resourceIntro:
          'If you decide to formalize agent identity and provenance, these resources show one practical implementation path for accountable automation.',
      };
    case 'early_ai_productivity_tool':
      return {
        subjectLead: 'AI trust readiness',
        intro:
          'We scanned public pages and reporting to estimate what users and future enterprise buyers can already infer about how your AI product will scale into more trusted workflows.',
        matterLabel: 'Why this matters before autonomy expands',
        transition:
          'At this stage, the opportunity is to strengthen trust expectations early so the product can evolve into higher-autonomy use cases without creating avoidable credibility gaps later.',
        resourceIntro:
          'If you decide to put stronger identity and provenance controls in place as the product matures, these resources show one practical path.',
      };
    default:
      return {
        subjectLead: 'AI agent trust readiness',
        intro:
          'We scanned public pages and reporting to estimate what a buyer, customer, or internal reviewer can already infer about your agent’s trust posture.',
        matterLabel: 'Why this matters for trust',
        transition:
          'Where public trust evidence is thin, the most useful next step is usually to clarify the real autonomy, authority, and control boundaries before making a larger implementation decision.',
        resourceIntro:
          'If you decide to formalize agent identity and provenance, these resources show one practical implementation path.',
      };
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): EmailPayload {
  switch (template) {
    case 'auth.signup':
      return authSignup(data);
    case 'auth.email_changed':
      return authEmailChanged(data);
    case 'auth.password_recovery':
      return authPasswordRecovery(data);
    case 'billing.trial_started':
      return billingTrialStarted(data);
    case 'billing.payment_recovered':
      return billingPaymentRecovered(data);
    case 'lead.assessment_ready':
      return assessmentReady(data);
    case 'certificate.issued':
      return certificateIssued(data);
    case 'certificate.expiring':
      return certificateExpiring(data);
    case 'certificate.revoked':
      return certificateRevoked(data);
    case 'certificate.auto_revoked':
      return certificateAutoRevoked(data);
    case 'risk.pre_revocation_warning':
      return preRevocationWarning(data);
    case 'risk.alert':
      return riskAlert(data);
    case 'agent.halted':
      return agentHalted(data);
    case 'report.ready':
      return reportReady(data);
    case 'report.failed':
      return reportFailed(data);
    case 'quota.warning':
      return quotaWarning(data);
    case 'billing.trial_ending_7d':
      return billingTrialEnding(data);
    case 'billing.trial_ending_2d':
      return billingTrialEndingUrgent(data);
    case 'billing.payment_failed':
      return billingPaymentFailed(data);
    case 'billing.subscription_cancelled':
      return billingSubscriptionCancelled(data);
    default:
      throw new Error(`Unknown email template: ${String(template)}`);
  }
}

// 1. auth.signup ──────────────────────────────────────────────────────────────
function authSignup(data: Record<string, unknown>): EmailPayload {
  const name = String(data.name ?? 'there');
  const dashboardUrl = 'https://kakunin.ai/dashboard';
  const docsUrl = 'https://kakunin.ai/docs';

  return {
    subject: 'Welcome to Kakunin — your workspace is ready',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:monospace;color:#2B934F;text-transform:uppercase;letter-spacing:0.08em;">Welcome</p>
        <h1 style="margin:0 0 24px;font-size:26px;font-weight:900;color:#1A1C16;line-height:1.15;">Hi ${name}, you're in.</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your Kakunin workspace is provisioned. Start by certifying your first agent —
          every certified agent gets an X.509 identity, behaviour monitoring, and
          MiCA-ready compliance reporting.
        </p>
        <p style="margin:0 0 32px;">${btn('Open dashboard', dashboardUrl)}&nbsp;&nbsp;<a href="${docsUrl}" style="font-size:14px;color:#2B934F;">Read docs →</a></p>
        <p style="margin:0;font-size:13px;color:#8A8C84;line-height:1.5;">
          Questions? Reply to this email — we read every one.
        </p>
      </td></tr>`,
      // No unsubscribe on auth emails
    ),
  };
}

// 2. billing.trial_started ────────────────────────────────────────────────────
function billingTrialStarted(data: Record<string, unknown>): EmailPayload {
  const planName = String(data.planName ?? 'Starter');
  const trialEnds = String(data.trialEnds ?? 'in 30 days');
  const dashboardUrl = 'https://kakunin.ai/dashboard/get-started';
  const docsUrl = 'https://kakunin.ai/docs';

  return {
    subject: `Your Kakunin trial is active — 30 days free`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Trial activated')}</p>
        <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;color:#1A1C16;line-height:1.15;">
          30 days free. No charge until ${trialEnds}.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your <strong>${planName}</strong> trial is live. Start certifying agents —
          issue X.509 certificates, stream behaviour events, and generate
          MiCA-ready compliance reports.
        </p>
        <table style="width:100%;border:1px solid #E8E4DA;border-radius:8px;border-collapse:collapse;margin-bottom:28px;">
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;width:140px;">Plan</td>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${planName}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#8A8C84;font-family:monospace;">Card charged</td>
            <td style="padding:12px 16px;font-size:13px;color:#1A1C16;font-family:monospace;">${trialEnds}</td>
          </tr>
        </table>
        <p style="margin:0 0 24px;">
          ${btn('Open dashboard', dashboardUrl)}&nbsp;&nbsp;
          <a href="${docsUrl}" style="font-size:14px;color:#2B934F;">API docs →</a>
        </p>
        <p style="margin:0;font-size:13px;color:#8A8C84;line-height:1.5;">
          Questions? Reply to this email — we read every one.
        </p>
      </td></tr>`,
    ),
  };
}

function billingPaymentRecovered(data: Record<string, unknown>): EmailPayload {
  const planName = String(data.planName ?? 'your paid plan');
  const billingUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: 'Payment recovered — your Kakunin account is active again',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Payment recovered')}</p>
        <h1 style="margin:0 0 20px;font-size:24px;font-weight:900;color:#1A1C16;line-height:1.15;">
          Access restored.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          We successfully processed your latest payment and restored your workspace to
          <strong>${planName}</strong>. Certificate monitoring, reports, and webhooks are active again.
        </p>
        <p style="margin:0 0 24px;">${btn('Open billing', billingUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 3. lead.assessment_ready ────────────────────────────────────────────────────
function assessmentReady(data: Record<string, unknown>): EmailPayload {
  const websiteDomain = String(data.websiteDomain ?? 'your site');
  const websiteUrl = String(data.websiteUrl ?? '');
  const segment = String(data.segment ?? 'insufficient_public_evidence');
  const ecosystemLabel = String(data.ecosystemLabel ?? 'Custom / Unknown');
  const summary = String(data.summary ?? '');
  const scanStatus = String(data.scanStatus ?? 'completed');
  const confidence = Number(data.confidence ?? 0);
  const frameworkLabels = Array.isArray(data.frameworkLabels)
    ? data.frameworkLabels.map((item) => String(item)).filter(Boolean)
    : [];
  const observedSignals = Array.isArray(data.observedSignals)
    ? data.observedSignals.map((item) => String(item)).filter(Boolean)
    : [];
  const missingTrustSignals = Array.isArray(data.missingTrustSignals)
    ? data.missingTrustSignals.map((item) => String(item)).filter(Boolean)
    : [];
  const whyKakuninNow = String(data.whyKakuninNow ?? 'A manual trust review is the right next step.');
  const whyNotNow = String(data.whyNotNow ?? '');
  const recommendedNextStep = String(data.recommendedNextStep ?? 'Manual review is recommended.');
  const limitations = Array.isArray(data.limitations)
    ? data.limitations.map((item) => String(item)).filter(Boolean)
    : [];
  const ctaPath = String(data.ctaPath ?? '/docs/quickstart-ai-agents');
  const certificateRisk = (data.certificateRisk as {
    overallScore?: number;
    overallLabel?: string;
    headline?: string;
    disclaimer?: string;
    categories?: Array<{ label?: string; score?: number; reason?: string }>;
  } | undefined) ?? {};
  const attestationUrl = String(data.attestationUrl ?? 'https://kakunin.ai/attestation-template');
  const setupUrl = String(data.setupUrl ?? `https://kakunin.ai${ctaPath}`);
  const variant = assessmentEmailVariant(segment);

  const frameworkHtml = frameworkLabels.length
    ? frameworkLabels
        .map((label) => `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;border:1px solid #D9D4C7;border-radius:999px;font-family:monospace;font-size:11px;color:#1A1C16;background:#F8F6EF;">${label}</span>`)
        .join('')
    : `<span style="display:inline-block;margin:0 8px 8px 0;padding:6px 10px;border:1px dashed #D9D4C7;border-radius:999px;font-family:monospace;font-size:11px;color:#8A8C84;background:#FAF8F2;">No strong public signals</span>`;

  const observedSignalHtml = observedSignals.length
    ? observedSignals
        .slice(0, 4)
        .map((signal) => `<li style="margin:0 0 8px;">${signal}</li>`)
        .join('')
    : '<li style="margin:0 0 8px;">Public evidence was too sparse for a strong differentiated assessment.</li>';

  const missingSignalHtml = missingTrustSignals.length
    ? missingTrustSignals
        .slice(0, 3)
        .map((signal) => `<li style="margin:0 0 8px;">${signal}</li>`)
        .join('')
    : '<li style="margin:0 0 8px;">No material public trust gaps were highlighted from the scan alone.</li>';

  const externalEvidence = Array.isArray(data.externalEvidence)
    ? data.externalEvidence.map((item) => String(item)).filter(Boolean)
    : [];

  const externalEvidenceHtml = externalEvidence.length
    ? externalEvidence
        .slice(0, 3)
        .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
        .join('')
    : '<li style="margin:0 0 8px;">No high-signal public reporting materially changed this assessment.</li>';

  const riskRows = (certificateRisk.categories ?? []).length
    ? (certificateRisk.categories ?? [])
        .map((entry) => {
          const score = Math.max(0, Math.min(100, Math.round(Number(entry.score ?? 0))));
          return `
            <tr>
              <td style="padding:10px 12px;border-top:1px solid #E8E4DA;font-size:13px;color:#1A1C16;">${String(entry.label ?? 'Risk')}</td>
              <td style="padding:10px 12px;border-top:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;text-align:right;">${score}%</td>
            </tr>
            <tr>
              <td colspan="2" style="padding:0 12px 12px;border-bottom:1px solid #E8E4DA;font-size:12px;color:#8A8C84;line-height:1.5;">${String(entry.reason ?? '')}</td>
            </tr>`;
        })
        .join('')
    : `<tr><td colspan="2" style="padding:12px 16px;font-size:13px;color:#8A8C84;">No certificate-risk categories were generated.</td></tr>`;

  return {
    subject: `Your ${variant.subjectLead} report is ready for ${websiteDomain}`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Free report ready')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          We reviewed ${websiteDomain}.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          ${variant.intro} Confidence:
          <strong> ${Math.round(confidence * 100)}%</strong>.
        </p>
        <table style="width:100%;border:1px solid #E8E4DA;border-radius:8px;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;width:160px;">Website</td>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${websiteDomain}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;">Detected stack</td>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${ecosystemLabel}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;">Frameworks</td>
            <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;">${frameworkHtml}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;font-size:13px;color:#8A8C84;font-family:monospace;">Segment</td>
            <td style="padding:12px 16px;font-size:13px;color:#1A1C16;line-height:1.5;">${segment.replaceAll('_', ' ')}</td>
          </tr>
        </table>
        <div style="margin:0 0 18px;padding:16px;border:1px solid #E8E4DA;border-radius:12px;background:#FBF9F3;">
          <p style="margin:0 0 10px;font-size:13px;font-family:monospace;color:#2B934F;text-transform:uppercase;letter-spacing:0.08em;">Observed public signals</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4C44;line-height:1.6;">${observedSignalHtml}</ul>
        </div>
        <div style="margin:0 0 18px;padding:16px;border:1px solid #E8E4DA;border-radius:12px;background:#FFFFFF;">
          <p style="margin:0 0 10px;font-size:13px;font-family:monospace;color:#1A1C16;text-transform:uppercase;letter-spacing:0.08em;">Missing trust signals</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4C44;line-height:1.6;">${missingSignalHtml}</ul>
        </div>
        <div style="margin:0 0 18px;padding:16px;border:1px solid #E8E4DA;border-radius:12px;background:#FFFFFF;">
          <p style="margin:0 0 10px;font-size:13px;font-family:monospace;color:#1A1C16;text-transform:uppercase;letter-spacing:0.08em;">External evidence</p>
          <ul style="margin:0;padding-left:18px;font-size:14px;color:#4A4C44;line-height:1.6;">${externalEvidenceHtml}</ul>
        </div>
        <div style="margin:0 0 18px;padding:16px;border:1px solid #E8E4DA;border-radius:12px;background:#FBF9F3;">
          <p style="margin:0 0 10px;font-size:13px;font-family:monospace;color:#2B934F;text-transform:uppercase;letter-spacing:0.08em;">Risk if you ship without a certificate</p>
          <h2 style="margin:0 0 8px;font-size:18px;line-height:1.25;color:#1A1C16;">${String(certificateRisk.headline ?? 'Certificate risk estimate unavailable.')}</h2>
          <p style="margin:0 0 14px;font-size:14px;color:#4A4C44;line-height:1.6;">${String(certificateRisk.disclaimer ?? 'Heuristic estimate based on public signals.')}</p>
          <table style="width:100%;border-collapse:collapse;margin-top:8px;">${riskRows}</table>
        </div>
        <p style="margin:0 0 16px;font-size:14px;color:#4A4C44;line-height:1.6;">${summary}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4A4C44;line-height:1.6;">${variant.transition}</p>
        <div style="margin:0 0 20px;padding:16px;border:1px solid #E8E4DA;border-radius:12px;background:#FFFFFF;">
          <p style="margin:0 0 8px;font-size:13px;font-family:monospace;color:#1A1C16;text-transform:uppercase;letter-spacing:0.08em;">${variant.matterLabel}</p>
          <p style="margin:0 0 12px;font-size:14px;color:#4A4C44;line-height:1.6;">${whyKakuninNow}</p>
          ${
            whyNotNow
              ? `<p style="margin:0;font-size:13px;color:#8A8C84;line-height:1.6;">${whyNotNow}</p>`
              : ''
          }
        </div>
        ${
          scanStatus === 'limited'
            ? `<p style="margin:0 0 20px;font-size:13px;color:#8A8C84;line-height:1.5;">
                We could not fully read the page, so this is a conservative first-pass result.
                If you want a more precise review, point us at the canonical homepage or a public docs page.
              </p>`
            : ''
        }
        ${
          limitations.length
            ? `<p style="margin:0 0 16px;font-size:13px;color:#8A8C84;line-height:1.6;">Limitations: ${limitations.join(' ')}</p>`
            : ''
        }
        <p style="margin:0 0 16px;font-size:14px;color:#4A4C44;line-height:1.6;"><strong>Priority next step:</strong> ${recommendedNextStep}</p>
        <p style="margin:0 0 12px;font-size:14px;color:#4A4C44;line-height:1.6;">
          ${variant.resourceIntro}
        </p>
        <p style="margin:0 0 28px;">${btn('Review identity template', attestationUrl)}&nbsp;&nbsp;${btn('See implementation guide', setupUrl)}</p>
        ${
          websiteUrl
            ? `<p style="margin:0;font-size:13px;color:#8A8C84;line-height:1.5;">
                Scanned URL: <a href="${websiteUrl}" style="color:#2B934F;">${websiteUrl}</a>
              </p>`
            : ''
        }
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 5. certificate.issued ───────────────────────────────────────────────────────
function certificateIssued(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const certSerial = String(data.certSerial ?? '');
  const validUntil = String(data.validUntil ?? '');
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `Agent "${agentName}" certified — certificate ready`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Certificate issued')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">"${agentName}" is certified.</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          An X.509 certificate has been issued via AWS KMS. The agent is now live with
          behaviour monitoring active.
        </p>
        <table style="width:100%;border:1px solid #E8E4DA;border-radius:8px;border-collapse:collapse;margin-bottom:28px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;width:140px;">Agent</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${agentName}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;">Serial</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${certSerial}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#8A8C84;font-family:monospace;">Valid until</td>
              <td style="padding:12px 16px;font-size:13px;color:#1A1C16;font-family:monospace;">${validUntil}</td></tr>
        </table>
        <p style="margin:0;">${btn('View agent', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

function certificateExpiring(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const certSerial = String(data.certSerial ?? '');
  const validUntil = String(data.validUntil ?? '');
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `Certificate expiring soon — "${agentName}"`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Certificate expires in 7 days', '#E67E22')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          "${agentName}" needs certificate attention.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          This agent's active certificate will expire on <strong>${validUntil}</strong>.
          Renew or re-certify it before expiry to avoid interruption to signing, verification,
          and monitoring flows.
        </p>
        <table style="width:100%;border:1px solid #E8E4DA;border-radius:8px;border-collapse:collapse;margin-bottom:28px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;width:140px;">Agent</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${agentName}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;">Serial</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${certSerial}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#8A8C84;font-family:monospace;">Expires</td>
              <td style="padding:12px 16px;font-size:13px;color:#1A1C16;font-family:monospace;">${validUntil}</td></tr>
        </table>
        <p style="margin:0;">${btn('Review agent', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 6. certificate.revoked ──────────────────────────────────────────────────────
function certificateRevoked(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const reason = String(data.reason ?? 'Manual revocation');
  const revokedAt = String(data.revokedAt ?? new Date().toISOString());
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `⚠ Agent "${agentName}" certificate revoked`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Certificate revoked', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">Certificate revoked for "${agentName}".</h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          This agent's X.509 certificate has been revoked and is no longer valid.
          Any systems relying on this certificate should be updated immediately.
        </p>
        <table style="width:100%;border:1px solid #E8E4DA;border-radius:8px;border-collapse:collapse;margin-bottom:28px;">
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;width:140px;">Agent</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;font-family:monospace;">${agentName}</td></tr>
          <tr><td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#8A8C84;font-family:monospace;">Reason</td>
              <td style="padding:12px 16px;border-bottom:1px solid #E8E4DA;font-size:13px;color:#1A1C16;">${reason}</td></tr>
          <tr><td style="padding:12px 16px;font-size:13px;color:#8A8C84;font-family:monospace;">Revoked at</td>
              <td style="padding:12px 16px;font-size:13px;color:#1A1C16;font-family:monospace;">${revokedAt}</td></tr>
        </table>
        <p style="margin:0;">${btn('View audit log', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 11. certificate.auto_revoked ────────────────────────────────────────────────
function certificateAutoRevoked(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const riskScore = Number(data.riskScore ?? 0).toFixed(2);
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `Agent "${agentName}" auto-revoked — sustained high risk`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Auto-revoked', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          "${agentName}" was automatically revoked.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          This agent's 30-day rolling risk score reached <strong>${riskScore}</strong>,
          exceeding the auto-revocation threshold of 0.85. The certificate has been
          revoked and the agent is no longer active.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Review the behaviour log before re-certifying.
        </p>
        <p style="margin:0;">${btn('Review behaviour log', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

function preRevocationWarning(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const score = Number(data.score ?? 0).toFixed(2);
  const eventType = String(data.eventType ?? 'unknown');
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `Pre-revocation warning — "${agentName}" crossed 0.75 risk`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Pre-revocation warning', '#E67E22')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          "${agentName}" is approaching the auto-revocation threshold.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Kakunin recorded a risk score of <strong>${score}</strong> on
          <code style="font-family:monospace;background:#F0EDE6;padding:2px 6px;border-radius:4px;">${eventType}</code>.
          This is below automatic revocation, but it is high enough to warrant immediate review before the
          certificate crosses the hard stop at 0.85.
        </p>
        <p style="margin:0;">${btn('Review agent activity', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 10. risk.alert ──────────────────────────────────────────────────────────────
function riskAlert(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const score = Number(data.score ?? 0).toFixed(2);
  const eventType = String(data.eventType ?? 'unknown');
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `🔴 High-risk activity on agent "${agentName}" (score: ${score})`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('High risk', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          High-risk activity detected.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Agent <strong>${agentName}</strong> triggered a risk score of
          <strong style="color:#C0392B;">${score}</strong> on event
          <code style="font-family:monospace;background:#F0EDE6;padding:2px 6px;border-radius:4px;">${eventType}</code>.
          If the rolling average exceeds 0.85, the certificate will be automatically revoked.
        </p>
        <p style="margin:0;">${btn('Review risk profile', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

function agentHalted(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const agentId = String(data.agentId ?? '');
  const reason = String(data.reason ?? 'Manual halt');
  const haltedAt = String(data.haltedAt ?? new Date().toISOString());
  const dashboardUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;

  return {
    subject: `Agent halted — "${agentName}"`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Agent halted', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          "${agentName}" has been halted.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          The agent was stopped and suspended at <strong>${haltedAt}</strong>. If an active certificate
          existed, it was revoked as part of the halt sequence.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Halt reason: <strong>${reason}</strong>
        </p>
        <p style="margin:0;">${btn('Review halt receipt', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 12. report.ready ────────────────────────────────────────────────────────────
function reportReady(data: Record<string, unknown>): EmailPayload {
  const period = String(data.period ?? 'Latest period');
  const reportId = String(data.reportId ?? '');
  const reportUrl = `https://kakunin.ai/dashboard/reports/${reportId}`;

  return {
    subject: `Compliance report ready — ${period}`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Report ready')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          Your compliance report is ready.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          The MiCA &amp; EU AI Act compliance report for <strong>${period}</strong>
          has been generated and is ready to download.
        </p>
        <p style="margin:0;">${btn('View report', reportUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

function reportFailed(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'this agent');
  const reportId = String(data.reportId ?? '');
  const reportsUrl = reportId
    ? `https://kakunin.ai/dashboard/reports/${reportId}`
    : 'https://kakunin.ai/dashboard/reports';

  return {
    subject: `Compliance report failed — ${agentName}`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Report failed', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          We couldn't generate this compliance report.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Report generation failed for <strong>${agentName}</strong>. No report was delivered,
          and the record has been marked as failed so you can retry once the underlying issue is resolved.
        </p>
        <p style="margin:0;">${btn('Review reports', reportsUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

function quotaWarning(data: Record<string, unknown>): EmailPayload {
  const agentName = String(data.agentName ?? 'Unknown agent');
  const current = Number(data.current ?? 0);
  const limit = Number(data.limit ?? 0);
  const percentage = Number(data.percentage ?? 0);
  const dashboardUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: `Quota warning — ${agentName} is at ${percentage}% usage`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Quota warning', '#E67E22')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          ${agentName} is nearing its monthly event quota.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          This agent has consumed <strong>${current.toLocaleString()}</strong> of
          <strong>${limit.toLocaleString()}</strong> included monthly events (${percentage}%).
          Review usage before ingestion starts getting throttled or rejected.
        </p>
        <p style="margin:0;">${btn('Review plan and usage', dashboardUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 13. billing.trial_ending_7d — sent at day 25 (5 days left) ─────────────────
function billingTrialEnding(data: Record<string, unknown>): EmailPayload {
  const endDate = String(data.endDate ?? '');
  const billingUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: `Your Kakunin trial ends on ${endDate} — card will be charged`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Trial ending in 5 days', '#E67E22')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          Your free trial ends on ${endDate}.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your 30-day free trial closes in 5 days. Your card on file will be charged automatically
          on <strong>${endDate}</strong> — no action needed if you want to continue.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Want to cancel before being charged? You can manage or cancel your subscription
          from the billing portal.
        </p>
        <p style="margin:0;">${btn('Manage subscription', billingUrl)}&nbsp;&nbsp;<a href="mailto:ai@kakunin.ai" style="font-size:14px;color:#2B934F;">Questions? →</a></p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 13b. billing.trial_ending_2d — sent at day 28 (2 days left) ────────────────
function billingTrialEndingUrgent(data: Record<string, unknown>): EmailPayload {
  const endDate = String(data.endDate ?? '');
  const billingUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: `Last reminder — Kakunin trial ends in 2 days (${endDate})`,
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Trial ends in 2 days', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          2 days left on your free trial.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your trial ends on <strong>${endDate}</strong>. Your card will be charged automatically
          to keep your agents certified and compliance reports running.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          If you don't want to be charged, cancel now from the billing portal —
          your data is preserved for 30 days.
        </p>
        <p style="margin:0;">${btn('Manage subscription', billingUrl)}&nbsp;&nbsp;<a href="mailto:ai@kakunin.ai" style="font-size:14px;color:#2B934F;">Talk to us →</a></p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 16. billing.subscription_cancelled ─────────────────────────────────────────
function billingSubscriptionCancelled(data: Record<string, unknown>): EmailPayload {
  const previousPlan = String(data.previousPlan ?? 'paid');
  const reactivateUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: 'Your Kakunin subscription has been cancelled',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Subscription cancelled', '#8A8C84')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          Your ${previousPlan} subscription has ended.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your account has been downgraded to the free tier. Agents remain visible
          but certificate issuance, compliance reports, and webhooks are paused
          until you reactivate.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          All audit log data and agent records are preserved — nothing is deleted.
        </p>
        <p style="margin:0;">${btn('Reactivate subscription', reactivateUrl)}&nbsp;&nbsp;<a href="mailto:hello@kakunin.ai" style="font-size:14px;color:#2B934F;">Talk to us →</a></p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 15. billing.payment_failed ──────────────────────────────────────────────────
function billingPaymentFailed(data: Record<string, unknown>): EmailPayload {
  const amount = String(data.amount ?? '');
  const billingUrl = 'https://kakunin.ai/dashboard/billing';

  return {
    subject: 'Payment failed — update your card to keep agents active',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 16px;">${badge('Payment failed', '#C0392B')}</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">
          We couldn't process your payment.
        </h1>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          ${amount ? `A charge of <strong>${amount}</strong> was declined.` : 'Your latest payment was declined.'}
          Update your payment method to avoid interruption to certificate monitoring
          and compliance reports.
        </p>
        <p style="margin:0;">${btn('Update payment method', billingUrl)}</p>
      </td></tr>`,
      `https://kakunin.ai/unsubscribe`,
    ),
  };
}

// 15. auth.email_changed ──────────────────────────────────────────────────────
function authEmailChanged(data: Record<string, unknown>): EmailPayload {
  const newEmail = String(data.newEmail ?? '');
  const dashboardUrl = 'https://kakunin.ai/dashboard/settings';

  return {
    subject: 'Your Kakunin email address has been updated',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:monospace;color:#2B934F;text-transform:uppercase;letter-spacing:0.08em;">Account Security</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">Email address updated</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4A4C44;line-height:1.6;">
          Your Kakunin account email has been changed to <strong>${newEmail}</strong>.
          Future login attempts and notifications will use this address.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#4A4C44;line-height:1.6;">
          If you did not make this change, contact <a href="mailto:security@kakunin.ai" style="color:#2B934F;">security@kakunin.ai</a> immediately.
        </p>
        <p style="margin:0;">${btn('Review account settings', dashboardUrl)}</p>
      </td></tr>`,
    ),
  };
}

// 16. auth.password_recovery ──────────────────────────────────────────────────
function authPasswordRecovery(data: Record<string, unknown>): EmailPayload {
  const email = String(data.email ?? '');
  const resetUrl = String(data.resetUrl ?? 'https://kakunin.ai/auth/reset-password');

  return {
    subject: 'Reset your Kakunin password',
    html: layout(
      `<tr><td style="padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:13px;font-family:monospace;color:#2B934F;text-transform:uppercase;letter-spacing:0.08em;">Password Reset</p>
        <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#1A1C16;line-height:1.2;">Reset your password</h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4A4C44;line-height:1.6;">
          We received a password reset request for <strong>${email}</strong>.
          Click the button below to set a new password. This link expires in 1 hour.
        </p>
        <p style="margin:0 0 24px;">${btn('Reset password', resetUrl)}</p>
        <p style="margin:0;font-size:13px;color:#8A8C84;line-height:1.5;">
          If you didn't request this, you can safely ignore this email.
          Your password won't change until you click the link above.
        </p>
      </td></tr>`,
    ),
  };
}
