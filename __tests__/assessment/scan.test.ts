import { describe, expect, it } from 'vitest';
import { detectAssessmentFromHtml, normalizeAssessmentUrl, scanPublicWebsite } from '@/lib/assessment';

describe('normalizeAssessmentUrl', () => {
  it('adds https to bare domains', () => {
    const url = normalizeAssessmentUrl('example.com');
    expect(url?.toString()).toBe('https://example.com/');
  });

  it('blocks localhost URLs', () => {
    expect(normalizeAssessmentUrl('http://localhost:3000')).toBeNull();
    expect(normalizeAssessmentUrl('http://127.0.0.1')).toBeNull();
  });
});

describe('detectAssessmentFromHtml', () => {
  it('detects a Vercel AI SDK/OpenAI stack and likely EU AI Act + NIST scope', () => {
    const html = `
      <html>
        <head>
          <title>Autonomous compliance agent</title>
          <meta name="description" content="Ship agent workflows with OpenAI and the Vercel AI SDK.">
        </head>
        <body>
          <h1>Agent workflow automation for enterprise security teams</h1>
          <script src="https://unpkg.com/@vercel/ai"></script>
        </body>
      </html>
    `;

    const result = detectAssessmentFromHtml(html, 'https://example.com', 'https://example.com', 'https://example.com', 'text/html');

    expect(result.ecosystem).toBe('vercel_ai_sdk_openai');
    expect(result.frameworks).toContain('eu_ai_act');
    expect(result.frameworks).toContain('nist');
    expect(result.certificateRisk.overallScore).toBeGreaterThan(0);
    expect(result.segment).toBe('autonomous_enterprise_software');
    expect(result.observedSignals.length).toBeGreaterThan(0);
  });

  it('detects a Python agent stack and MiCA signals', () => {
    const html = `
      <html>
        <head>
          <title>Trading bot orchestration</title>
          <meta name="description" content="LangChain, LangGraph, and CrewAI for crypto and payments automation.">
        </head>
        <body>
          <p>Automated trading for regulated markets and market venues.</p>
        </body>
      </html>
    `;

    const result = detectAssessmentFromHtml(html, 'https://example.com', 'https://example.com', 'https://example.com', 'text/html');

    expect(result.ecosystem).toBe('python_agent_stack');
    expect(result.frameworks).toContain('mica');
  });
});

describe('scanPublicWebsite', () => {
  it('returns a limited report when the page is not HTML', async () => {
    const fetchMock = global.fetch;
    global.fetch = (async () => new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

    try {
      const result = await scanPublicWebsite('example.com');
      expect(result.status).toBe('limited');
      expect(result.evidence.accessible).toBe(false);
    } finally {
      global.fetch = fetchMock;
    }
  });
});
