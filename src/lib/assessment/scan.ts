import { isIP } from 'node:net';
import { assessEvidencePacket, buildFallbackAssessment } from './llm';
import { fetchNewsSignals } from './news';
import type {
  AssessmentEvidencePacket,
  AssessmentEvidenceRecord,
  AssessmentEcosystem,
  AssessmentScanResult,
  CertificateRiskProfile,
  ComplianceFramework,
  DiscoveredPage,
  EcosystemFinding,
  LLMAssessmentResult,
  RiskCategory,
  WebsiteSignalGroup,
} from './types';

const MAX_HTML_CHARS = 240_000;
const FETCH_TIMEOUT_MS = 8_000;
const MAX_DISCOVERED_PAGES = 2;

const ECOSYSTEM_RULES: Array<{ ecosystem: AssessmentEcosystem; label: string; keywords: string[] }> = [
  {
    ecosystem: 'vercel_ai_sdk_openai',
    label: 'Vercel AI SDK / OpenAI',
    keywords: ['vercel ai sdk', '@vercel/ai', 'openrouter', 'assistant api', 'streamtext(', 'generatetext('],
  },
  {
    ecosystem: 'python_agent_stack',
    label: 'Python agent stack',
    keywords: ['langchain', 'langgraph', 'crewai', 'autogen', 'llamaindex', 'pydantic ai'],
  },
  {
    ecosystem: 'mastra',
    label: 'Mastra',
    keywords: ['mastra', '@mastra', 'mastra mcp'],
  },
  {
    ecosystem: 'mcp_webmcp',
    label: 'MCP / WebMCP',
    keywords: ['model context protocol', 'webmcp', 'mcp server', '/api/mcp', 'tools/list', 'tools/call'],
  },
];

const AI_SIGNAL_KEYWORDS = [
  ' ai ',
  'ai-enabled',
  'ai powered',
  'agent',
  'agentic',
  'autonomous',
  'copilot',
  'assistant',
  'llm',
  'operator',
];

const AUTONOMY_KEYWORDS = [
  'auto-approve',
  'approval gate',
  'runs end-to-end',
  'gets them running',
  'system runs itself',
  'scheduled',
  'publish',
  'operates',
  'operator',
  'orchestration',
  'workflow',
  'code execution',
  'shipped from your own accounts',
];

const INDUSTRY_KEYWORDS = [
  'payments',
  'fintech',
  'bank',
  'insurance',
  'healthcare',
  'security',
  'compliance',
  'sales',
  'marketing',
  'gtm',
  'support',
  'developer portal',
];

const REGULATED_ACTIVITY_KEYWORDS = [
  'payment gateway',
  'payments',
  'bank',
  'credit processing',
  'lending',
  'broker',
  'exchange',
  'trading',
  'crypto',
  'wallet',
  'token',
  'kyc',
  'aml',
  'regulated',
];

const INTEGRATION_KEYWORDS = [
  'api',
  'sdk',
  'webhook',
  'oauth',
  'connector',
  'developer portal',
  'developer',
  'supabase',
  'firebase',
  'pusher',
  'typesense',
  'openai',
  'anthropic',
  'langchain',
  'langgraph',
  'mcp',
];

const TRUST_KEYWORDS = [
  'security',
  'governance',
  'audit',
  'approval',
  'review',
  'privacy',
  'controls',
  'policy',
  'compliance',
  'encrypted',
  'soc 2',
  'iso',
  'risk',
];

const MACHINE_IDENTITY_KEYWORDS = [
  'certificate',
  'x.509',
  'attestation',
  'signed',
  'signature',
  'identity',
  'credential',
  'revocation',
  'non-human identity',
];

const DOC_LINK_HINTS = [
  '/docs',
  '/developers',
  '/developer',
  '/help',
  '/security',
  '/trust',
  '/api',
];

interface PageExtraction {
  title: string | null;
  description: string | null;
  text: string;
  scriptHints: string;
  discoveredLinks: DiscoveredPage[];
  signals: WebsiteSignalGroup;
}

