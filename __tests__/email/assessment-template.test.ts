import { describe, expect, it } from 'vitest';
import { renderTemplate } from '@/lib/email/templates';

describe('lead.assessment_ready template', () => {
  it('includes the attestation template and quickstart setup CTA', () => {
    const payload = renderTemplate('lead.assessment_ready', {
      websiteDomain: 'example.com',
      websiteUrl: 'https://example.com',
      segment: 'autonomous_enterprise_software',
      ecosystemLabel: 'Vercel AI SDK / OpenAI',
      frameworkLabels: ['EU AI Act', 'NIST'],
      observedSignals: ['Public copy references "agent".', 'Technical surface exposes "openai".'],
      missingTrustSignals: ['No public machine-identity or revocation controls were described.'],
      whyKakuninNow: 'The product appears to act on behalf of customers, so provenance matters.',
      whyNotNow: 'This is still a public-signal assessment.',
      recommendedNextStep: 'Review the production agent surfaces before finalizing the trust rollout.',
      limitations: ['No relevant public news was found for the brand within the default news scan.'],
      summary: 'Summary',
      certificateRisk: {
        overallScore: 84,
        overallLabel: 'high',
        headline: 'Estimated risk of operating without an identity certificate: 84/100 (high).',
        disclaimer: 'Heuristic estimate based on public signals.',
        categories: [
          { label: 'Impersonation risk', score: 90, reason: 'Without a certificate, identity is harder to prove.' },
        ],
      },
      confidence: 0.82,
      scanStatus: 'completed',
      attestationUrl: 'https://www.kakunin.ai/attestation-template',
      setupUrl: 'https://www.kakunin.ai/docs/quickstart-ai-agents',
      ctaPath: '/docs/quickstart-ai-agents',
    });

    expect(payload.subject).toContain('agent trust readiness report');
    expect(payload.html).toContain('/attestation-template');
    expect(payload.html).toContain('/docs/quickstart-ai-agents');
    expect(payload.html).toContain('Vercel AI SDK / OpenAI');
    expect(payload.html).toContain('EU AI Act');
    expect(payload.html).toContain('NIST');
    expect(payload.html).toContain('Risk if you ship without a certificate');
    expect(payload.html).toContain('Impersonation risk');
    expect(payload.html).toContain('Observed public signals');
    expect(payload.html).toContain('Missing trust signals');
    expect(payload.html).toContain('External evidence');
  });

  it('personalizes the email for regulated operators', () => {
    const payload = renderTemplate('lead.assessment_ready', {
      websiteDomain: 'pinelabs.com',
      websiteUrl: 'https://pinelabs.com',
      segment: 'regulated_operator',
      ecosystemLabel: 'Custom / Unknown',
      frameworkLabels: ['EU AI Act', 'MiCA', 'NIST'],
      observedSignals: ['Public copy references payments and merchant infrastructure.'],
      missingTrustSignals: ['No public proof of agent authority or revocation controls.'],
      whyKakuninNow: 'Customers and reviewers will expect clearer proof of authority and provenance.',
      recommendedNextStep: 'Validate where customer-facing automation can be traced and controlled.',
      summary: 'Summary',
      certificateRisk: {
        overallScore: 88,
        overallLabel: 'critical',
        headline: 'Estimated risk of operating without an identity certificate: 88/100 (critical).',
        disclaimer: 'Heuristic estimate based on public signals.',
        categories: [],
      },
      confidence: 0.79,
      externalEvidence: ['Reuters: Brand expands regulated payment automation footprint.'],
    });

    expect(payload.subject).toContain('regulated AI trust readiness');
    expect(payload.html).toContain('regulated or high-trust environment');
    expect(payload.html).toContain('customers, partners, and reviewers');
  });

  it('personalizes the email for autonomous enterprise software', () => {
    const payload = renderTemplate('lead.assessment_ready', {
      websiteDomain: 'elentaria.ai',
      websiteUrl: 'https://elentaria.ai',
      segment: 'autonomous_enterprise_software',
      ecosystemLabel: 'OpenAI / workflow tooling',
      frameworkLabels: ['NIST'],
      observedSignals: ['Public copy suggests agents act on behalf of revenue teams.'],
      missingTrustSignals: ['No public evidence of execution provenance.'],
      whyKakuninNow: 'Trust depends on whether automation can be approved, traced, and contained.',
      recommendedNextStep: 'Review which customer workflows need stronger identity and provenance first.',
      summary: 'Summary',
      certificateRisk: {
        overallScore: 73,
        overallLabel: 'high',
        headline: 'Estimated risk of operating without an identity certificate: 73/100 (high).',
        disclaimer: 'Heuristic estimate based on public signals.',
        categories: [],
      },
      confidence: 0.76,
      externalEvidence: [],
    });

    expect(payload.subject).toContain('agent trust readiness');
    expect(payload.html).toContain('acts on a user’s behalf');
    expect(payload.html).toContain('approved, traced, and contained');
  });

  it('personalizes the email for early AI productivity tools', () => {
    const payload = renderTemplate('lead.assessment_ready', {
      websiteDomain: 'slashy.com',
      websiteUrl: 'https://slashy.com',
      segment: 'early_ai_productivity_tool',
      ecosystemLabel: 'Custom / Unknown',
      frameworkLabels: ['NIST'],
      observedSignals: ['Public copy suggests AI assistance with lighter autonomy.'],
      missingTrustSignals: ['No public identity or provenance posture was described.'],
      whyKakuninNow: 'Trust-readiness now can prevent credibility gaps later as autonomy expands.',
      recommendedNextStep: 'Clarify which actions are assistive versus autonomous today.',
      summary: 'Summary',
      certificateRisk: {
        overallScore: 58,
        overallLabel: 'moderate',
        headline: 'Estimated risk of operating without an identity certificate: 58/100 (moderate).',
        disclaimer: 'Heuristic estimate based on public signals.',
        categories: [],
      },
      confidence: 0.61,
      externalEvidence: [],
    });

    expect(payload.subject).toContain('AI trust readiness');
    expect(payload.html).toContain('before autonomy expands');
    expect(payload.html).toContain('credibility gaps later');
  });
});
