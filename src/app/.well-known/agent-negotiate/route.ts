import { NextResponse, type NextRequest } from 'next/server';

/**
 * POST /.well-known/agent-negotiate
 *
 * Dynamic agent capability negotiation endpoint.
 * Agents submit their capabilities and a list of features they want to use.
 * Kakunin responds with exactly what it supports from that requested set,
 * including version, auth requirements, and endpoint URLs.
 *
 * This implements l5_agent_negotiation: agents can discover and negotiate
 * interaction patterns dynamically rather than relying on static discovery.
 *
 * No auth required — discovery endpoint.
 *
 * Request:
 *   {
 *     "agent_capabilities": ["mcp", "sse", "webhooks", "bearer_auth"],
 *     "requested_features": ["event_streaming", "certificate_issuance", "compliance_reports", "subscriptions"]
 *   }
 *
 * Response:
 *   {
 *     "negotiated": { feature → { supported, version, endpoint, auth, notes } },
 *     "unsupported": [...],
 *     "kakunin_capabilities": [...],
 *     "preferred_transport": "rest"
 *   }
 */
export const dynamic = 'force-static';

const BASE = 'https://kakunin.ai';

// Full capability registry — what Kakunin supports
const KAKUNIN_CAPABILITIES = {
  event_streaming: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/agents/{id}/events/stream`,
    transport: 'sse',
    auth: 'bearer',
    description: 'Server-Sent Events stream of real-time behavioral events per agent. Cursor-based with heartbeats.',
    docs: `${BASE}/docs/api/event-streaming`,
  },
  certificate_issuance: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/agents/{id}/certify`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Issue an X.509 certificate (RSA-2048 via AWS KMS) bound to an agent identity.',
    docs: `${BASE}/docs/api/certificates`,
  },
  certificate_verification: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/verify/{serial}`,
    transport: 'rest',
    method: 'GET',
    auth: 'none',
    description: 'Public certificate verification by serial number. No auth required.',
    docs: `${BASE}/docs/api/verify`,
  },
  certificate_revocation: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/certificates/{id}/revoke`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Revoke a certificate immediately with a reason. Fires certificate.revoked webhook.',
    docs: `${BASE}/docs/api/revoke`,
  },
  behavioral_monitoring: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/events`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Ingest behavioral events. Auto-scores risk, triggers revocation at score ≥ 0.85.',
    docs: `${BASE}/docs/api/events`,
  },
  compliance_reports: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/reports`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Generate EU AI Act / MiCA compliance audit reports. Export as JSON or PDF.',
    docs: `${BASE}/docs/api/reports`,
  },
  webhooks: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/webhooks`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Register webhook endpoints. Events: certificate.issued, certificate.revoked, risk.alert, agent.halted.',
    docs: `${BASE}/docs/api/webhooks`,
  },
  subscriptions: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/subscriptions`,
    transport: 'rest',
    method: 'POST',
    auth: 'bearer',
    description: 'Subscribe to agent event feeds with lifecycle management (create, list, cancel).',
    docs: `${BASE}/docs/api/subscriptions`,
  },
  proactive_notifications: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/notifications`,
    transport: 'rest',
    auth: 'bearer',
    description: 'Agent notification inbox. Proactive alerts: pre-revocation warnings (risk ≥ 0.75), cert expiry at 7d.',
    docs: `${BASE}/docs/api/notifications`,
  },
  audit_log: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/v1/audit-log`,
    transport: 'rest',
    method: 'GET',
    auth: 'bearer',
    description: 'Append-only audit log with filtering by event_type, actor_type, before cursor.',
    docs: `${BASE}/docs/api/audit-log`,
  },
  mcp: {
    supported: true,
    version: '1.0',
    endpoint: `${BASE}/api/mcp`,
    transport: 'streamable-http',
    auth: 'bearer',
    server_card: `${BASE}/.well-known/mcp.json`,
    description: 'MCP server with tools: verify_agent_certificate, get_compliance_report, check_agent_scope.',
    docs: `${BASE}/docs/mcp`,
  },
  a2a: {
    supported: true,
    version: '1.0',
    agent_card: `${BASE}/.well-known/agent-card.json`,
    agent_json: `${BASE}/.well-known/agent.json`,
    description: 'A2A Agent Card with 4 skills: verify, report, scope-check, risk-score.',
    docs: `${BASE}/docs/a2a`,
  },
  openapi: {
    supported: true,
    version: '3.0.0',
    endpoint: `${BASE}/api/v1/openapi.json`,
    description: 'OpenAPI 3.0 machine-readable spec covering all public endpoints.',
  },
  bearer_auth: {
    supported: true,
    description: 'Bearer token authentication via Authorization header.',
    oauth_discovery: `${BASE}/.well-known/oauth-authorization-server`,
    protected_resource: `${BASE}/.well-known/oauth-protected-resource`,
  },
};

export async function POST(req: NextRequest) {
  let body: { agent_capabilities?: string[]; requested_features?: string[] } = {};

  try {
    body = await req.json();
  } catch {
    // Empty body is fine — return full capability list
  }

  const requestedFeatures = body.requested_features ?? Object.keys(KAKUNIN_CAPABILITIES);

  const negotiated: Record<string, unknown> = {};
  const unsupported: string[] = [];

  for (const feature of requestedFeatures) {
    const cap = KAKUNIN_CAPABILITIES[feature as keyof typeof KAKUNIN_CAPABILITIES];
    if (cap) {
      negotiated[feature] = cap;
    } else {
      unsupported.push(feature);
    }
  }

  return new NextResponse(
    JSON.stringify({
      negotiated,
      unsupported,
      kakunin_capabilities: Object.keys(KAKUNIN_CAPABILITIES),
      preferred_transport: 'rest',
      api_version: '1.0',
      docs: `${BASE}/docs`,
    }, null, 2),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store', // Dynamic negotiation — never cache
      },
    }
  );
}

// Allow preflight for browser-based agents
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
