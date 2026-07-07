import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockWriteAuditLog,
  mockDispatchEmail,
  mockCheckAssessmentRateLimits,
  mockScanPublicWebsite,
  mockFrom,
  mockInsert,
  mockSingle,
} = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn(),
  mockDispatchEmail: vi.fn(),
  mockCheckAssessmentRateLimits: vi.fn(),
  mockScanPublicWebsite: vi.fn(),
  mockFrom: vi.fn(),
  mockInsert: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/email/dispatch', () => ({ dispatchEmail: mockDispatchEmail }));
vi.mock('@/lib/assessment', () => ({
  checkAssessmentRateLimits: mockCheckAssessmentRateLimits,
  scanPublicWebsite: mockScanPublicWebsite,
}));
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/assessment/route';

const LEAD_ID = '550e8400-e29b-41d4-a716-446655440010';

function makeRequest(body: Record<string, unknown>) {
  const req = new NextRequest('http://localhost/api/assessment', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-forwarded-for', '203.0.113.5');
  return req;
}

function setupDbMock() {
  mockSingle.mockResolvedValue({ data: { id: LEAD_ID }, error: null });
  mockInsert.mockReturnValue({
    select: vi.fn(() => ({ single: mockSingle })),
  });
  mockFrom.mockReturnValue({
    insert: mockInsert,
  });
}

describe('POST /api/assessment', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupDbMock();
    mockCheckAssessmentRateLimits.mockResolvedValue({ allowed: true });
    mockScanPublicWebsite.mockResolvedValue({
      status: 'completed',
      inputUrl: 'https://example.com',
      normalizedUrl: 'https://example.com/',
      finalUrl: 'https://example.com/',
      websiteDomain: 'example.com',
      pageTitle: 'Example',
      pageDescription: 'Example description',
      ecosystem: 'vercel_ai_sdk_openai',
      ecosystemLabel: 'Vercel AI SDK / OpenAI',
      ecosystemConfidence: 0.82,
      segment: 'autonomous_enterprise_software',
      frameworks: ['eu_ai_act', 'nist'],
      frameworkLabels: ['EU AI Act', 'NIST'],
      recommendation: 'Review the production agent surfaces before finalizing the trust rollout.',
      summary: 'Summary',
      observedSignals: ['Public copy references "agent".', 'Technical surface exposes "openai".'],
      missingTrustSignals: ['The public site describes AI or autonomous behavior but does not show clear machine-identity, attestation, or revocation signals.'],
      whyKakuninNow: 'The product appears to act on behalf of customers, so provenance and accountable automation matter now.',
      whyNotNow: 'This is still a public-signal assessment and does not prove the exact production architecture.',
      recommendedNextStep: 'Review the production agent surfaces before finalizing the trust rollout.',
      limitations: ['No relevant public news was found for the brand within the default news scan.'],
      ctaPath: '/docs/quickstart-ai-agents',
      regulatoryRelevance: {
        eu_ai_act: 'possible',
        mica: 'not_supported',
        nist: 'possible',
      },
      externalEvidence: [],
      certificateRisk: {
        overallScore: 84,
        overallLabel: 'high',
        headline: 'Estimated risk of operating without an identity certificate: 84/100 (high).',
        disclaimer: 'Heuristic estimate based on public signals.',
        categories: [
          { label: 'Impersonation risk', score: 90, reason: 'Without a certificate, identity is harder to prove.' },
          { label: 'Auditability gap', score: 82, reason: 'Logs are less defensible without a cryptographic anchor.' },
        ],
      },
      evidence: {
        packet: {
          company_profile: {
            domain: 'example.com',
            title: 'Example',
            description: 'Example description',
            categoryLabels: ['security'],
            publicLinks: [],
          },
          website_signals: {
            explicitAiClaims: ['Public copy references "agent".'],
            autonomyClaims: ['Public copy suggests action-taking or orchestration via "workflow".'],
            industrySignals: ['Public copy signals a "security" operating context.'],
            regulatedActivitySignals: [],
            integrationSignals: ['Technical surface exposes "openai".'],
            trustSignals: [],
            machineIdentitySignals: [],
            missingSignalObservations: ['The public site describes AI or autonomous behavior but does not show clear machine-identity, attestation, or revocation signals.'],
          },
          news_signals: [],
          scan_limits: ['No relevant public news was found for the brand within the default news scan.'],
        },
        assessment: {
          segment: 'autonomous_enterprise_software',
          confidence: 0.74,
          observed_signals: ['Public copy references "agent".', 'Technical surface exposes "openai".'],
          external_evidence: [],
          missing_trust_signals: ['The public site describes AI or autonomous behavior but does not show clear machine-identity, attestation, or revocation signals.'],
          business_risks: ['Difficult to prove which agent acted and under whose authority.'],
          regulatory_relevance: {
            eu_ai_act: 'possible',
            mica: 'not_supported',
            nist: 'possible',
          },
          why_kakunin_now: 'The product appears to act on behalf of customers, so provenance and accountable automation matter now.',
          why_not_now: 'This is still a public-signal assessment and does not prove the exact production architecture.',
          recommended_next_step: 'Review the production agent surfaces before finalizing the trust rollout.',
          email_report_summary: 'Summary',
          cta_path: '/docs/quickstart-ai-agents',
          limitations: ['No relevant public news was found for the brand within the default news scan.'],
        },
        ecosystemKeywords: ['openai'],
        contentType: 'text/html',
        accessible: true,
      },
    });
    mockWriteAuditLog.mockResolvedValue({ id: 'audit-id', created_at: new Date().toISOString() });
    mockDispatchEmail.mockResolvedValue(undefined);
  });

  it('saves the lead, writes audit_log, and queues the assessment email', async () => {
    const res = await POST(makeRequest({
      websiteUrl: 'https://example.com',
      email: 'lead@company.com',
      consent: true,
    }));

    const body = await res.json() as {
      ok: boolean;
      data: {
        leadId: string;
        report?: {
          certificateRisk?: {
            overallScore?: number;
          };
          externalEvidence?: string[];
        };
      };
    };

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data.leadId).toBe(LEAD_ID);
    expect(body.data.report?.certificateRisk?.overallScore).toBeGreaterThan(0);
    expect(body.data.report?.externalEvidence).toEqual([]);
    expect(mockCheckAssessmentRateLimits).toHaveBeenCalledWith({
      ip: '203.0.113.5',
      email: 'lead@company.com',
    });
    expect(mockScanPublicWebsite).toHaveBeenCalledWith('https://example.com/');
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: null,
        event_type: 'lead.assessment_completed',
        actor_type: 'system',
        affected_id: LEAD_ID,
      }),
    );
    expect(mockDispatchEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'lead.assessment_ready',
        to: 'lead@company.com',
        data: expect.objectContaining({
          ecosystemLabel: 'Vercel AI SDK / OpenAI',
          certificateRisk: expect.objectContaining({
            headline: expect.stringContaining('Estimated risk'),
          }),
          observedSignals: expect.arrayContaining(['Public copy references "agent".']),
          whyKakuninNow: expect.stringContaining('act on behalf of customers'),
          attestationUrl: 'https://www.kakunin.ai/attestation-template',
          setupUrl: 'https://www.kakunin.ai/docs/quickstart-ai-agents',
        }),
      }),
    );
  });

  it('accepts consumer email addresses', async () => {
    const res = await POST(makeRequest({
      websiteUrl: 'https://example.com',
      email: 'lead@gmail.com',
      consent: true,
    }));

    expect(res.status).toBe(200);
    expect(mockScanPublicWebsite).toHaveBeenCalled();
  });

  it('stops before fetch when the rate limit is hit', async () => {
    mockCheckAssessmentRateLimits.mockResolvedValueOnce({ allowed: false, reason: 'ip', retryAfterSeconds: 60 });

    const res = await POST(makeRequest({
      websiteUrl: 'https://example.com',
      email: 'lead@company.com',
      consent: true,
    }));

    expect(res.status).toBe(429);
    expect(mockScanPublicWebsite).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockDispatchEmail).not.toHaveBeenCalled();
  });

  it('rejects submissions without consent', async () => {
    const res = await POST(makeRequest({
      websiteUrl: 'https://example.com',
      email: 'lead@company.com',
      consent: false,
    }));

    expect(res.status).toBe(400);
  });
});
