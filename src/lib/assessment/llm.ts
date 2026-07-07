import { z } from 'zod';
import { complete, getModel } from '@/lib/openrouter/client';
import { log } from '@/lib/logging';
import type {
  AssessmentEvidencePacket,
  AssessmentSegment,
  LLMAssessmentResult,
} from './types';

const assessmentSchema = z.object({
  segment: z.enum([
    'regulated_operator',
    'autonomous_enterprise_software',
    'early_ai_productivity_tool',
    'insufficient_public_evidence',
  ]),
  confidence: z.number().min(0).max(1),
  observed_signals: z.array(z.string()).default([]),
  external_evidence: z.array(z.string()).default([]),
  missing_trust_signals: z.array(z.string()).default([]),
  business_risks: z.array(z.string()).default([]),
  regulatory_relevance: z.object({
    eu_ai_act: z.enum(['likely_review_warranted', 'possible', 'weak_evidence', 'not_supported']),
    mica: z.enum(['likely_review_warranted', 'possible', 'weak_evidence', 'not_supported']),
    nist: z.enum(['likely_review_warranted', 'possible', 'weak_evidence', 'not_supported']),
  }),
  why_kakunin_now: z.string().min(1),
  why_not_now: z.string().min(1),
  recommended_next_step: z.string().min(1),
  email_report_summary: z.string().min(1),
  cta_path: z.enum(['/attestation-template', '/docs/quickstart-ai-agents', '/contact-sales']),
  limitations: z.array(z.string()).default([]),
});

export interface AssessmentLLM {
  complete(args: { system: string; user: string; model: string }): Promise<string>;
}

export const openRouterAssessmentLLM: AssessmentLLM = {
  async complete({ system, user, model }) {
    const result = await complete({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      maxTokens: 1600,
    });

    return result.content;
  },
};

function parseLooseJson(raw: string): unknown {
  let value = raw.trim();
  const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) {
    value = fenced[1].trim();
  }

  if (!value.startsWith('{')) {
    const start = value.indexOf('{');
    const end = value.lastIndexOf('}');
    if (start >= 0 && end > start) {
      value = value.slice(start, end + 1);
    }
  }

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function deriveFallbackSegment(packet: AssessmentEvidencePacket): AssessmentSegment {
  const regulated = packet.website_signals.regulatedActivitySignals.length > 0
    || packet.news_signals.some((item) => item.relevanceNote.toLowerCase().includes('regulated'));
  const autonomous = packet.website_signals.autonomyClaims.length > 0;
  const ai = packet.website_signals.explicitAiClaims.length > 0;
  const sparse = packet.scan_limits.some((item) => /sparse|limited|weak evidence/i.test(item));

  if (regulated && (ai || autonomous)) return 'regulated_operator';
  if (autonomous || (ai && packet.website_signals.integrationSignals.length > 0)) {
    return 'autonomous_enterprise_software';
  }
  if (ai && !regulated && sparse) return 'early_ai_productivity_tool';
  return 'insufficient_public_evidence';
}

export function buildFallbackAssessment(packet: AssessmentEvidencePacket): LLMAssessmentResult {
  const segment = deriveFallbackSegment(packet);
  const observedSignals = [
    ...packet.website_signals.explicitAiClaims,
    ...packet.website_signals.autonomyClaims,
    ...packet.website_signals.industrySignals,
    ...packet.website_signals.integrationSignals,
  ].slice(0, 6);

  const limitations = packet.scan_limits.length
    ? packet.scan_limits
    : ['Public evidence was limited, so this assessment is conservative.'];

  const base = {
    regulated_operator: {
      whyNow: 'The public evidence points to AI-enabled activity in a trust-sensitive or regulated operating context, where customers, partners, and reviewers will expect clearer proof of authority, provenance, and controllability.',
      whyNotNow: 'This assessment is still based on public signals only, so the exact production architecture and regulatory perimeter should be confirmed before making a hard implementation decision.',
      next: 'Validate the live agent surfaces, approval paths, and customer-facing actions, then decide where verifiable identity, provenance, and revocation would most reduce trust friction.',
      cta: '/attestation-template' as const,
    },
    autonomous_enterprise_software: {
      whyNow: 'The product appears to act on behalf of customers across connectors or outbound actions, so stronger identity and provenance can make the automation easier to trust, approve, and contain when something goes wrong.',
      whyNotNow: 'Public pages do not prove the exact autonomy level or control boundaries, so the urgency should be confirmed against the real execution flow.',
      next: 'Review the agent execution path, approval gates, and customer-account actions to decide where verifiable identity and provenance would strengthen user confidence first.',
      cta: '/docs/quickstart-ai-agents' as const,
    },
    early_ai_productivity_tool: {
      whyNow: 'The public evidence suggests an AI productivity surface that can mature into higher-autonomy workflows, so trust-readiness now can prevent credibility gaps later as the product expands.',
      whyNotNow: 'The current public evidence does not yet prove that the product is operating in a high-stakes or strongly regulated environment.',
      next: 'Clarify which user-facing actions are automated today versus assistive, then decide whether identity and provenance controls should be introduced before autonomy expands.',
      cta: '/docs/quickstart-ai-agents' as const,
    },
    insufficient_public_evidence: {
      whyNow: 'There is not enough public evidence to make a strong case either way, so the useful next step is validation rather than a vendor-first recommendation.',
      whyNotNow: 'The public site does not expose enough product, docs, or trust detail to justify a strong identity implementation case yet.',
      next: 'Request a product walkthrough, public docs, or a manual trust review to confirm whether the product actually acts autonomously or touches sensitive workflows.',
      cta: '/contact-sales' as const,
    },
  }[segment];

  const regulatory = {
    eu_ai_act: segment === 'regulated_operator' || segment === 'autonomous_enterprise_software' ? 'possible' : 'weak_evidence',
    mica: packet.website_signals.regulatedActivitySignals.some((item) => /crypto|token|wallet|exchange|trading/i.test(item))
      ? 'possible'
      : 'not_supported',
    nist: packet.website_signals.trustSignals.length > 0 || segment !== 'insufficient_public_evidence'
      ? 'possible'
      : 'weak_evidence',
  } as LLMAssessmentResult['regulatory_relevance'];

  return {
    segment,
    confidence: segment === 'insufficient_public_evidence' ? 0.34 : 0.56,
    observed_signals: observedSignals.length ? observedSignals : ['Public evidence was too sparse for a differentiated assessment.'],
    external_evidence: packet.news_signals.map((item) => `${item.publisher}: ${item.title}`).slice(0, 3),
    missing_trust_signals: packet.website_signals.missingSignalObservations.length
      ? packet.website_signals.missingSignalObservations
      : ['No public machine-identity, attestation, or revocation signals were detected.'],
    business_risks: [
      'Difficult to prove which agent acted and under whose authority.',
      'Harder incident response if a customer-facing workflow misfires.',
      'Weaker evidence trail for enterprise buyers or internal governance reviews.',
    ],
    regulatory_relevance: regulatory,
    why_kakunin_now: base.whyNow,
    why_not_now: base.whyNotNow,
    recommended_next_step: base.next,
    email_report_summary: `${packet.company_profile.domain} shows ${segment.replaceAll('_', ' ')} signals. The more important question is whether the public trust evidence matches the level of autonomy customers are being asked to rely on.`,
    cta_path: base.cta,
    limitations,
  };
}