type ScanFetch = typeof fetch;

export function normalizeAssessmentUrl(inputUrl: string): URL | null {
  const trimmed = inputUrl.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return null;
    }
    if (isBlockedHostname(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function isBlockedHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (lower === 'localhost') return true;
  if (lower.endsWith('.local') || lower.endsWith('.internal') || lower.endsWith('.home')) return true;

  const ipVersion = isIP(lower);

  if (ipVersion === 4) {
    const [a, b] = lower.split('.').map((segment) => Number(segment));
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    // 169.254.0.0/16 — link-local, includes AWS/GCP/Azure metadata endpoints
    if (a === 169 && b === 254) return true;
    // 100.64.0.0/10 — shared address space (CGNAT)
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (ipVersion === 6) {
    if (lower === '::1' || lower === '::') return true;
    // fe80::/10 — link-local
    if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
    // fc00::/7 — unique local
    if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
    // IPv4-mapped IPv6 — re-check the embedded IPv4 address. Covers both the
    // dotted form (::ffff:1.2.3.4) and the hex-hextet form (::ffff:a9fe:a9fe),
    // which URL canonicalization can produce for the same target address.
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice('::ffff:'.length);
      if (isIP(mapped) === 4) return isBlockedHostname(mapped);

      const hextets = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
      if (hextets) {
        const hi = Number.parseInt(hextets[1], 16);
        const lo = Number.parseInt(hextets[2], 16);
        const mappedIpv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
        return isBlockedHostname(mappedIpv4);
      }
    }
    return false;
  }

  return false;
}

const MAX_REDIRECTS = 5;

// Follows redirects manually (rather than `redirect: 'follow'`) so each hop's
// target is re-validated against isBlockedHostname before being fetched —
// otherwise a public-looking URL could 302 to an internal/metadata address.
async function fetchPage(url: URL, fetchImpl: ScanFetch): Promise<{
  finalUrl: string;
  contentType: string | null;
  html: string;
}> {
  let currentUrl = url;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (isBlockedHostname(currentUrl.hostname)) {
      throw new Error(`Blocked private/internal host: ${currentUrl.hostname}`);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetchImpl(currentUrl, {
        signal: controller.signal,
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': 'KakuninAssessmentBot/1.0 (+https://www.kakunin.ai/assessment)',
        },
        redirect: 'manual',
      });
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing Location header');
      }
      const nextUrl = new URL(location, currentUrl);
      if (!['http:', 'https:'].includes(nextUrl.protocol)) {
        throw new Error(`Blocked redirect protocol: ${nextUrl.protocol}`);
      }
      currentUrl = nextUrl;
      continue;
    }

    return {
      finalUrl: currentUrl.toString(),
      contentType: response.headers.get('content-type'),
      html: (await response.text()).slice(0, MAX_HTML_CHARS),
    };
  }

  throw new Error('Too many redirects');
}

function looksLikeHtml(contentType: string | null, html: string): boolean {
  if (contentType?.includes('text/html') || contentType?.includes('application/xhtml+xml')) {
    return true;
  }
  return /<!doctype html|<html[\s>]/i.test(html);
}

function cleanText(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTagContent(html: string, tagName: 'title' | 'h1'): string | null {
  const match = html.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return cleanText(match?.[1] ?? '') || null;
}

function extractMetaContent(html: string, name: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escapeRegExp(name)}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+property=["']og:${escapeRegExp(name)}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return cleanText(match[1]);
  }

  return null;
}

function stripTags(html: string): string {
  return cleanText(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  );
}

function extractScriptHints(html: string): string {
  const scripts = Array.from(html.matchAll(/<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi)).map((match) => match[1]);
  const inline = Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => cleanText(match[1]))
    .filter(Boolean)
    .slice(0, 6);

  return [...scripts, ...inline].join('\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function collectMatches(text: string, keywords: string[]): string[] {
  const lower = ` ${text.toLowerCase()} `;
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase()));
}

function labelMatches(matches: string[], formatter: (match: string) => string): string[] {
  return Array.from(new Set(matches)).map(formatter);
}

