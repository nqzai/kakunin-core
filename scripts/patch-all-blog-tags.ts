import { sanityClient } from '../src/lib/sanity/client.js';

// Tags assigned by reading title + excerpt of each post.
// Predefined tag set: compliance | kya | mica | eu-ai-act | identity |
//   agent-security | trading-bot | case-study | architecture | sdk | api |
//   certificates | audit-log | behavioral-profiling

const tagMap: Record<string, string[]> = {
  // Market analysis — broad compliance theme
  'ai-agent-compliance-market-2-7-billion': ['compliance'],

  // Certificate renewal lifecycle
  'annual-ai-agent-compliance-certificate-renewal': ['compliance', 'certificates'],

  // 30-day rolling risk window, volume deviation, anomaly detection
  'measuring-risk-deployed-ai-agents-30-day-window': ['behavioral-profiling', 'compliance', 'agent-security'],

  // Regulator-facing public verification endpoints, no-auth cert check
  'how-regulators-verify-ai-agents-without-vendor-credentials': ['compliance', 'identity', 'certificates'],

  // KMS, HSM-backed key custody, private key architecture
  'private-key-security-ai-agents-kms': ['certificates', 'agent-security', 'architecture'],

  // EU AI Act Articles 12–15, five-phase roadmap
  'eu-ai-act-compliance-roadmap-high-risk-ai-systems': ['eu-ai-act', 'compliance'],

  // Auto-revocation, circuit breakers, risk score threshold
  'building-trust-autonomous-systems-auto-revocation': ['agent-security', 'compliance', 'certificates'],

  // MiCA Articles 61–75, algorithmic trading, CASPs
  'mica-articles-61-75-ai-agent-operators': ['mica', 'compliance', 'trading-bot'],

  // LangChain SDK integration, KakuninToolGuard, scope enforcement
  'securing-langchain-agent-tools-kakunin': ['sdk', 'agent-security'],

  // Behavioral event streaming, risk scoring, anomaly detection, auto-revocation
  'behavioral-monitoring-ai-agents-compliance-layer': ['behavioral-profiling', 'compliance', 'audit-log'],

  // Already tagged — skip (no-op, safe to re-apply)
  'mica-trading-bot-case-study': ['mica', 'compliance', 'trading-bot', 'case-study', 'audit-log'],
  'know-your-agent-explained': ['kya', 'compliance', 'identity', 'agent-security', 'behavioral-profiling'],

  // Runtime binding, X.509, scope limits, privilege escalation prevention
  'secure-runtime-binding-llm-agents': ['identity', 'certificates', 'agent-security', 'architecture'],

  // KYA platform comparison, Grok evaluation, identity tools
  'kya-platform-comparison-grok-2026': ['kya', 'identity', 'compliance'],

  // EU AI Act Articles 9–15, audit logging, human oversight, conformity
  'eu-ai-act-compliance-autonomous-agents': ['eu-ai-act', 'compliance', 'audit-log'],

  // X.509 vs API keys, cryptographic identity, non-repudiation
  'why-ai-agents-need-x509-certificates': ['certificates', 'identity', 'agent-security'],

  // EU AI Act May 2026 news update, Article 12, audit log requirements
  'eu-ai-act-implementation-update-may-2026': ['eu-ai-act', 'compliance', 'audit-log'],

  // Prompt injection attacks — security focus
  'top-10-prompt-injection-attacks': ['agent-security'],

  // Guardrails, behavioral evaluation, circuit breakers
  'guardrails-for-ai-agents': ['agent-security', 'behavioral-profiling', 'compliance'],

  // Circuit breakers, risk scoring, spend limits (draft)
  'circuit-breakers-for-ai-agents': ['agent-security', 'behavioral-profiling'],

  // Duplicate X.509 vs API keys post (different slug)
  'why-ai-agents-need-cryptographic-x509-certificates': ['certificates', 'identity', 'agent-security'],

  // MiCA Article 72, logging + identity for algorithmic trading
  'mica-article-72-ai-agents': ['mica', 'compliance', 'audit-log', 'trading-bot'],
};

async function patchAllTags() {
  const posts = await sanityClient.fetch<{ _id: string; slug: { current: string } }[]>(
    `*[_type == 'blogPost'] { _id, slug }`
  );

  console.log(`Found ${posts.length} posts\n`);

  for (const post of posts) {
    const slug = post.slug?.current;
    const tags = tagMap[slug];

    if (!tags) {
      console.warn(`⚠️  No tags defined for slug: ${slug}`);
      continue;
    }

    await sanityClient.patch(post._id).set({ tags }).commit();
    console.log(`✅ ${slug}\n   → ${tags.join(', ')}`);
  }

  console.log('\nDone.');
}

patchAllTags().catch(console.error);
