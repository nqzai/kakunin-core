import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { checkAssessmentRateLimits, scanPublicWebsite } from '@/lib/assessment';
import { normalizeAssessmentUrl } from '@/lib/assessment/scan';
import type { Json } from '@/types/database';

const bodySchema = z.object({
  websiteUrl: z.string().min(1).max(2048),
  email: z.string().email(),
  consent: z.literal(true),
});

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: 'Please provide a website URL, email, and consent to the scan.' }, { status: 400 });
  }

  const email = body.data.email.trim().toLowerCase();
  const normalizedUrl = normalizeAssessmentUrl(body.data.websiteUrl);
  if (!normalizedUrl) {
    return NextResponse.json({ error: 'Enter a public http(s) website URL.' }, { status: 400 });
  }

  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  const rateLimit = await checkAssessmentRateLimits({ ip: sourceIp, email });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds
          ? { 'Retry-After': String(rateLimit.retryAfterSeconds) }
          : undefined,
      },
    );
  }

  const scan = await scanPublicWebsite(normalizedUrl.toString());
  const supabase = createServiceClient();

  const { data: lead, error: insertError } = await supabase
    .from('assessment_leads')
    .insert({
      email,
      website_url: body.data.websiteUrl.trim(),
      website_domain: scan.websiteDomain,
      final_url: scan.finalUrl,
      ecosystem: scan.ecosystem,
      ecosystem_confidence: scan.ecosystemConfidence,
      frameworks: scan.frameworks,
      recommendation: scan.recommendation,
      summary: scan.summary,
      certificate_risk: scan.certificateRisk as unknown as Json,
      status: scan.status,
      scan_version: 'v2-llm-evidence',
      page_title: scan.pageTitle,
      page_description: scan.pageDescription,
      evidence: scan.evidence as unknown as Json,
      source_ip: sourceIp,
      consented_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError || !lead) {
    return NextResponse.json({ error: 'Failed to save your assessment request.' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: null,
    event_type: 'lead.assessment_completed',
    actor_type: 'system',
    actor_id: 'public-assessment-route',
    description: `Free compliance readiness report generated for ${scan.websiteDomain}`,
    affected_id: lead.id,
    metadata: {
      website_domain: scan.websiteDomain,
      website_url: normalizedUrl.toString(),
      final_url: scan.finalUrl,
      ecosystem: scan.ecosystem,
      ecosystem_label: scan.ecosystemLabel,
      ecosystem_confidence: scan.ecosystemConfidence,
      frameworks: scan.frameworks,
      framework_labels: scan.frameworkLabels,
      segment: scan.segment,
      observed_signals: scan.observedSignals,
      missing_trust_signals: scan.missingTrustSignals,
      why_kakunin_now: scan.whyKakuninNow,
      why_not_now: scan.whyNotNow,
      recommended_next_step: scan.recommendedNextStep,
      limitations: scan.limitations,
      external_evidence: scan.externalEvidence,
      regulatory_relevance: scan.regulatoryRelevance as unknown as Json,
      certificate_risk: scan.certificateRisk as unknown as Json,
      recommendation: scan.recommendation,
      status: scan.status,
    } as unknown as Json,
  });

  void dispatchEmail({
    template: 'lead.assessment_ready',
    to: email,
    data: {
      websiteDomain: scan.websiteDomain,
      websiteUrl: normalizedUrl.toString(),
      finalUrl: scan.finalUrl,
      segment: scan.segment,
      ecosystemLabel: scan.ecosystemLabel,
      frameworkLabels: scan.frameworkLabels,
      observedSignals: scan.observedSignals,
      missingTrustSignals: scan.missingTrustSignals,
      whyKakuninNow: scan.whyKakuninNow,
      whyNotNow: scan.whyNotNow,
      recommendedNextStep: scan.recommendedNextStep,
      limitations: scan.limitations,
      externalEvidence: scan.externalEvidence,
      summary: scan.summary,
      certificateRisk: scan.certificateRisk,
      confidence: scan.evidence.assessment.confidence,
      scanStatus: scan.status,
      attestationUrl: 'https://www.kakunin.ai/attestation-template',
      setupUrl: 'https://www.kakunin.ai/docs/quickstart-ai-agents',
      ctaPath: scan.ctaPath,
    },
  });

  return NextResponse.json({
    ok: true,
    data: {
      leadId: lead.id,
      status: scan.status,
      message: 'Your free compliance readiness report is on the way.',
      report: {
        segment: scan.segment,
        ecosystemLabel: scan.ecosystemLabel,
        frameworkLabels: scan.frameworkLabels,
        observedSignals: scan.observedSignals,
        externalEvidence: scan.externalEvidence,
        missingTrustSignals: scan.missingTrustSignals,
        whyKakuninNow: scan.whyKakuninNow,
        whyNotNow: scan.whyNotNow,
        recommendedNextStep: scan.recommendedNextStep,
        confidence: scan.evidence.assessment.confidence,
        limitations: scan.limitations,
        summary: scan.summary,
        certificateRisk: scan.certificateRisk,
      },
    },
  });
}
