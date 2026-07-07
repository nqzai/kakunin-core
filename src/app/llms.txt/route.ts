import { sanityClient } from '@/lib/sanity/client';
import { BLOG_SLUGS_QUERY } from '@/lib/sanity/queries';

export const revalidate = 3600;

interface BlogSlugEntry {
  slug: string;
  publishedAt?: string;
}

export async function GET(): Promise<Response> {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Fetch live blog posts from Sanity
  let blogLines = '- [Blog](https://kakunin.ai/blog): AI agent governance, the NIST four pillars, US + EU compliance, cryptographic identity\n';
  // Standalone MDX posts (not in the Sanity feed) — list explicitly so crawlers find them.
  blogLines += '- [The Four Pillars of AI Agent Governance, Defined by NIST](https://kakunin.ai/blog/nist-four-pillars-agent-governance)\n';
  blogLines += '- [How to Govern AI Agents Without a PKI Team](https://kakunin.ai/blog/govern-ai-agents-without-pki-team)\n';
  blogLines += "- [What the NCCoE's Non-Human Identity Work Means for Fintech](https://kakunin.ai/blog/nccoe-non-human-identity-fintech)\n";
  try {
    const posts: BlogSlugEntry[] = await sanityClient.fetch(BLOG_SLUGS_QUERY);
    if (posts?.length) {
      blogLines += posts
        .map((p) => `- [${p.slug}](https://kakunin.ai/blog/${p.slug})`)
        .join('\n');
      blogLines += '\n';
    }
  } catch {
    // Non-fatal — serve without post list if Sanity unreachable
  }

  const body = `# Kakunin

> The accountability layer for AI agents — cryptographic identity, behavioral monitoring, control, and proof, on any framework.

Kakunin issues X.509 certificates to AI agents, monitors what they do and what they say in real time, lets you delegate scoped authority and stop an agent mid-action, and generates compliance reports mapped to the framework you answer to. Every agent action is logged immutably, signed cryptographically, and auditable in under 500ms — no account required.

Compliance is mapped per buyer: NIST AI RMF (all four functions), NIST CSF 2.0, and the NCCoE four-pillar model (identification, authorization, auditing, non-repudiation), alongside ISO 27001, MiCA, and the EU AI Act. One engine, every framework — supports GLBA, SOX, PCI DSS, and SEC recordkeeping.

Kakunin is not a human KYC tool (that's Jumio, Onfido, Sumsub). It is the missing accountability primitive for the agents themselves: identity + behavioral proof + content-risk scoring + delegation + auto-revocation + signed forensics at the infrastructure layer.

> Last updated: ${now}

## Product

- [Homepage](https://kakunin.ai): Overview, competitive landscape, regulatory compliance mapping
- [Pricing](https://kakunin.ai/pricing): Starter $195/mo (5 agents) · Pro $1,980/mo (20 agents) · Enterprise custom. 30-day free trial — no charge until day 31.
- [Know Your Agent (KYA)](https://kakunin.ai/kya): KYA framework pillar page — mapped to the NIST NCCoE four pillars (identification, authorization, auditing, non-repudiation)
- [Compliance — One Platform, Every Framework](https://kakunin.ai/compliance): US (NIST AI RMF, CSF 2.0, NCCoE), EU (EU AI Act, MiCA, GDPR), Global (ISO 27001) — same engine, pick your regime
- [Compare](https://kakunin.ai/ai-agent-compliance-comparison): Kakunin vs DIY build, generic monitoring, manual governance — 14-feature comparison
- [Documentation Hub](https://kakunin.ai/docs): Full technical and regulatory documentation
- [Core Concepts](https://kakunin.ai/docs/concepts): How identity, behavioral monitoring, and compliance reporting fit together
- [KYC for AI Agents](https://kakunin.ai/docs/kyc-for-ai-agents): How KYC principles apply to autonomous AI — identity, due diligence, ongoing monitoring
- [Autonomous AI Security Guide](https://kakunin.ai/docs/agent-security): Threat model, cryptographic controls, runtime enforcement, incident response
- [EU AI Act Annex III](https://kakunin.ai/docs/eu-ai-act-annex-iii): High-risk AI classification, Articles 9–15 obligations, conformity assessment
- [KYC Integration Guide](https://kakunin.ai/docs/kyc-integration): SDK setup, API keys, Next.js middleware, webhooks, sandbox testing — full developer reference
- [Regulatory Mapping Matrix](https://kakunin.ai/docs/kyc-regulatory-mapping): Article-by-article table mapping EU AI Act, MiCA, GDPR, DORA obligations to Kakunin API calls
- [EU AI Act Implementation Checklist](https://kakunin.ai/docs/eu-ai-act-checklist): Per-article checklist with code snippets for Art. 9, 10, 11, 12, 13, 14, 15, 17
- [Python Quickstart: MiCA Trading Bot](https://kakunin.ai/docs/quickstart-mica-trading-bots): Build a MiCA-compliant trading bot in Python with Freqtrade or CCXT and Kakunin Python SDK

## Blog

${blogLines}
## How It Works

- [Agent Registration](https://kakunin.ai/docs/agents): Register an agent via API or SDK — returns agent ID in <1s
- [Certificate Issuance](https://kakunin.ai/docs/certificates): X.509 RSA-2048 cert issued via AWS KMS — private keys never leave the HSM
- [Event Ingestion](https://kakunin.ai/docs/event-ingest): Stream behavioral events at 1,000/s; rolling 30-day risk score updated in real-time
- [Certificate Verification](https://kakunin.ai/docs/verify): Public endpoint — no auth, <500ms p99, returns scope + model hash + revocation history
- [Certificate Enforcement](https://kakunin.ai/docs/enforcement): Auto-revocation when risk score >0.85; fires in <60s; webhook + email alert
- [Content-Risk Scoring](https://kakunin.ai/docs/content-risk): Score what the agent SAYS — manipulation, deception, unauthorized commitments, PII disclosure; mapped to EU AI Act Art. 5; async, returns 202
- [Delegation Chains (RFC 8693)](https://kakunin.ai/docs/delegation): Explicit human→agent→sub-agent authority via OAuth 2.0 Token Exchange act claim; stateless verify endpoint
- [Forensics & Signed Proof](https://kakunin.ai/docs/forensics): Query an agent's history, replay its risk posture, export an HMAC-signed tamper-evident proof
- [OTLP Observability Export](https://kakunin.ai/docs/otlp-export): Vendor-neutral OpenTelemetry export of risk scores, events, and decision-chain traces to Datadog, Grafana, Honeycomb, Splunk
- [GitHub Actions Deploy Gate](https://kakunin.ai/docs/github-gate): Gate a deploy on agent risk; hard fail (≥0.85) revokes the cert and suspends the agent; ties the deploy to the commit SHA
- [Webhooks](https://kakunin.ai/docs/webhooks): HMAC-signed event delivery; exponential backoff; zero event loss

## Agent API (Silicon Friendly Level 5 — Autonomous Operation)

Kakunin is rated Silicon Friendly Level 5 — the highest level of AI agent readiness. Autonomous agents can discover, authenticate, and operate against the Kakunin API without any human-in-the-loop setup.

- [Agent Card](https://kakunin.ai/.well-known/agent.json): A2A Agent Card (Google Agent-to-Agent protocol) — 4 published skills
- [MCP Server](https://kakunin.ai/.well-known/mcp.json): Model Context Protocol server card (SEP-1649) — 3 MCP tools
- [MCP HTTP Endpoint](https://kakunin.ai/api/mcp): Streamable-HTTP MCP transport — browser/WebMCP agents call POST /api/mcp with JSON-RPC (initialize, tools/list, tools/call); CORS open; auth via Bearer token
- [Capability Negotiation](https://kakunin.ai/.well-known/agent-negotiate): POST to discover which of 14 API features Kakunin supports for your agent
- [OAuth Discovery](https://kakunin.ai/.well-known/oauth-authorization-server): RFC 8414 — machine-readable auth server metadata
- [OAuth Resource](https://kakunin.ai/.well-known/oauth-protected-resource): RFC 9728 — protected resource metadata
- [SSE Event Stream](https://kakunin.ai/docs/event-ingest): GET /api/v1/agents/{agentUUID}/events/stream — real-time Server-Sent Events for behavioral events; replace {agentUUID} with your agent ID; ?since= cursor support
- [Subscriptions API](https://kakunin.ai/api/v1/subscriptions): POST/GET — programmatic subscription management for 7 event types with lifecycle (create/list/cancel)
- [Notifications Inbox](https://kakunin.ai/api/v1/notifications): GET/POST — proactive inbox for pre-revocation warnings (risk ≥0.75), expiry alerts, quota warnings
- [Multi-Step Workflow](https://kakunin.ai/docs/quickstart-ai-agents): Autonomous full workflow — register → certify → stream events → self-check risk → subscribe → poll notifications → trigger report — all stateless REST, no human gate required
- [Cross-Service Handoff](https://kakunin.ai/docs/message-signing): Agent-to-agent KMS-signed message passing; POST /v1/agents/{agentUUID}/sign + POST /v1/verify/message; trade decision chains with tamper-evident SHA-256 chain_hash; kill switch halt receipt; X-Kakunin-Cert-Serial header for outbound HTTP identity

## Integration Quickstart (for AI coding assistants)

**API keys:** \`kak_live_...\` (production) · \`kak_test_...\` (sandbox — 100 free test certs/day, no billing)
**Dashboard:** https://kakunin.ai/dashboard — generate keys, manage agents, download compliance reports
**API base URLs:** \`https://api.kakunin.ai\` (public verify, no auth) · \`https://www.kakunin.ai/api/v1\` (all authenticated endpoints)

**SDK install:**
- TypeScript: \`npm install @kakunin/sdk\`
- Python: \`pip install kakunin\`
- Gateway middleware (Express / Fastify / Next.js): \`npm install @kakunin/middleware\`

**MCP server (for Cursor, Claude Code, Copilot, and browser/WebMCP agents):**
- Endpoint: \`POST https://www.kakunin.ai/api/mcp\` (Streamable-HTTP, JSON-RPC 2.0, CORS open)
- Auth header: \`Authorization: Bearer <kak_live_...>\`
- Agent header: \`X-Kakunin-Agent-Id: <agt_...>\` (required for audit_log_append and check_risk_score)
- Tools: \`verify_agent_scope\` · \`check_risk_score\` · \`audit_log_append\`
- Cursor / Claude Code config: \`{ "mcpServers": { "kakunin": { "url": "https://www.kakunin.ai/api/mcp", "headers": { "Authorization": "Bearer <key>", "X-Kakunin-Agent-Id": "<agent-id>" } } } }\`
- WebMCP: same endpoint, CORS \`Access-Control-Allow-Origin: *\` — browser agents POST \`initialize\`, \`tools/list\`, \`tools/call\` directly

**Behavioral event types (10 canonical values for event_type field):**
\`api_call\` · \`authentication_attempt\` · \`authentication_failure\` · \`data_access\` · \`data_mutation\` · \`transaction_initiated\` · \`transaction_anomaly\` · \`unauthorized_access_attempt\` · \`message_signed\` · \`message_verification_failed\`

**Webhook signature:** \`X-Kakunin-Signature\` header — HMAC-SHA256 of raw request body using your webhook secret. Events delivered: \`certificate.issued\`, \`certificate.revoked\`, \`risk.alert\`, \`report.completed\`.

**Outbound agent identity:** Set \`X-Kakunin-Cert-Serial: <serial>\` on all outbound HTTP requests from certified agents. Receivers verify at \`GET https://api.kakunin.ai/v1/verify/{serial}\` — no auth required.

**Risk bands:** \`>= 0.85\` → auto-revocation in <60s · \`>= 0.75\` → pre-revocation warning · \`>= 0.3\` → medium · \`< 0.3\` → low

## Compliance

- [API Reference](https://kakunin.ai/docs/api-reference): OpenAPI 3.0 spec for all endpoints
- [SDKs](https://kakunin.ai/docs/sdks): TypeScript (@kakunin/sdk) — Zod-validated, sandbox mode, automatic retry. Python (kakunin on PyPI) — httpx + pydantic v2. Middleware (@kakunin/middleware) — Express/Fastify/Next.js gateway enforcement, 5s cache, scope check.
- [SLA](https://kakunin.ai/docs/sla): Uptime, latency guarantees, and support tiers
- [CRL](https://kakunin.ai/docs/crl): Certificate Revocation List — public, machine-readable

## Case Studies

- [Case Studies Hub](https://kakunin.ai/docs/case-studies): 6 regulated industries, production deployments
- [Quantitative Trading Agents](https://kakunin.ai/docs/case-study-trading): Tier-1 EU bank · €50M/day scoped in cert · 3× faster execution
- [AML & Fraud Detection](https://kakunin.ai/docs/case-study-aml): Behavioral drift caught misbehavior day 3 · revocation <5ms · $0 fraud loss
- [Diagnostic EHR Assistants](https://kakunin.ai/docs/case-study-healthcare): Read-only cert scope · cannot mutate records · HIPAA trail automatic
- [Document-Review Agents](https://kakunin.ai/docs/case-study-legal): Cryptographic chain of custody for M&A data rooms · court-admissible
- [Automated Customs Brokers](https://kakunin.ai/docs/case-study-supply-chain): KMS-bound signature on declarations · 10× faster clearance
- [Visa & Tax Processing](https://kakunin.ai/docs/case-study-public-sector): EU AI Act-compliant citizen-facing decisions · transparency built in

## Optional

- [AI Discovery Files](https://kakunin.ai/.ai/sitemap.json): Full index of machine-readable content files
- [Complete Product Doc](https://kakunin.ai/llms-full.txt): Full markdown overview for LLMs
- [Brand Guidelines](https://kakunin.ai/.ai/brand-guidelines.txt): Correct terminology, what not to claim
- [FAQ (structured JSON)](https://kakunin.ai/.ai/faq.json): 20 Q&A pairs covering integration, pricing, security, compliance
- [AI Usage Policy](https://kakunin.ai/ai-usage-policy.json): Machine-readable content permissions
- [Agent Skills Index](https://kakunin.ai/.well-known/agent-skills/index.json): Public API skills for agent-to-agent discovery
- [API Catalog](https://kakunin.ai/.well-known/api-catalog): RFC 9727 linkset — service description + docs
- [Agent Card (A2A)](https://kakunin.ai/.well-known/agent.json): Google A2A protocol agent card — 4 skills
- [MCP Server Card](https://kakunin.ai/.well-known/mcp.json): Model Context Protocol server card — 3 MCP tools
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