function buildPrompt(packet: AssessmentEvidencePacket): { system: string; user: string } {
  const system = [
    'You are an evidence-bound AI trust analyst for Kakunin.',
    'You assess public website and news evidence about companies that may run AI agents or autonomous software.',
    'Return STRICT JSON only.',
    'Do not give legal advice.',
    'Do not claim a framework applies unless the evidence supports at least a conservative review recommendation.',
    'Do not recommend Kakunin before presenting observed evidence.',
    'Frame the output from the company perspective: how to improve customer trust, buyer confidence, governance, and safe autonomy expansion.',
    'Kakunin can be an implied implementation path, but it must not be the protagonist of the assessment.',
    'Do not produce generic boilerplate across different verticals.',
    'Write like an experienced buyer-facing trust advisor, not a sales rep.',
    'Prioritize the companys practical value: confidence, approvalability, incident containment, governance clarity, and enterprise readiness.',
    'If evidence is weak, choose insufficient_public_evidence.',
    'The value segments are:',
    '- regulated_operator: AI activity in regulated, payments, fintech, crypto, or similarly trust-sensitive operating contexts.',
    '- autonomous_enterprise_software: AI software acting on behalf of customers in business workflows.',
    '- early_ai_productivity_tool: AI assistance exists, but autonomy or risk depth is still limited.',
    '- insufficient_public_evidence: public evidence is too sparse or contradictory.',
    'Output rules by segment:',
    '- regulated_operator: emphasize delegated authority, reviewability, provenance, revocation, and defensibility under scrutiny from customers, partners, compliance, or auditors.',
    '- autonomous_enterprise_software: emphasize enterprise trust, approvalability, traceability, incident containment, and the buyers need to understand what the software can do on a users behalf.',
    '- early_ai_productivity_tool: emphasize future-proofing, trust-readiness, and avoiding credibility gaps before autonomy expands into more sensitive or customer-facing workflows.',
    '- insufficient_public_evidence: emphasize uncertainty, ask for more product truth, and avoid a strong implementation recommendation.',
    'If the evidence suggests a specific vertical, reflect it naturally in the wording.',
    'Examples:',
    '- For payments, fintech, crypto, banking, or trading: discuss trust, authority, provenance, and reviewability in high-stakes operating contexts.',
    '- For enterprise workflow or go-to-market agents: discuss buyer confidence, approval gates, traceability, and containment.',
    '- For lighter productivity AI: discuss trust-readiness, reputation, and how early controls support later expansion.',
    'Do not say things like "this is valuable for Kakunin" or imply the main outcome is lead qualification.',
    'Do not recommend Kakunin, templates, docs, or setup paths until after evidence, trust gaps, and customer-facing rationale are presented.',
  ].join(' ');

  const user = `Assess this public evidence packet and return JSON matching the requested contract.\n\n${JSON.stringify(packet, null, 2)}`;

  return { system, user };
}

export async function assessEvidencePacket(
  packet: AssessmentEvidencePacket,
  options?: {
    llm?: AssessmentLLM;
    model?: string;
  },
): Promise<LLMAssessmentResult> {
  const llm = options?.llm ?? openRouterAssessmentLLM;
  const model = options?.model ?? getModel('website_assessment');
  const prompt = buildPrompt(packet);

  try {
    const raw = await llm.complete({
      system: prompt.system,
      user: prompt.user,
      model,
    });

    const parsed = assessmentSchema.safeParse(parseLooseJson(raw));
    if (!parsed.success) {
      log.warn('[assessment.llm] Invalid assessment payload, using fallback', {
        issues: parsed.error.issues.map((issue) => issue.path.join('.')).join(','),
      });
      return buildFallbackAssessment(packet);
    }

    if (parsed.data.confidence < 0.25) {
      return buildFallbackAssessment(packet);
    }

    return parsed.data;
  } catch (error) {
    log.warn('[assessment.llm] Assessment call failed, using fallback', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return buildFallbackAssessment(packet);
  }
}
