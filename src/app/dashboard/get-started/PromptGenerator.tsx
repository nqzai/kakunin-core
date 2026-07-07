'use client';

import { useState } from 'react';

type Target = 'cursor' | 'claude-code' | 'copilot' | 'generic';

interface Props {
  apiKeyPrefix: string | null;
  baseUrl: string;
}

const TARGET_LABELS: Record<Target, string> = {
  cursor: 'Cursor',
  'claude-code': 'Claude Code',
  copilot: 'GitHub Copilot',
  generic: 'Generic',
};

function buildPrompt(target: Target, apiKeyPrefix: string | null, baseUrl: string): string {
  const keyPlaceholder = apiKeyPrefix ? `${apiKeyPrefix}... (replace with full key)` : 'YOUR_KAKUNIN_API_KEY';

  const common = `## Kakunin Integration Task

Integrate the Kakunin API (${baseUrl}) into this codebase to give AI agents cryptographic identities and behavioural monitoring.

### API credentials
- Base URL: ${baseUrl}/api/v1
- Auth: Bearer token in Authorization header
- API Key: ${keyPlaceholder}

### What to implement

1. **Agent registration** (POST /api/v1/agents)
   Register each AI agent once at startup or first use.
   Store the returned \`agent_id\` — you'll need it for certificates and events.

   Request body:
   \`\`\`json
   { "name": "string", "description": "string" }
   \`\`\`
   Returns: \`{ "data": { "id": "uuid", "name": "string", "status": "active" } }\`

2. **Certificate issuance** (POST /api/v1/certificates)
   Issue an X.509 certificate for each registered agent.
   The returned PEM can be used in mTLS connections.

   Request body:
   \`\`\`json
   { "agent_id": "uuid" }
   \`\`\`
   Returns: \`{ "data": { "pem": "string", "serial_number": "string", "valid_until": "ISO8601" } }\`

3. **Behaviour event streaming** (POST /api/v1/events)
   Emit an event every time the agent takes a significant action.
   Kakunin computes a risk score (0–1) automatically.

   Request body:
   \`\`\`json
   {
     "agent_id": "uuid",
     "action": "string",      // e.g. "data_access", "tool_call", "api_request"
     "resource": "string",    // what was acted upon
     "metadata": {}           // any additional context
   }
   \`\`\`
   Returns: \`{ "data": { "event_id": "uuid", "risk_score": 0.12, "risk_band": "low" } }\`

### Error handling
- 401 → invalid or revoked API key
- 422 → agent/cert quota exceeded (upgrade plan)
- 429 → rate limit exceeded (retry after \`Retry-After\` seconds)
- All errors: \`{ "error": "string" }\`

### Implementation notes
- Store \`KAKUNIN_API_KEY\` as an environment variable — never hardcode
- Register each unique agent once; cache \`agent_id\` (database or env)
- Issue certificates lazily (on first use) or eagerly at agent boot
- Emit events as fire-and-forget — wrap in try/catch, never block agent on failure
- Add \`x-request-id\` header to each request for traceability`;

  const preambles: Record<Target, string> = {
    cursor: `You are an expert TypeScript/Python engineer. Follow existing code style exactly.\n\n`,
    'claude-code': `<instructions>\nYou are integrating a third-party API into an existing codebase. Read existing patterns before writing code.\n</instructions>\n\n`,
    copilot: `// GitHub Copilot: implement Kakunin integration following existing patterns\n// See task description below\n\n`,
    generic: ``,
  };

  const postambles: Record<Target, string> = {
    cursor: `\n\n### Cursor-specific instructions
- Use \`@codebase\` to find existing HTTP client patterns before writing new ones
- Add types for all API response shapes
- Add JSDoc to exported functions`,
    'claude-code': `\n\n### Claude Code-specific instructions
- Read existing files before modifying them
- Add the integration in a new \`lib/kakunin/\` or \`utils/kakunin/\` directory
- Write tests for the happy path and error cases`,
    copilot: `\n\n// Copilot: implement incrementally, one function at a time`,
    generic: ``,
  };

  return preambles[target] + common + postambles[target];
}

export function PromptGenerator({ apiKeyPrefix, baseUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<Target>('cursor');
  const [copied, setCopied] = useState(false);

  const prompt = buildPrompt(target, apiKeyPrefix, baseUrl);

  async function copy() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          fontFamily: 'var(--ff-mono)', fontSize: '12px',
          color: 'var(--ink)', cursor: 'pointer',
          background: 'var(--card)', border: '1px solid var(--hairline)',
          padding: '8px 16px', borderRadius: 'var(--r-sm)',
          transition: 'border-color 0.15s',
        }}
      >
        <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
        Handoff to AI coding agent →
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div style={{
            background: 'var(--card)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-lg)', width: '100%', maxWidth: '720px',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            {/* Modal header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '20px 24px', borderBottom: '1px solid var(--hairline)',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ fontFamily: 'var(--ff-display)', fontSize: '16px', color: 'var(--ink)', marginBottom: '2px' }}>
                  Handoff to AI coding agent
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                  Copy this prompt into your AI coding tool to implement the Kakunin integration automatically.
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--ink-3)', padding: '4px', borderRadius: 'var(--r-xs)',
                  display: 'flex', alignItems: 'center',
                }}
                aria-label="Close"
              >
                <svg viewBox="0 0 24 24" style={{ width: '18px', height: '18px', stroke: 'currentColor', fill: 'none', strokeWidth: '2', strokeLinecap: 'round' }}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Target selector */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid var(--hairline)',
              display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0,
            }}>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                Optimised for:
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(Object.keys(TARGET_LABELS) as Target[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTarget(t)}
                    style={{
                      padding: '4px 12px',
                      background: target === t ? 'var(--ink)' : 'transparent',
                      border: target === t ? '1px solid var(--ink)' : '1px solid var(--hairline)',
                      borderRadius: 'var(--r-xs)', cursor: 'pointer',
                      fontFamily: 'var(--ff-mono)', fontSize: '11px',
                      color: target === t ? 'var(--paper)' : 'var(--ink-3)',
                      transition: 'all 0.15s',
                    }}
                  >
                    {TARGET_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt preview */}
            <div style={{ flex: 1, overflow: 'auto', padding: '0' }}>
              <pre style={{
                margin: 0, padding: '20px 24px',
                fontFamily: 'var(--ff-mono)', fontSize: '11px',
                lineHeight: 1.7, color: 'var(--ink-2)',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {prompt}
              </pre>
            </div>

            {/* Footer actions */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid var(--hairline)',
              display: 'flex', gap: '10px', justifyContent: 'flex-end', flexShrink: 0,
            }}>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '8px 18px', background: 'transparent',
                  border: '1px solid var(--hairline)', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--ff-mono)', fontSize: '12px',
                  color: 'var(--ink-2)',
                }}
              >
                Cancel
              </button>
              <button
                onClick={copy}
                style={{
                  padding: '8px 20px',
                  background: copied ? 'var(--green)' : 'var(--ink)',
                  border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--ff-mono)', fontSize: '12px',
                  color: 'var(--paper)', fontWeight: 600,
                  transition: 'background 0.2s',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}
              >
                {copied ? (
                  <>
                    <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', stroke: 'white', fill: 'none', strokeWidth: '2.5', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" style={{ width: '13px', height: '13px', stroke: 'white', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }}>
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy prompt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
