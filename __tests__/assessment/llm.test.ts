import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { assessEvidencePacket, buildFallbackAssessment } from '@/lib/assessment/llm';
import { fetchNewsSignals } from '@/lib/assessment/news';
import type { AssessmentEvidencePacket } from '@/lib/assessment/types';

const basePacket: AssessmentEvidencePacket = {
  company_profile: {
    domain: 'example.com',
    title: 'Example AI Operator',
    description: 'AI workflow automation for revenue teams.',
    categoryLabels: ['gtm'],
    publicLinks: [],
  },
  website_signals: {
    explicitAiClaims: ['Public copy references "agent".'],
    autonomyClaims: ['Public copy suggests action-taking or orchestration via "workflow".'],
    industrySignals: ['Public copy signals a "gtm" operating context.'],
    regulatedActivitySignals: [],
    integrationSignals: ['Technical surface exposes "openai".'],
    trustSignals: [],
    machineIdentitySignals: [],
    missingSignalObservations: ['The public site describes AI or autonomous behavior but does not show clear machine-identity, attestation, or revocation signals.'],
  },
  news_signals: [],
  scan_limits: ['No relevant public news was found for the brand within the default news scan.'],
};

describe('assessment llm parsing', () => {
  it('accepts valid JSON output', async () => {
    const result = await assessEvidencePacket(basePacket, {
      llm: {
        complete: async () => JSON.stringify({
          segment: 'autonomous_enterprise_software',
          confidence: 0.78,
          observed_signals: ['Public copy references "agent".'],
          external_evidence: [],
          missing_trust_signals: ['No public machine identity controls were described.'],
          business_risks: ['Difficult to prove which agent acted.'],
          regulatory_relevance: {
            eu_ai_act: 'possible',
            mica: 'not_supported',
            nist: 'possible',
          },
          why_kakunin_now: 'Accountable automation matters now.',
          why_not_now: 'This remains a public-signal assessment.',
          recommended_next_step: 'Review the production agent surfaces.',
          email_report_summary: 'Autonomous software signals are visible.',
          cta_path: '/docs/quickstart-ai-agents',
          limitations: [],
        }),
      },
    });

    expect(result.segment).toBe('autonomous_enterprise_software');
    expect(result.confidence).toBe(0.78);
  });

  it('parses fenced JSON and strips prefixed prose', async () => {
    const result = await assessEvidencePacket(basePacket, {
      llm: {
        complete: async () => `Here is the assessment:\n\`\`\`json\n${JSON.stringify({
          segment: 'autonomous_enterprise_software',
          confidence: 0.61,
          observed_signals: ['Public copy references "agent".'],
          external_evidence: [],
          missing_trust_signals: ['No public machine identity controls were described.'],
          business_risks: ['Difficult to prove which agent acted.'],
          regulatory_relevance: {
            eu_ai_act: 'possible',
            mica: 'not_supported',
            nist: 'possible',
          },
          why_kakunin_now: 'Accountable automation matters now.',
          why_not_now: 'This remains a public-signal assessment.',
          recommended_next_step: 'Review the production agent surfaces.',
          email_report_summary: 'Autonomous software signals are visible.',
          cta_path: '/docs/quickstart-ai-agents',
          limitations: [],
        })}\n\`\`\``,
      },
    });

    expect(result.segment).toBe('autonomous_enterprise_software');
  });

  it('falls back safely on malformed output', async () => {
    const result = await assessEvidencePacket(basePacket, {
      llm: {
        complete: async () => 'not json',
      },
    });

    expect(result.segment).toBe(buildFallbackAssessment(basePacket).segment);
    expect(result.why_kakunin_now.length).toBeGreaterThan(0);
  });
});

describe('assessment news signals', () => {
  const originalKey = process.env.NEWS_API_KEY;

  beforeEach(() => {
    process.env.NEWS_API_KEY = 'test-key';
  });

  it('returns normalized relevant articles', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      articles: [
        {
          title: 'Example launches AI agent for payments ops',
          description: 'The company ties agentic automation to payment workflows.',
          url: 'https://news.example.com/example-ai',
          publishedAt: '2026-06-14T00:00:00Z',
          source: { name: 'News Example' },
        },
      ],
    })));

    const items = await fetchNewsSignals({
      brandName: 'Example',
      domain: 'example.com',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.effect).toBe('strengthens');
  });

  it('returns empty on missing api key', async () => {
    process.env.NEWS_API_KEY = '';
    const items = await fetchNewsSignals({
      brandName: 'Example',
      domain: 'example.com',
      fetchImpl: fetch as typeof fetch,
    });

    expect(items).toEqual([]);
  });

  afterAll(() => {
    process.env.NEWS_API_KEY = originalKey;
  });
});
