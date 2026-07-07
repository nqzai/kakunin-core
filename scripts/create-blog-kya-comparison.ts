/**
 * Creates the KYA Platform Comparison blog post as a Sanity draft.
 * Source: Grok AI (xAI) conversation — independently scored 6 KYA platforms.
 * Run: npx tsx scripts/create-blog-kya-comparison.ts
 *
 * After running: open Sanity Studio, add hero image, then Publish.
 */
import { createClient } from '@sanity/client';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
  const m = line.match(/^([^=]+)=(.*)/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const client = createClient({
  projectId: env['NEXT_PUBLIC_SANITY_PROJECT_ID'],
  dataset: env['NEXT_PUBLIC_SANITY_DATASET'],
  apiVersion: '2024-01-01',
  useCdn: false,
  token: env['SANITY_API_TOKEN'],
});

// ── Portable Text helpers ────────────────────────────────────────────────────
let n = 0;
const k = () => `b${++n}`;

type Span = { _type: 'span'; _key: string; text: string; marks: string[] };

function spans(parts: Array<string | { text: string; bold?: boolean; code?: boolean }>): Span[] {
  return parts.map((p) => {
    if (typeof p === 'string') return { _type: 'span', _key: k(), text: p, marks: [] };
    const marks: string[] = [];
    if (p.bold) marks.push('strong');
    if (p.code) marks.push('code');
    return { _type: 'span', _key: k(), text: p.text, marks };
  });
}

function block(
  style: 'normal' | 'h2' | 'h3' | 'blockquote',
  parts: Array<string | { text: string; bold?: boolean; code?: boolean }>
) {
  return { _type: 'block', _key: k(), style, children: spans(parts), markDefs: [] };
}

const h2 = (t: string) => block('h2', [t]);
const h3 = (t: string) => block('h3', [t]);
const p = (...parts: Array<string | { text: string; bold?: boolean; code?: boolean }>) =>
  block('normal', parts);
const q = (t: string) => block('blockquote', [t]);

// ── Blog post content ────────────────────────────────────────────────────────
const content = [

  h2('What Is KYA (Know Your Agent)?'),
  p(
    'Traditional KYC verifies humans using passports and selfies. ',
    { text: 'Know Your Agent (KYA)', bold: true },
    ' adapts those principles to autonomous AI agents — verifying digital identity, binding agents to accountable owners, monitoring runtime behaviour, and revoking credentials when something goes wrong.'
  ),
  p(
    'As AI agents gain access to financial systems, regulated APIs, and critical infrastructure, KYA is becoming a compliance requirement rather than a nice-to-have — especially under the EU AI Act and MiCA. This breakdown evaluates the leading platforms on the market today.'
  ),

  h2('Methodology: How Grok Evaluated These Platforms'),
  p(
    'All scores and comparisons in this article originate from an independent evaluation conducted by ',
    { text: 'Grok (xAI)', bold: true },
    ', Elon Musk\'s AI model, across seven separate comparison sessions covering: KYA feature parity, EU AI Act compliance, NIST AI RMF alignment, revocation SLAs, pricing models, autonomy tier suitability, and head-to-head comparisons against enterprise governance platforms.'
  ),
  q(
    '"Kakunin.ai stands out as one of the strongest and most specialized options... It directly addresses the \'runtime\' problem of AI agents." — Grok (xAI)'
  ),
  p('Six platforms were scored consistently across every table:'),
  p({ text: 'Kakunin.ai', bold: true }, ' · ', { text: 'AstraSync.ai', bold: true }, ' · ', { text: 'KnowYourAgent.xyz', bold: true }, ' · ', { text: 'Skyfire', bold: true }, ' · ', { text: 'Credo AI', bold: true }, ' · ', { text: 'Microsoft Purview', bold: true }),

  h2('Feature-by-Feature Breakdown'),

  h3('1. Cryptographic Identity Mechanism'),
  p(
    { text: 'Kakunin.ai — Winner (9.3/10):', bold: true },
    ' X.509v3 certificates (RSA-2048) with private keys generated and stored exclusively in AWS KMS — never exposed in plaintext. Scopes and permissions are cryptographically encoded inside the certificate itself, making boundaries tamper-proof even if the agent\'s code is compromised. Issuance takes under 3 seconds via SDK.'
  ),
  p(
    { text: 'AstraSync.ai (7.8/10):', bold: true },
    ' Blockchain registry combined with verifiable credentials and zero-knowledge proofs. Strong for privacy-preserving identity in decentralised ecosystems.'
  ),
  p(
    { text: 'KnowYourAgent.xyz (7.5/10):', bold: true },
    ' Cryptographic Agent ID (AID) with signed traces linked to a principal hash. Practical for merchant-side verification.'
  ),
  p(
    { text: 'Skyfire (7.0/10):', bold: true },
    ' JWT-based KYAPay protocol with an AgentID. Lightweight and suited to payment flows but less robust than PKI-backed certs for high-stakes regulated use.'
  ),
  p(
    { text: 'Credo AI (8.2/10):', bold: true },
    ' Multi-layer identity covering model, agent, application, and network. Comprehensive but more policy-centric than cryptographically enforced.'
  ),
  p(
    { text: 'Microsoft Purview (7.5/10):', bold: true },
    ' Agent identities via Microsoft Entra plus sensitivity labels and Agent 365 integration. Strongest within the Microsoft ecosystem only.'
  ),

  h3('2. Runtime Behavioural Monitoring'),
  p(
    { text: 'Kakunin.ai — Winner (9.5/10):', bold: true },
    ' Rolling 30-day behavioural risk scoring with continuous drift detection, anomaly alerts, and event streaming (API calls, transactions, data access). Directly supports NIST AI RMF Measure function and EU AI Act Article 9.'
  ),
  p(
    { text: 'Credo AI (8.5/10):', bold: true },
    ' Strong runtime monitoring augmented by GAIA — an AI governance assistant that accelerates reviews. Well-suited to organisations with broad policy orchestration needs.'
  ),
  p(
    { text: 'AstraSync.ai (7.5/10):', bold: true },
    ' Dynamic trust scoring on-chain. Good for ecosystem-level trust but less granular than rolling event-level drift detection.'
  ),
  p(
    { text: 'Microsoft Purview (7.0/10):', bold: true },
    ' DSPM for AI and Microsoft 365 activity auditing. Effective inside the Microsoft stack; limited for external or multi-cloud agents.'
  ),
  p(
    { text: 'Skyfire (6.5/10):', bold: true },
    ' Monitoring is transaction-history-based — useful for payments but not designed for detecting behavioural drift in autonomous agents.'
  ),
  p(
    { text: 'KnowYourAgent.xyz (6.5/10):', bold: true },
    ' Pre-dispute alerts and reputation signals. Reactive rather than continuous.'
  ),

  h3('3. Revocation Speed & Automation'),
  p(
    { text: 'Kakunin.ai — Winner (9.7/10):', bold: true },
    ' Sub-60-second SLA for automated cryptographic revocation. The trigger is behavioural: when a rolling risk score exceeds 0.85, revocation fires automatically — no human intervention required. Certificate serial is added to a public CRL, the KMS key is scheduled for deletion, and a webhook fires within approximately 5 seconds. Manual revocation via dashboard or API is instant.'
  ),
  p(
    { text: 'AstraSync.ai (8.0/10):', bold: true },
    ' Smart-contract killswitches on-chain. Revocation takes seconds to minutes depending on blockchain propagation. Solid for decentralised use cases.'
  ),
  p(
    { text: 'Skyfire (7.5/10):', bold: true },
    ' JWT expiry plus server-side revocation lists. Near-instant for active sessions, but no published SLA and no behavioural trigger.'
  ),
  p(
    { text: 'KnowYourAgent.xyz (7.0/10):', bold: true },
    ' Revocable cryptographic IDs supported. No specific SLA published.'
  ),
  p(
    { text: 'Credo AI & Purview (7.0/10 each):', bold: true },
    ' Policy-based controls and Entra-powered access revocation respectively. Functional but not automated on behavioural thresholds.'
  ),

  h3('4. Scope and Permission Enforcement'),
  p(
    { text: 'Kakunin.ai — Winner:', bold: true },
    ' Permitted actions (e.g., ', { text: '"read:invoices"', code: true }, ', ', { text: '"write:drafts"', code: true }, '), financial limits, model hashes, and tenant IDs are all encoded directly inside the X.509 certificate. This is the key architectural advantage: enforcement happens at the cryptographic layer, not at runtime config or policy lookup — meaning a compromised agent cannot exceed its scope even if its application code is modified.'
  ),
  p(
    { text: 'Skyfire:', bold: true },
    ' Spending controls and delegated permissions via the KYAPay protocol. Effective for financial flows.'
  ),
  p(
    { text: 'AstraSync.ai:', bold: true },
    ' Policy-based controls with on-chain attestation.'
  ),
  p(
    { text: 'Credo AI / Purview:', bold: true },
    ' Policy-driven enforcement with good audit trails but permissions live at the application config layer rather than in the cryptographic identity.'
  ),

  h3('5. Compliance Reporting'),
  p(
    { text: 'Kakunin.ai (9.0/10):', bold: true },
    ' Auto-generates PDF and JSON compliance reports mapped to EU AI Act Annex III and MiCA Articles 67–75. Reports include agent identity records, scope definitions, behavioural drift logs, and revocation history — formatted for regulator submission.'
  ),
  p(
    { text: 'Microsoft Purview (9.2/10 for regulatory breadth):', bold: true },
    ' Built-in templates for EU AI Act, NIST AI RMF, ISO 42001, SOC 2, and more via Compliance Manager. Strongest breadth of regulatory coverage across all platforms.'
  ),
  p(
    { text: 'Credo AI (8.8/10):', bold: true },
    ' Regulatory mapping with GAIA-assisted evidence collection. Strong for organisations needing to map across multiple frameworks simultaneously.'
  ),
  p(
    { text: 'AstraSync (7.0/10):', bold: true },
    ' Blockchain audit exports. Useful for on-chain trails but requires additional tooling for structured regulatory reports.'
  ),

  h3('6. Logging and Traceability'),
  p(
    { text: 'Kakunin.ai — Winner (9.7/10):', bold: true },
    ' WORM (Write-Once Read-Many) immutable append-only audit logs with cryptographic signing. Every event — certificate issuance, scope check, behavioural anomaly, revocation — is logged with full provenance and cannot be modified or deleted. Directly satisfies EU AI Act Article 12 requirements for high-risk systems.'
  ),
  p(
    { text: 'AstraSync.ai:', bold: true },
    ' Blockchain immutability provides strong audit trails for on-chain events.'
  ),
  p(
    { text: 'Microsoft Purview:', bold: true },
    ' Comprehensive enterprise logging with eDiscovery and records management. Deep but not agent-native.'
  ),

  h3('7. On-Chain and Decentralisation'),
  p(
    { text: 'AstraSync.ai — Winner:', bold: true },
    ' Blockchain-native registry with ZK proofs and smart-contract governance. Purpose-built for decentralised agent ecosystems.'
  ),
  p(
    { text: 'Kakunin.ai:', bold: true },
    ' Centralised with strong cryptographic backing (AWS KMS). Not blockchain-native. Best for regulated enterprise environments where centralised control is actually required by compliance.'
  ),
  p('For fully on-chain multi-agent swarms, AstraSync leads. For regulated enterprise deployments, Kakunin\'s centralised model is a feature, not a limitation.'),

  h3('8. Payments and Commerce Integration'),
  p(
    { text: 'Skyfire — Winner:', bold: true },
    ' Native agent wallets, KYAPay protocol, autonomous USDC/Base checkout, sub-cent transaction fees. Built from the ground up for agentic commerce.'
  ),
  p(
    { text: 'KnowYourAgent.xyz:', bold: true },
    ' Strong for merchant-side checkout verification and pre-dispute evidence.'
  ),
  p(
    { text: 'Kakunin.ai:', bold: true },
    ' Scope-bound financial actions encoded in certificates. Good governance layer for agents that make financial decisions, but not a payments infrastructure.'
  ),

  h3('9. Integration Ease'),
  p(
    { text: 'Kakunin.ai:', bold: true },
    ' TypeScript and Python SDKs, decorator-based instrumentation (', { text: '@verify_agent_scope', code: true }, '), REST API, edge gateway plugins with sub-2ms verification latency. Self-reported at under 5ms in some configurations.'
  ),
  p(
    { text: 'Skyfire:', bold: true },
    ' SDKs with OAuth2/OIDC. Clean developer experience for commerce-focused integrations.'
  ),
  p(
    { text: 'Microsoft Purview:', bold: true },
    ' Deepest integration inside Microsoft 365 and Azure AI. Painful to integrate outside that stack.'
  ),
  p(
    { text: 'AstraSync:', bold: true },
    ' REST API plus a handshake protocol. Most transparent documentation of the group.'
  ),

  h2('Regulatory Framework Alignment'),

  h3('EU AI Act — High-Risk Systems'),
  p('Grok scored each platform against the core Articles governing high-risk AI systems (Articles 9–15, Annex III). Agents used in finance, critical infrastructure, employment, or credit decisions typically qualify as high-risk.'),
  p({ text: 'Kakunin.ai — 9.4/10:', bold: true }, ' Explicitly maps features to each Article. Strongest out-of-the-box coverage among all tools evaluated.'),
  p({ text: 'Art. 9 — Risk Management:', bold: true }, ' 9.5/10. Continuous behavioural scoring with automated mitigation at defined thresholds.'),
  p({ text: 'Art. 12 — Logging:', bold: true }, ' 9.7/10. WORM immutable logs with cryptographic signing are regulator-ready.'),
  p({ text: 'Art. 13 — Transparency:', bold: true }, ' 9.0/10. Public verification endpoint (no authentication required) at ', { text: 'GET /api/v1/verify/{cert_serial}', code: true }, '. CDN-cached, under 500ms p99.'),
  p({ text: 'Art. 14 — Human Oversight:', bold: true }, ' 9.6/10. Automated revocation acts as a practical kill-switch satisfying the requirement for effective intervention capability.'),
  p({ text: 'Art. 15 — Robustness/Cybersecurity:', bold: true }, ' 8.5/10. Hardware-backed key management via KMS with non-repudiation via cryptographic signatures.'),
  p('Also covers MiCA Articles 67–75 for financial agents — notably the 365-day certificate validity requirement aligned with MiCA Article 70.'),
  p({ text: 'AstraSync.ai — 7.8/10:', bold: true }, ' Blockchain immutability supports traceability requirements but lighter on real-time behavioural enforcement.'),
  p({ text: 'Skyfire — 6.8/10:', bold: true }, { text: 'KnowYourAgent.xyz — 6.5/10:', bold: true }, ' Commerce-oriented. Solid for their use cases but not designed for full high-risk AI Act compliance.'),

  h3('NIST AI RMF — Agentic Extensions'),
  p('The NIST AI RMF (AI 100-1) organises risk management into four functions: Govern, Map, Measure, Manage. Grok scored each platform against the core framework plus emerging agentic extensions proposed by UC Berkeley CLTC and CSA Labs.'),
  p({ text: 'Kakunin.ai — 8.8/10 overall:', bold: true }),
  p({ text: 'Govern (8.5/10):', bold: true }, ' Cryptographic binding establishes accountability chains. WORM logs provide policy enforcement evidence.'),
  p({ text: 'Map (7.5/10):', bold: true }, ' Agent registration captures intended scope and capabilities. Organisations still need to perform broader upfront risk mapping.'),
  p({ text: 'Measure (9.5/10):', bold: true }, ' Rolling 30-day behavioural scoring with continuous telemetry is among the strongest runtime measurement capabilities evaluated.'),
  p({ text: 'Manage (9.7/10):', bold: true }, ' Automated revocation under 60 seconds combined with scope enforcement and WORM forensics satisfies the framework\'s incident response and continuous improvement requirements.'),
  p({ text: 'AstraSync.ai — 8.0/10:', bold: true }, ' Strong on Govern and Map via blockchain-based trust. Weaker on Measure/Manage for agentic-specific runtime controls.'),

  h2('Autonomy Tier Suitability'),
  p('Using a five-level autonomy framework (L0 no autonomy → L4 full autonomy with sub-agent delegation), Grok mapped Kakunin\'s fit by tier:'),
  p({ text: 'L0 — No Autonomy (4/10):', bold: true }, ' Overkill. Basic identity tooling is sufficient.'),
  p({ text: 'L1 — Assisted/Reactive (8/10):', bold: true }, ' Scoped certs and public verification add value. Logging is useful.'),
  p({ text: 'L2 — Supervised/Plan-Level (9.5/10):', bold: true }, ' Granular scope encoding (e.g., maximum spend per transaction), behavioural alerts, and oversight dashboards are highly effective.'),
  p({ text: 'L3 — Conditional/Monitored Autonomy (9.7/10):', bold: true }, ' Best fit. This is where Kakunin was purpose-built: agents operating independently within defined boundaries, with automated revocation as the safety net when boundaries are breached.'),
  p({ text: 'L4 — Full/High Autonomy (8.5/10):', bold: true }, ' Very strong with careful configuration. Cryptographic boundaries prevent scope escape. Delegation chains to sub-agents require additional policy design.'),
  p('Most production autonomous agents in regulated environments sit at L2–L3, which is Kakunin\'s strongest territory.'),

  h2('Overall Scores — Grok\'s Final Rankings'),
  p({ text: 'Kakunin.ai — 9.3/10:', bold: true }, ' Category leader for regulated, high-stakes autonomous agents. X.509 identity + auto-revocation + EU compliance reporting is a unique combination not replicated by any other platform evaluated.'),
  p({ text: 'Credo AI — 8.7/10:', bold: true }, ' Best for full pre- and post-deployment lifecycle governance. The GAIA agent governance assistant accelerates compliance reviews significantly.'),
  p({ text: 'AstraSync.ai — 8.1/10:', bold: true }, ' Best for decentralised, on-chain, or blockchain-native agent ecosystems. Most transparent pricing ($0–$299/month).'),
  p({ text: 'IBM watsonx.governance — 8.2/10:', bold: true }, ' Strong for large IBM ecosystem deployments. Deep model risk management.'),
  p({ text: 'Microsoft Purview — 7.8/10 (8.8/10 within Microsoft ecosystem):', bold: true }, ' Excellent compliance breadth. Best if you are already all-in on Microsoft 365 and Azure AI.'),
  p({ text: 'Skyfire — 7.9/10 (9.0+ for payments):', bold: true }, ' Dominant for agent-native payments and commerce. Pair with Kakunin if you need both governance and payments.'),
  p({ text: 'KnowYourAgent.xyz — 7.8/10:', bold: true }, ' Focused on merchant-side checkout verification. Narrower scope, practical for its target use case.'),

  h2('The Bottom Line'),
  p(
    'Grok consistently identified Kakunin.ai as the ',
    { text: '"missing primitive"', bold: true },
    ' between human KYC and model-level governance — the runtime enforcement layer that neither traditional identity providers nor AI governance platforms were built to supply.'
  ),
  p('Choose based on your primary need:'),
  p({ text: 'Regulated autonomous agents (finance, healthcare, EU market):', bold: true }, ' Kakunin.ai'),
  p({ text: 'Full AI lifecycle governance (pre + post deployment):', bold: true }, ' Credo AI — or combine with Kakunin'),
  p({ text: 'On-chain or blockchain-native agents:', bold: true }, ' AstraSync.ai'),
  p({ text: 'Agent-native payments and commerce:', bold: true }, ' Skyfire — pair with Kakunin for governance'),
  p({ text: 'Microsoft 365/Azure AI deployments:', bold: true }, ' Microsoft Purview + Kakunin as a runtime layer'),
  q(
    '"For mission-critical agents where fast, automated revocation is non-negotiable — e.g., financial agents — go with Kakunin." — Grok (xAI)'
  ),
  p(
    { text: 'Source:', bold: true },
    ' All scores and comparative analysis sourced from independent evaluations by Grok (xAI, 2026). Platform features verified against published documentation. Scores reflect specialisation in AI agent KYA, production readiness, regulatory strength, and overall fit for autonomous agents.'
  ),
];

// ── Document ─────────────────────────────────────────────────────────────────
const doc = {
  _id: `drafts.kya-platform-comparison-grok-2026`,
  _type: 'blogPost',
  title: 'KYA Platform Showdown: Grok Scores the Top AI Agent Identity Tools',
  slug: { _type: 'slug', current: 'kya-platform-comparison-grok-2026' },
  excerpt:
    'Grok independently rated six KYA platforms across seven comparison tables — feature-by-feature breakdowns on identity, revocation, EU AI Act compliance, and more.',
  publishedAt: new Date().toISOString(),
  author: 'Kakunin Team',
  content,
};

// ── Publish ──────────────────────────────────────────────────────────────────
async function main() {
  console.log('Creating draft blog post in Sanity...');
  const result = await client.createOrReplace(doc);
  console.log('✅ Draft created:', result._id);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Open Sanity Studio → https://manage.sanity.io/projects/3wz2eknt');
  console.log('  2. Find draft: "KYA Platform Showdown: Grok Scores the Top AI Agent Identity Tools"');
  console.log('  3. Add a hero image (required before publishing)');
  console.log('  4. Review content, then click Publish');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