function discoverPublicLinks(html: string, baseUrl: string): DiscoveredPage[] {
  const links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi));
  const results: DiscoveredPage[] = [];

  for (const [, hrefRaw, labelRaw] of links) {
    const href = hrefRaw.trim();
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

    let absolute: URL;
    try {
      absolute = new URL(href, baseUrl);
    } catch {
      continue;
    }

    const path = absolute.pathname.toLowerCase();
    if (!DOC_LINK_HINTS.some((hint) => path.includes(hint))) continue;

    results.push({
      url: absolute.toString(),
      label: cleanText(labelRaw).slice(0, 80) || absolute.pathname,
    });

    if (results.length >= MAX_DISCOVERED_PAGES) break;
  }

  return results;
}

function extractSignals(text: string): WebsiteSignalGroup {
  const explicitAiClaims = labelMatches(collectMatches(text, AI_SIGNAL_KEYWORDS), (match) => `Public copy references "${match.trim()}".`);
  const autonomyClaims = labelMatches(collectMatches(text, AUTONOMY_KEYWORDS), (match) => `Public copy suggests action-taking or orchestration via "${match.trim()}".`);
  const industrySignals = labelMatches(collectMatches(text, INDUSTRY_KEYWORDS), (match) => `Public copy signals a "${match.trim()}" operating context.`);
  const regulatedActivitySignals = labelMatches(collectMatches(text, REGULATED_ACTIVITY_KEYWORDS), (match) => `Public copy references trust-sensitive activity such as "${match.trim()}".`);
  const integrationSignals = labelMatches(collectMatches(text, INTEGRATION_KEYWORDS), (match) => `Technical surface exposes "${match.trim()}".`);
  const trustSignals = labelMatches(collectMatches(text, TRUST_KEYWORDS), (match) => `Public trust or control language includes "${match.trim()}".`);
  const machineIdentitySignals = labelMatches(collectMatches(text, MACHINE_IDENTITY_KEYWORDS), (match) => `Public trust surface references "${match.trim()}".`);

  const missingSignalObservations: string[] = [];
  if ((explicitAiClaims.length > 0 || autonomyClaims.length > 0) && machineIdentitySignals.length === 0) {
    missingSignalObservations.push('The public site describes AI or autonomous behavior but does not show clear machine-identity, attestation, or revocation signals.');
  }
  if (regulatedActivitySignals.length > 0 && trustSignals.length === 0) {
    missingSignalObservations.push('Trust-sensitive activity is visible, but public governance or security controls are not described in detail.');
  }
  if (integrationSignals.length > 0 && autonomyClaims.length === 0 && explicitAiClaims.length === 0) {
    missingSignalObservations.push('The public surface exposes platform or integration signals, but the autonomy level remains unclear.');
  }

  return {
    explicitAiClaims,
    autonomyClaims,
    industrySignals,
    regulatedActivitySignals,
    integrationSignals,
    trustSignals,
    machineIdentitySignals,
    missingSignalObservations,
  };
}

function mergeSignalGroups(groups: WebsiteSignalGroup[]): WebsiteSignalGroup {
  const unique = (items: string[]) => Array.from(new Set(items));

  return {
    explicitAiClaims: unique(groups.flatMap((group) => group.explicitAiClaims)),
    autonomyClaims: unique(groups.flatMap((group) => group.autonomyClaims)),
    industrySignals: unique(groups.flatMap((group) => group.industrySignals)),
    regulatedActivitySignals: unique(groups.flatMap((group) => group.regulatedActivitySignals)),
    integrationSignals: unique(groups.flatMap((group) => group.integrationSignals)),
    trustSignals: unique(groups.flatMap((group) => group.trustSignals)),
    machineIdentitySignals: unique(groups.flatMap((group) => group.machineIdentitySignals)),
    missingSignalObservations: unique(groups.flatMap((group) => group.missingSignalObservations)),
  };
}

