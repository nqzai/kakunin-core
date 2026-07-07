'use client';

import { useState } from 'react';

type Tab = 'quickstart' | 'mcp' | 'webmcp' | 'webhooks' | 'reference';
type Lang = 'ts' | 'curl' | 'python';

interface Props {
  apiKeyPrefix: string | null;
  agentId: string | null;
  baseUrl: string;
  webhookSecret: string | null;
}

const LANG_LABELS: Record<Lang, string> = { ts: 'TypeScript', curl: 'cURL', python: 'Python' };

const MONO: React.CSSProperties = { fontFamily: 'var(--ff-mono)', fontSize: '11px' };
const CODE_BLOCK: React.CSSProperties = {
  background: '#0f1117', borderRadius: 'var(--r-sm)',
  padding: '16px 20px', fontFamily: 'var(--ff-mono)',
  fontSize: '12px', lineHeight: 1.7, color: '#e2e8f0',
  overflowX: 'auto', margin: 0, whiteSpace: 'pre',
};

export function DeveloperClient({ apiKeyPrefix, agentId, baseUrl, webhookSecret }: Props) {
  const [tab, setTab] = useState<Tab>('quickstart');
  const [lang, setLang] = useState<Lang>('ts');
  const [copied, setCopied] = useState<string | null>(null);

  const KEY = apiKeyPrefix ? `${apiKeyPrefix}...` : 'kak_live_YOUR_KEY';
  const AID = agentId ?? 'agt_YOUR_AGENT_ID';

  async function copy(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyBtnStyle(id: string) {
    return {
      position: 'absolute' as const, top: '10px', right: '10px',
      padding: '4px 10px',
      background: copied === id ? 'var(--green)' : 'rgba(255,255,255,0.1)',
      border: 'none', borderRadius: 'var(--r-xs)',
      cursor: 'pointer', ...MONO, color: 'white',
      transition: 'background 0.2s',
    };
  }

  const SNIPPETS: Record<Tab, Partial<Record<Lang, string>>> = {
    quickstart: {
      ts: `npm install @kakunin/sdk

import { Kakunin } from '@kakunin/sdk';

const kkn = new Kakunin({ apiKey: process.env.KAKUNIN_API_KEY! });

// 1. Register agent
const agent = await kkn.agents.create({
  name: 'Invoicing Bot v3',
  model_hash: await Kakunin.computeModelHash('gpt-4o-2024-08'),
  model: 'gpt-4o',
  version: 'v3.0.0',
  permitted_actions: ['read:invoices', 'write:drafts'],
});

// 2. Issue X.509 certificate — < 3s, signed by Kakunin CA via AWS KMS
const cert = await kkn.agents.certify(agent.id);
console.log(cert.serial_number); // store for audit

// 3. Stream behaviour events — risk score returned synchronously
const event = await kkn.events.ingest({
  agentId: agent.id,
  actionType: 'transaction_initiated',
  details: { amount: 840, currency: 'EUR', venue: 'euronext' },
});
// → { risk_score: 0.12, risk_band: 'low', revocation_check_queued: false }`,

      curl: `# 1. Register agent
curl -X POST ${baseUrl}/api/v1/agents \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Invoicing Bot v3",
    "model": "gpt-4o",
    "version": "v3.0.0",
    "permitted_actions": ["read:invoices", "write:drafts"]
  }'

# 2. Issue X.509 certificate
curl -X POST ${baseUrl}/api/v1/agents/${AID}/certify \\
  -H "Authorization: Bearer ${KEY}"

# 3. Ingest behaviour event
curl -X POST ${baseUrl}/api/v1/events \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "${AID}",
    "action_type": "transaction_initiated",
    "details": { "amount": 840, "currency": "EUR" }
  }'`,

      python: `pip install kakunin-sdk

import kakunin, os

kkn = kakunin.Client(api_key=os.environ["KAKUNIN_API_KEY"])

# 1. Register agent
agent = kkn.agents.create(
    name="Invoicing Bot v3",
    model="gpt-4o",
    version="v3.0.0",
    permitted_actions=["read:invoices", "write:drafts"],
)

# 2. Issue X.509 certificate
cert = kkn.agents.certify(agent.id)
print(cert.serial_number)

# 3. Ingest behaviour event
result = kkn.events.ingest(
    agent_id=agent.id,
    action_type="transaction_initiated",
    details={"amount": 840, "currency": "EUR"},
)
print(result.risk_band)  # 'low' | 'medium' | 'high'`,
    },

    mcp: {
      ts: `# Install
npm install @kakunin/mcp

# Run (stdio transport — works with Claude Desktop, Cursor, any MCP client)
KAKUNIN_API_KEY=${KEY} KAKUNIN_AGENT_ID=${AID} npx @kakunin/mcp

# Claude Desktop — ~/Library/Application Support/Claude/claude_desktop_config.json
{
  "mcpServers": {
    "kakunin": {
      "command": "npx",
      "args": ["-y", "@kakunin/mcp"],
      "env": {
        "KAKUNIN_API_KEY": "${KEY}",
        "KAKUNIN_AGENT_ID": "${AID}"
      }
    }
  }
}`,
      curl: `# The MCP server runs as a local process — no REST equivalent.
# Use @kakunin/mcp via npx:
KAKUNIN_API_KEY=${KEY} KAKUNIN_AGENT_ID=${AID} npx @kakunin/mcp

# Three tools exposed to the LLM:
#   verify_agent_scope  — check action is permitted before executing
#   check_risk_score    — get rolling 30-day risk + guidance
#   audit_log_append    — voluntarily log a behavioural event`,
      python: `# Python MCP client
from mcp import Client
import subprocess

server = subprocess.Popen(
    ["npx", "-y", "@kakunin/mcp"],
    env={
        "KAKUNIN_API_KEY": "${KEY}",
        "KAKUNIN_AGENT_ID": "${AID}",
    },
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
)`,
    },

    webmcp: {
      ts: `// WebMCP exposes Kakunin tools to browser-based AI agents via
// navigator.modelContext (W3C WebMCP draft).
// Already active on every Kakunin dashboard page — no setup needed.

// Tools registered automatically when a user is logged in:
//   verify_agent_scope  — check if an action is permitted
//   check_risk_score    — get rolling 30-day risk + guidance
//   audit_log_append    — log a behavioural event

// For your own web app — register the same tools:
const tools = [
  {
    name: 'verify_agent_scope',
    description: 'Check whether an agent is permitted to execute an action',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id: { type: 'string' },
        action:   { type: 'string' },
      },
      required: ['agent_id', 'action'],
    },
    execute: async ({ agent_id, action }) => {
      const res = await fetch(
        \`/api/webmcp/verify-scope?agent_id=\${agent_id}&action=\${action}\`
      );
      return res.json();
    },
  },
  {
    name: 'check_risk_score',
    description: 'Get the rolling 30-day risk score for an agent',
    inputSchema: {
      type: 'object',
      properties: { agent_id: { type: 'string' } },
      required: ['agent_id'],
    },
    execute: async ({ agent_id }) => {
      const res = await fetch(\`/api/webmcp/risk-score?agent_id=\${agent_id}\`);
      return res.json();
    },
  },
  {
    name: 'audit_log_append',
    description: 'Append a behavioural event to the agent audit log',
    inputSchema: {
      type: 'object',
      properties: {
        agent_id:    { type: 'string' },
        action_type: { type: 'string' },
        metadata:    { type: 'object' },
      },
      required: ['agent_id', 'action_type'],
    },
    execute: async (input) => {
      const res = await fetch('/api/webmcp/audit-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return res.json();
    },
  },
];

// Register with the browser agent runtime
if (navigator.modelContext?.provideContext) {
  await navigator.modelContext.provideContext({ name: 'kakunin', tools });
}

// Auth: session cookie — no API key in the browser.
// Routes (/api/webmcp/*) validate the Supabase session server-side.`,

      curl: `# WebMCP tools call these REST endpoints directly.
# Auth: Supabase session cookie (browser) or Bearer token (server).

# verify_agent_scope
curl "${baseUrl}/api/webmcp/verify-scope?agent_id=${AID}&action=trade_execution" \\
  -H "Cookie: sb-access-token=<session>"
# → { allowed: true, agent_id, action, agent_status, financial_scope? }

# check_risk_score
curl "${baseUrl}/api/webmcp/risk-score?agent_id=${AID}" \\
  -H "Cookie: sb-access-token=<session>"
# → { risk_score: 0.12, risk_band: "low", event_count: 14, window_days: 30, guidance }

# audit_log_append
curl -X POST "${baseUrl}/api/webmcp/audit-log" \\
  -H "Cookie: sb-access-token=<session>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "${AID}",
    "action_type": "data_access",
    "metadata": { "resource": "invoices", "count": 3 }
  }'
# → { success: true, event_id: "evt_..." }`,

      python: `# WebMCP is a browser API — no Python equivalent.
# Call the REST endpoints directly from Python agents:

import httpx

BASE = "${baseUrl}"
COOKIES = {"sb-access-token": "<session>"}  # or use Bearer token

# verify_agent_scope
r = httpx.get(
    f"{BASE}/api/webmcp/verify-scope",
    params={"agent_id": "${AID}", "action": "trade_execution"},
    cookies=COOKIES,
)
print(r.json())  # { "allowed": True, "agent_status": "active", ... }

# check_risk_score
r = httpx.get(
    f"{BASE}/api/webmcp/risk-score",
    params={"agent_id": "${AID}"},
    cookies=COOKIES,
)
print(r.json())  # { "risk_score": 0.12, "risk_band": "low", ... }

# audit_log_append
r = httpx.post(
    f"{BASE}/api/webmcp/audit-log",
    json={
        "agent_id": "${AID}",
        "action_type": "data_access",
        "metadata": {"resource": "invoices"},
    },
    cookies=COOKIES,
)
print(r.json())  # { "success": True, "event_id": "evt_..." }`,
    },

    webhooks: {
      ts: `// Next.js App Router — app/api/webhooks/kakunin/route.ts
import { Kakunin } from '@kakunin/sdk';

const kkn = new Kakunin({ apiKey: process.env.KAKUNIN_API_KEY! });

export async function POST(req: Request) {
  const rawBody = await req.text();
  const sig = req.headers.get('x-kakunin-signature') ?? '';

  let event;
  try {
    event = await kkn.webhooks.constructEvent(
      rawBody, sig, process.env.KAKUNIN_WEBHOOK_SECRET!
    );
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.event === 'certificate.revoked') {
    const { serial_number } = event.data as { serial_number: string };
    await purgeAgentCache(serial_number);
  }

  if (event.event === 'risk.alert') {
    await notifyOpsTeam(event.data);
  }

  return new Response('OK');
}

// Event types:
// certificate.issued · certificate.revoked
// risk.alert · agent.created · agent.updated`,
      curl: `# Kakunin sends HMAC-SHA256 signed POST requests.
# Signature header: x-kakunin-signature: t=<timestamp>,v1=<hmac>

# Verify signature manually (Node.js):
node -e "
const crypto = require('crypto');
const ts = '<timestamp>';
const payload = '<raw_body>';
const secret = '${webhookSecret ?? 'whsec_YOUR_SECRET'}';
const signed = ts + '.' + payload;
const hmac = crypto.createHmac('sha256', secret).update(signed).digest('hex');
console.log('v1=' + hmac);
"`,
      python: `import hmac, hashlib, time

def verify_webhook(raw_body: str, signature: str, secret: str) -> dict:
    parts = dict(p.split("=", 1) for p in signature.split(","))
    timestamp = parts.get("t")
    received = parts.get("v1")
    if not timestamp or not received:
        raise ValueError("Invalid signature format")
    age = abs(time.time() - int(timestamp))
    if age > 300:
        raise ValueError("Webhook timestamp too old")
    signed = f"{timestamp}.{raw_body}"
    expected = hmac.new(
        secret.encode(), signed.encode(), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(expected, received):
        raise ValueError("Signature mismatch")
    import json
    return json.loads(raw_body)`,
    },

    reference: {},
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: 'quickstart', label: 'Quickstart' },
    { id: 'mcp', label: 'MCP Server' },
    { id: 'webmcp', label: 'WebMCP' },
    { id: 'webhooks', label: 'Webhooks' },
    { id: 'reference', label: 'API Reference' },
  ];

  return (
    <div>
      {/* Env block */}
      <div style={{
        background: '#0f1117', borderRadius: 'var(--r-md)',
        padding: '16px 20px', marginBottom: '28px',
        display: 'flex', flexDirection: 'column', gap: '6px',
      }}>
        <div style={{ ...MONO, color: '#94a3b8', marginBottom: '4px' }}>
          # Required environment variables
        </div>
        {[
          ['KAKUNIN_API_KEY', KEY, 'API key from Keys → Create key'],
          ['KAKUNIN_WEBHOOK_SECRET', webhookSecret ? `${webhookSecret.slice(0, 12)}...` : 'whsec_...', 'From Dashboard → Webhooks → signing secret'],
        ].map(([k, v, hint]) => (
          <div key={k} style={{ display: 'flex', gap: '16px', alignItems: 'baseline' }}>
            <span style={{ ...MONO, color: '#7dd3fc', minWidth: '220px' }}>{k}</span>
            <span style={{ ...MONO, color: '#e2e8f0' }}>=</span>
            <span style={{ ...MONO, color: '#86efac' }}>{v}</span>
            <span style={{ ...MONO, color: '#475569', fontSize: '10px' }}># {hint}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: '0', marginBottom: '0',
        borderBottom: '1px solid var(--hairline)',
      }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === id ? '2px solid var(--ink)' : '2px solid transparent',
              cursor: 'pointer',
              fontFamily: 'var(--ff-mono)', fontSize: '11px',
              color: tab === id ? 'var(--ink)' : 'var(--ink-3)',
              fontWeight: tab === id ? 600 : 400,
              marginBottom: '-1px',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: '24px' }}>
        {tab === 'reference' ? (
          /* API Reference tab — links out */
          <div style={{ display: 'grid', gap: '12px' }}>
            {[
              { label: 'Interactive API reference', href: 'https://www.kakunin.ai/api-docs', desc: 'Swagger UI — browse and test every endpoint in the browser' },
              { label: 'OpenAPI spec (JSON)', href: '/api/v1/openapi.json', desc: 'Raw spec — import into Postman, Insomnia, or any API client' },
              { label: '@kakunin/sdk docs', href: '/docs/sdks', desc: 'TypeScript SDK — agents, events, certificates, verify, webhooks' },
              { label: '@kakunin/mcp docs', href: '/docs/mcp', desc: 'MCP server tools — verify_agent_scope, check_risk_score, audit_log_append' },
              { label: 'WebMCP (browser)', href: '/docs/webmcp', desc: 'navigator.modelContext integration — tools auto-registered on dashboard login, no API key in browser' },
              { label: 'REST API reference', href: '/docs/api-reference', desc: 'Full endpoint reference with request/response examples' },
              { label: 'Webhook events', href: '/docs/webhooks', desc: 'Event types, signatures, retry behaviour' },
              { label: 'CRL / revocation', href: '/docs/crl', desc: 'Certificate Revocation List endpoint and verification' },
            ].map(({ label, href, desc }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: 'var(--card)', border: '1px solid var(--hairline)',
                  borderRadius: 'var(--r-md)',
                  textDecoration: 'none',
                  transition: 'border-color 0.15s',
                }}
              >
                <div>
                  <div style={{ ...MONO, color: 'var(--ink)', fontSize: '13px', fontWeight: 600, marginBottom: '3px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>{desc}</div>
                </div>
                <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'var(--ink-3)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0, marginLeft: '16px' }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            ))}
          </div>
        ) : (
          /* Code snippet tabs */
          <div>
            {/* Language picker */}
            <div style={{
              display: 'flex', gap: '4px', marginBottom: '16px',
              background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
              borderRadius: 'var(--r-sm)', padding: '3px', width: 'fit-content',
            }}>
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  style={{
                    padding: '5px 14px',
                    background: lang === l ? 'var(--card)' : 'transparent',
                    border: lang === l ? '1px solid var(--hairline)' : '1px solid transparent',
                    borderRadius: 'var(--r-xs)',
                    cursor: 'pointer', ...MONO,
                    color: lang === l ? 'var(--ink)' : 'var(--ink-3)',
                    fontWeight: lang === l ? 600 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>

            {/* WebMCP active-on-dashboard callout */}
            {tab === 'webmcp' && (
              <div style={{
                marginBottom: '14px', padding: '12px 16px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 'var(--r-sm)',
                display: 'flex', gap: '10px', alignItems: 'flex-start',
              }}>
                <span style={{ color: 'var(--green)', fontSize: '14px', lineHeight: 1 }}>●</span>
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                  <strong>Already active on this page.</strong> WebMCP tools are registered automatically
                  when you&apos;re logged into the Kakunin dashboard — any WebMCP-capable browser agent
                  running in this tab can call <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>verify_agent_scope</code>,{' '}
                  <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>check_risk_score</code>, and{' '}
                  <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: '3px' }}>audit_log_append</code> immediately.
                  Auth uses your Supabase session cookie — no API key exposed in the browser.
                </div>
              </div>
            )}

            {/* Code block */}
            <div style={{ position: 'relative' }}>
              <pre style={CODE_BLOCK}>
                <code>{SNIPPETS[tab]?.[lang] ?? '# Not available for this language'}</code>
              </pre>
              <button
                onClick={() => copy(SNIPPETS[tab]?.[lang] ?? '', `${tab}-${lang}`)}
                style={copyBtnStyle(`${tab}-${lang}`)}
              >
                {copied === `${tab}-${lang}` ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      <div style={{
        marginTop: '28px', display: 'flex', gap: '10px', flexWrap: 'wrap',
      }}>
        {[
          { label: 'Create API key →', href: '/dashboard/api-keys', internal: true },
          { label: 'Register first agent →', href: '/dashboard/agents/new', internal: true },
          { label: 'Full SDK docs →', href: '/docs/sdks', internal: false },
          { label: 'MCP docs →', href: '/docs/mcp', internal: false },
          { label: 'WebMCP docs →', href: '/docs/webmcp', internal: false },
        ].map(({ label, href, internal }) => (
          <a
            key={href}
            href={href}
            target={internal ? undefined : '_blank'}
            rel={internal ? undefined : 'noopener noreferrer'}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--ff-mono)', fontSize: '12px',
              color: 'var(--ink-2)', textDecoration: 'none',
              border: '1px solid var(--hairline-2)', padding: '8px 16px',
              borderRadius: 'var(--r-sm)', background: 'var(--card)',
              transition: 'border-color 0.15s',
            }}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  );
}
