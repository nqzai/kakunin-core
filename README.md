# Kakunin — AI Agent Compliance Platform

[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/nqzai/kakunin-core/badge)](https://scorecard.dev/viewer/?uri=github.com/nqzai/kakunin-core)

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](./LICENSE)
[![SDKs: Apache-2.0](https://img.shields.io/badge/SDKs-Apache--2.0-green.svg)](https://github.com/nqzai/kakunin-sdk-typescript)

<p align="center">
  <img src="public/kakunin-demo.gif" alt="An AI agent's risk score climbs as it misbehaves; at 0.85 its X.509 certificate is automatically revoked (decertified) within seconds." width="820" />
</p>

<p align="center"><em>An agent goes rogue → risk climbs → the certificate auto-revokes. Try it live, no signup: <a href="https://www.kakunin.ai/compliance-demo">kakunin.ai/compliance-demo</a></em></p>

Kakunin is compliance and identity infrastructure for AI agents. It issues X.509
certificates to agents via AWS KMS, scores their behavior in real time, revokes
credentials automatically when risk crosses threshold, and produces regulator-ready
compliance evidence — built for MiCA and the EU AI Act.

This repository is the **platform / control plane**: the Next.js application, the
certificate authority integration, the behavioral risk engine, the API surface,
and the compliance-reporting pipeline. It is the source behind the hosted service
at [kakunin.ai](https://www.kakunin.ai).

> **Open source, hosted trust anchor.** The code is AGPL-3.0. The *canonical*
> certificate authority and public verification endpoint run as a hosted service,
> because a trust anchor everyone can fork is not a trust anchor — any counterparty
> must be able to verify a Kakunin certificate against one authority. See
> [Open Source vs Hosted](https://www.kakunin.ai/open-source).

## What's here vs. the SDKs

The client libraries developers install live in their own repositories and are
Apache-2.0:

| | Repo | Package |
|---|---|---|
| TypeScript SDK | [kakunin-sdk-typescript](https://github.com/nqzai/kakunin-sdk-typescript) | `@kakunin/sdk` |
| Python SDK | [kakunin-sdk-python](https://github.com/nqzai/kakunin-sdk-python) | `kakunin` |
| Framework integrations | [kakunin-integrations](https://github.com/nqzai/kakunin-integrations) | `@kakunin/middleware`, `@kakunin/langchain`, `@kakunin/mastra`, `@kakunin/ai-sdk` |
| MCP server | [kakunin-mcp](https://github.com/nqzai/kakunin-mcp) | `@kakunin/mcp` |
| Examples | [kakunin-samples](https://github.com/nqzai/kakunin-samples) | — |

**This repo (the platform) is AGPL-3.0. The SDKs are Apache-2.0** — build on top
of Kakunin without any copyleft obligation.

## Stack

Next.js (App Router) · TypeScript · Supabase (Postgres + RLS) · AWS KMS
(RSA-2048) · Upstash QStash + Redis · Stripe · Sanity · deployed on Vercel.

## Running it

The platform depends on external infrastructure (Supabase, AWS KMS, Upstash,
Stripe, and more). Copy `.env.example` to `.env.local` and provision the
services it lists.

```bash
npm ci
npm run dev          # local dev server
npm run type-check   # tsc --noEmit
npm run lint
npm test
```

Full architecture and API documentation: [docs.kakunin.ai](https://www.kakunin.ai/docs).

## License

[GNU AGPL-3.0](./LICENSE). If you run a modified version of this software as a
network service, the AGPL requires you to offer your users the corresponding
source. See [`NOTICE`](./NOTICE) for third-party license elections and the
trademark policy.

Contributions require signing the [Contributor License Agreement](./CLA.md) —
see [`CONTRIBUTING.md`](./CONTRIBUTING.md). Report vulnerabilities per
[`SECURITY.md`](./SECURITY.md), never via public issues.