function extractPageData(html: string, finalUrl: string): PageExtraction {
  const title = extractTagContent(html, 'title');
  const description = extractMetaContent(html, 'description');
  const text = stripTags(html);
  const scriptHints = extractScriptHints(html);
  const haystack = [title, description, text, scriptHints].filter(Boolean).join('\n');

  return {
    title,
    description,
    text: haystack,
    scriptHints,
    discoveredLinks: discoverPublicLinks(html, finalUrl),
    signals: extractSignals(haystack),
  };
}

function pickEcosystem(haystack: string): EcosystemFinding {
  let bestRule: { ecosystem: AssessmentEcosystem; label: string; keywords: string[] } | null = null;
  let bestScore = 0;

  for (const rule of ECOSYSTEM_RULES) {
    const score = rule.keywords.reduce((sum, keyword) => sum + (haystack.toLowerCase().includes(keyword) ? 1 : 0), 0);
    if (score > bestScore) {
      bestRule = rule;
      bestScore = score;
    }
  }

  if (!bestRule) {
    return {
      ecosystem: 'custom_unknown',
      label: 'Custom / Unknown',
      confidence: 0.18,
    };
  }

  return {
    ecosystem: bestRule.ecosystem,
    label: bestRule.label,
    confidence: Math.min(0.94, 0.3 + bestScore * 0.12),
  };
}

function pickFrameworks(text: string, packet: AssessmentEvidencePacket): ComplianceFramework[] {
  const lower = text.toLowerCase();
  const frameworks: ComplianceFramework[] = [];

  if (packet.website_signals.explicitAiClaims.length > 0 || packet.website_signals.autonomyClaims.length > 0) {
    frameworks.push('eu_ai_act');
  }

  if (/(crypto|token|wallet|exchange|broker|trading)/.test(lower)) {
    frameworks.push('mica');
  }

  if (packet.website_signals.trustSignals.length > 0 || packet.website_signals.regulatedActivitySignals.length > 0) {
    frameworks.push('nist');
  }

  return Array.from(new Set(frameworks));
}

function frameworkLabels(frameworks: ComplianceFramework[]): string[] {
  return frameworks.map((framework) => {
    if (framework === 'eu_ai_act') return 'EU AI Act';
    if (framework === 'mica') return 'MiCA';
    return 'NIST';
  });
}

function buildCertificateRiskProfile(
  assessment: LLMAssessmentResult,
  ecosystem: EcosystemFinding,
  frameworks: ComplianceFramework[],
): CertificateRiskProfile {
  const segmentBoost = {
    regulated_operator: 14,
    autonomous_enterprise_software: 9,
    early_ai_productivity_tool: 2,
    insufficient_public_evidence: -10,
  }[assessment.segment];

  const confidenceBoost = Math.round(assessment.confidence * 18);
  const frameworkBoost = frameworks.length * 5;

  const categories: RiskCategory[] = [
    {
      key: 'impersonation',
      label: 'Impersonation risk',
      score: clampRisk(46 + segmentBoost + confidenceBoost + (ecosystem.ecosystem !== 'custom_unknown' ? 4 : 0)),
      reason: 'Without a durable agent identity, it becomes harder to prove which automated system actually acted across customer and connector surfaces.',
    },
    {
      key: 'auditability',
      label: 'Auditability gap',
      score: clampRisk(50 + segmentBoost + frameworkBoost + Math.round(assessment.business_risks.length * 1.5)),
      reason: 'When autonomous software drafts, approves, or executes work, the missing trust layer makes post-incident evidence and internal review weaker.',
    },
    {
      key: 'revocation',
      label: 'Revocation delay risk',
      score: clampRisk(44 + segmentBoost + confidenceBoost),
      reason: 'If the product or connector workflow misbehaves, revoking trust is slower when identity and authority are inferred rather than cryptographically anchored.',
    },
    {
      key: 'regulatory',
      label: 'Trust evidence gap',
      score: clampRisk(42 + frameworkBoost + (assessment.segment === 'regulated_operator' ? 18 : 8)),
      reason: 'Even outside strict regulation, missing trust signals make enterprise reviews, procurement, and governance sign-off more difficult.',
    },
  ];

  const overallScore = clampRisk(Math.round(categories.reduce((sum, item) => sum + item.score, 0) / categories.length));
  const overallLabel = labelRisk(overallScore);

  return {
    overallScore,
    overallLabel,
    headline: `Estimated trust risk of operating without an identity certificate: ${overallScore}/100 (${overallLabel}).`,
    disclaimer: 'This is a heuristic estimate based on public website and news signals. It is meant to prioritize trust and governance review, not provide legal advice.',
    categories,
  };
}

