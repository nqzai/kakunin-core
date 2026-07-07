# Kakunin — KYC Compliance Infrastructure for AI Agents

## What We Do

Kakunin issues cryptographic identities to AI agents operating in regulated industries. We prove agent autonomy is safe, auditable, and compliant with MiCA and the EU AI Act.

**Core Offering:**
- X.509 certificate issuance via AWS KMS (private keys never stored in plaintext)
- Real-time behavioral monitoring (30-day rolling risk scores)
- Auto-revocation when agent behavior drifts (risk threshold 0.85, revocation <100ms)
- Immutable audit logs (WORM storage, append-only)
- Compliance reports (MiCA Art. 67–75, EU AI Act Annex III)
- Public verification endpoint (sub-500ms, no auth required)
- AgentMail inbox provisioning (verified email for every certified agent)
- Webhook event delivery with HMAC signatures
- TypeScript SDK + REST API (OpenAPI 3.0)

## Who Uses It

**Industries:**
- Financial Services (crypto exchanges, banking, fintech)
- Healthcare (diagnostic assistants, EHR systems)
- Legal (document review, M&A due diligence)
- Supply Chain (customs brokers, logistics)
- Public Sector (visa processing, tax systems)

**Buyers:**
- Compliance officers (need audit trails that hold up in regulatory exams)
- CTOs (need behavioral proof + revocation at transaction time)
- CEOs (need first-mover advantage in regulated AI deployment)

## Target Problem

AI agents in regulated domains face a critical blocker: **How do you prove the agent stayed in scope and didn't misbehave?**

Traditional approaches fail:
- Manual audit logs can be modified
- API keys don't bind identity to scope
- Behavioral drift is detected too late
- Regulators have no way to verify independently

Kakunin solves this at the infrastructure layer:
1. **Identity** — X.509 cert proves "this is agent X, version Y, with scope Z"
2. **Proof** — Every action signed + logged immutably
3. **Compliance** — Regulators verify cryptographically in sub-500ms

## Key Features

| Feature | Benefit |
|---------|---------|
| X.509 RSA-2048 certs (AWS KMS) | Private keys never leave KMS; counterparties verify cryptographically |
| 30-day rolling risk score | Behavioral drift detected in real-time; auto-revocation <100ms |
| Immutable audit logs | WORM storage; every agent action timestamped + signed |
| Public verify endpoint | Regulators, auditors, counterparties verify independently (no account needed) |
| AgentMail inbox | Provisioned at cert issuance; verified email channel for compliance requests |
| Webhook events | 1,000/s ingestion; HMAC-signed delivery; exponential backoff on failures |
| Compliance reports | PDF (regulator-ready) + JSON (pipelines); includes drift detection + risk narrative |

## Technical Stack

- **Frontend:** Next.js 15 App Router, TypeScript, Tailwind
- **Backend:** Supabase (PostgreSQL + RLS + Realtime), Edge Functions
- **Cryptography:** AWS KMS (eu-west-1, RSA_2048)
- **Queue:** Upstash QStash (async jobs) + Redis (rate limiting)
- **AI Narration:** OpenRouter (Claude Sonnet for risk narratives)
- **Email:** Resend (transactional) + AgentMail (agent inboxes)
- **Billing:** Stripe
- **Observability:** Better Stack (logs, errors, uptime, tracing)
- **Admin:** Retool

## API & Integration

**SDKs:**
- TypeScript (@kakunin/sdk) — Zod-validated, automatic retry, sandbox mode
- Python SDK (V1.1 roadmap)

**Endpoints:**
- REST API (OpenAPI 3.0 spec)
- Webhook delivery (HMAC signature verification)
- Public verification (no auth required)

**Time to Deploy:**
- Register + certify first agent: <3 seconds
- Public verification: <500ms p99
- Auto-revocation SLA: <60 seconds
- Event ingestion: 1,000/s

## Regulatory Alignment

**MiCA (Markets in Crypto-Assets Regulation):**
- Art. 61–75: Governance, internal controls, operational resilience
- Kakunin provides: Per-agent certs, rolling risk scoring, auto-revocation, audit trail

**EU AI Act:**
- Art. 9: Risk management → Kakunin logs all decisions
- Art. 10(2): Data governance → Certified data sources + lineage
- Art. 13: Transparency → Public verification endpoint
- Art. 14: Human oversight → Webhook alerts + manual revoke path
- Art. 15: Robustness + security → Fail-safe design, KMS key custody
- Annex III: High-risk logging → Append-only WORM storage

**GDPR:**
- Art. 22: Automated decisions → Full audit trail available
- Art. 30: Records of Processing → Audit log exports for DPA

## Business Model

**Pricing:**
- Starter: €195/month (5 agents, 100K events/month)
- Pro: €1,980/month (50 agents, 10M events/month)
- Enterprise: Custom (unlimited agents, custom SLA)
- Free trial: 30 days (card required, no charge until day 31)

**Revenue Model:**
- Per-agent subscription
- Event-based overage (beyond monthly allocation)
- Premium support + SLA add-ons

## Getting Started

1. Sign up at kakunin.ai (Starter or Pro plan)
2. Create an agent via API or SDK
3. Certify agent (<3 seconds, X.509 issued)
4. Stream events (behavioral data)
5. Receive compliance reports + webhooks

**Documentation:** https://kakunin.ai/docs

---

**Founded:** 2026  
**Stage:** Pre-seed MVP (85% complete)  
**Region:** EU (data residency eu-west-1)  
**Team:** Founder-led (Palash Bagchi, founder)