function clampRisk(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function labelRisk(score: number): CertificateRiskProfile['overallLabel'] {
  if (score >= 85) return 'critical';
  if (score >= 70) return 'high';
  if (score >= 50) return 'moderate';
  return 'low';
}

function buildSummary(domain: string, assessment: LLMAssessmentResult): string {
  return `${domain} looks like a ${assessment.segment.replaceAll('_', ' ')} case. ${assessment.email_report_summary}`;
}

function buildLimitedResult(
  inputUrl: string,
  normalizedUrl: string,
  finalUrl: string | null,
  reason: string,
): AssessmentScanResult {
  const url = finalUrl || normalizedUrl;
  let domain = 'unknown';
  try {
    domain = new URL(url).hostname.replace(/^www\./i, '');
  } catch {
    domain = normalizedUrl.replace(/^https?:\/\//i, '').split('/')[0] || 'unknown';
  }

  const packet: AssessmentEvidencePacket = {
    company_profile: {
      domain,
      title: null,
      description: null,
      categoryLabels: [],
      publicLinks: [],
    },
    website_signals: {
      explicitAiClaims: [],
      autonomyClaims: [],
      industrySignals: [],
      regulatedActivitySignals: [],
      integrationSignals: [],
      trustSignals: [],
      machineIdentitySignals: [],
      missingSignalObservations: ['The public page could not be fully read, so no strong trust or autonomy evidence could be validated.'],
    },
    news_signals: [],
    scan_limits: [reason, 'Public evidence was too limited for a differentiated assessment.'],
  };

  const assessment = {
    segment: 'insufficient_public_evidence',
    confidence: 0.08,
    observed_signals: ['Public evidence was not readable enough to assess the product.'],
    external_evidence: [],
    missing_trust_signals: ['No public machine-identity or autonomy evidence could be confirmed.'],
    business_risks: ['The product surface could not be validated from public evidence.'],
    regulatory_relevance: {
      eu_ai_act: 'weak_evidence',
      mica: 'not_supported',
      nist: 'weak_evidence',
    },
    why_kakunin_now: 'The practical next step is a manual trust review rather than a product recommendation.',
    why_not_now: 'The public site does not expose enough product detail to support a differentiated identity or governance recommendation yet.',
    recommended_next_step: 'Share a canonical product page, docs page, or run a manual trust review to confirm whether the software actually acts autonomously and where user trust depends on it.',
    email_report_summary: `We could not fully read ${domain}, so this is a conservative placeholder rather than a confident trust assessment.`,
    cta_path: '/contact-sales',
    limitations: [reason, 'Public evidence was too limited for a differentiated assessment.'],
  } satisfies LLMAssessmentResult;

  return {
    status: 'limited',
    inputUrl,
    normalizedUrl,
    finalUrl: url,
    websiteDomain: domain,
    pageTitle: null,
    pageDescription: null,
    ecosystem: 'custom_unknown',
    ecosystemLabel: 'Custom / Unknown',
    ecosystemConfidence: 0.08,
    frameworks: [],
    frameworkLabels: [],
    recommendation: assessment.recommended_next_step,
    summary: assessment.email_report_summary,
    certificateRisk: buildCertificateRiskProfile(assessment, {
      ecosystem: 'custom_unknown',
      label: 'Custom / Unknown',
      confidence: 0.08,
    }, []),
    segment: assessment.segment,
    observedSignals: assessment.observed_signals,
    missingTrustSignals: assessment.missing_trust_signals,
    whyKakuninNow: assessment.why_kakunin_now,
    whyNotNow: assessment.why_not_now,
    recommendedNextStep: assessment.recommended_next_step,
    limitations: assessment.limitations,
    ctaPath: assessment.cta_path,
    regulatoryRelevance: assessment.regulatory_relevance,
    externalEvidence: [],
    evidence: {
      accessible: false,
      contentType: null,
      packet,
      assessment,
      ecosystemKeywords: [],
    },
  };
}

export function detectAssessmentFromHtml(
  html: string,
  inputUrl: string,
  normalizedUrl: string,
  finalUrl: string,
  contentType: string | null,
): AssessmentScanResult {
  if (!looksLikeHtml(contentType, html)) {
    return buildLimitedResult(inputUrl, normalizedUrl, finalUrl, 'Page did not return HTML');
  }

  const extracted = extractPageData(html, finalUrl);
  const packet: AssessmentEvidencePacket = {
    company_profile: {
      domain: new URL(finalUrl || normalizedUrl).hostname.replace(/^www\./i, ''),
      title: extracted.title,
      description: extracted.description,
      categoryLabels: Array.from(new Set([
        ...extracted.signals.industrySignals.map((item) => item.replace(/^Public copy signals a "(.+)" operating context\.$/, '$1')),
      ])).slice(0, 5),
      publicLinks: extracted.discoveredLinks,
    },
    website_signals: extracted.signals,
    news_signals: [],
    scan_limits: extracted.text.length < 500 ? ['Public site content was sparse and may understate the real product surface.'] : [],
  };

  const ecosystem = pickEcosystem(extracted.text);
  const frameworks = pickFrameworks(extracted.text, packet);
  const assessment = buildFallbackAssessment(packet);

  const risk = buildCertificateRiskProfile(assessment, ecosystem, frameworks);
  const record: AssessmentEvidenceRecord = {
    accessible: true,
    contentType,
    packet,
    assessment,
    ecosystemKeywords: ECOSYSTEM_RULES.flatMap((rule) => rule.keywords.filter((keyword) => extracted.text.toLowerCase().includes(keyword))),
  };

  return {
    status: 'completed',
    inputUrl,
    normalizedUrl,
    finalUrl,
    websiteDomain: packet.company_profile.domain,
    pageTitle: extracted.title,
    pageDescription: extracted.description,
    ecosystem: ecosystem.ecosystem,
    ecosystemLabel: ecosystem.label,
    ecosystemConfidence: ecosystem.confidence,
    frameworks,
    frameworkLabels: frameworkLabels(frameworks),
    recommendation: assessment.recommended_next_step,
    summary: buildSummary(packet.company_profile.domain, assessment),
    certificateRisk: risk,
    segment: assessment.segment,
    observedSignals: assessment.observed_signals,
    missingTrustSignals: assessment.missing_trust_signals,
    whyKakuninNow: assessment.why_kakunin_now,
    whyNotNow: assessment.why_not_now,
    recommendedNextStep: assessment.recommended_next_step,
    limitations: assessment.limitations,
    ctaPath: assessment.cta_path,
    regulatoryRelevance: assessment.regulatory_relevance,
    externalEvidence: assessment.external_evidence,
    evidence: record,
  };
}

export async function scanPublicWebsite(
  inputUrl: string,
  options?: {
    fetchImpl?: ScanFetch;
  },
): Promise<AssessmentScanResult> {
  const normalizedUrl = normalizeAssessmentUrl(inputUrl);
  if (!normalizedUrl) {
    return buildLimitedResult(inputUrl, inputUrl, null, 'Invalid or private URL');
  }

  const fetchImpl = options?.fetchImpl ?? fetch;

  try {
    const basePage = await fetchPage(normalizedUrl, fetchImpl);
    if (!looksLikeHtml(basePage.contentType, basePage.html)) {
      return buildLimitedResult(inputUrl, normalizedUrl.toString(), basePage.finalUrl, 'Page did not return HTML');
    }

    const baseExtraction = extractPageData(basePage.html, basePage.finalUrl);
    const pageExtractions = [baseExtraction];
    const scanLimits: string[] = [];

    for (const link of baseExtraction.discoveredLinks.slice(0, MAX_DISCOVERED_PAGES)) {
      try {
        const linkUrl = new URL(link.url);
        if (isBlockedHostname(linkUrl.hostname)) {
          scanLimits.push(`Skipped blocked private/internal link: ${link.url}`);
          continue;
        }
        const linked = await fetchPage(linkUrl, fetchImpl);
        if (!looksLikeHtml(linked.contentType, linked.html)) {
          scanLimits.push(`Skipped non-HTML public page: ${link.url}`);
          continue;
        }
        pageExtractions.push(extractPageData(linked.html, linked.finalUrl));
      } catch {
        scanLimits.push(`Could not read linked public page: ${link.url}`);
      }
    }

    const combinedText = pageExtractions.map((page) => page.text).join('\n');
    const mergedSignals = mergeSignalGroups(pageExtractions.map((page) => page.signals));
    const domain = new URL(basePage.finalUrl || normalizedUrl.toString()).hostname.replace(/^www\./i, '');
    const brandName = baseExtraction.title?.split(/[\-|·|:|—]/)[0]?.trim() || domain.replace(/\..+$/, '');
    const newsSignals = await fetchNewsSignals({ brandName, domain, fetchImpl });
    if (!newsSignals.length) {
      scanLimits.push('No relevant public news was found for the brand within the default news scan.');
    }
    if (combinedText.length < 900) {
      scanLimits.push('Public site content was sparse and may understate the real product surface.');
    }

    const packet: AssessmentEvidencePacket = {
      company_profile: {
        domain,
        title: baseExtraction.title,
        description: baseExtraction.description,
        categoryLabels: Array.from(new Set([
          ...mergedSignals.industrySignals.map((item) => item.replace(/^Public copy signals a "(.+)" operating context\.$/, '$1')),
        ])).slice(0, 5),
        publicLinks: Array.from(new Map(baseExtraction.discoveredLinks.map((item) => [item.url, item])).values()),
      },
      website_signals: mergedSignals,
      news_signals: newsSignals,
      scan_limits: Array.from(new Set(scanLimits)),
    };

    const assessment = await assessEvidencePacket(packet);
    const ecosystem = pickEcosystem(combinedText);
    const frameworks = pickFrameworks(combinedText, packet);
    const risk = buildCertificateRiskProfile(assessment, ecosystem, frameworks);

    const evidence: AssessmentEvidenceRecord = {
      accessible: true,
      contentType: basePage.contentType,
      packet,
      assessment,
      ecosystemKeywords: ECOSYSTEM_RULES.flatMap((rule) => rule.keywords.filter((keyword) => combinedText.toLowerCase().includes(keyword))),
    };

    return {
      status: 'completed',
      inputUrl,
      normalizedUrl: normalizedUrl.toString(),
      finalUrl: basePage.finalUrl,
      websiteDomain: domain,
      pageTitle: baseExtraction.title,
      pageDescription: baseExtraction.description,
      ecosystem: ecosystem.ecosystem,
      ecosystemLabel: ecosystem.label,
      ecosystemConfidence: ecosystem.confidence,
      frameworks,
      frameworkLabels: frameworkLabels(frameworks),
      recommendation: assessment.recommended_next_step,
      summary: buildSummary(domain, assessment),
      certificateRisk: risk,
      segment: assessment.segment,
      observedSignals: assessment.observed_signals,
      missingTrustSignals: assessment.missing_trust_signals,
      whyKakuninNow: assessment.why_kakunin_now,
      whyNotNow: assessment.why_not_now,
      recommendedNextStep: assessment.recommended_next_step,
      limitations: assessment.limitations,
      ctaPath: assessment.cta_path,
      regulatoryRelevance: assessment.regulatory_relevance,
      externalEvidence: assessment.external_evidence,
      evidence,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to fetch page';
    return buildLimitedResult(inputUrl, normalizedUrl.toString(), normalizedUrl.toString(), message);
  }
}
