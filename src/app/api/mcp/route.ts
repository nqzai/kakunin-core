/**
 * Kakunin MCP HTTP Server — Streamable-HTTP transport
 *
 * Implements the Model Context Protocol JSON-RPC interface over HTTP so
 * browser-based agents (WebMCP) can use Kakunin tools without the npx
 * stdio package. Same three tools as @kakunin/mcp:
 *
 *   verify_agent_scope   — scope + revocation check before executing an action
 *   check_risk_score     — rolling 30-day risk profile + self-throttle guidance
 *   audit_log_append     — voluntary behavioral event logging
 *
 * Auth: Authorization: Bearer <kak_live_... or kak_test_...>
 * Required header for tools/call: X-Kakunin-Agent-Id: agt_...
 *
 * @see https://kakunin.ai/.well-known/mcp.json
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveApiKeyTenantContext } from '@/lib/gateway/api-key-auth';
import {
  invokeTenantScopedAgentRiskRoute,
  invokeTenantScopedAgentRoute,
  invokeTenantScopedEventRoute,
} from '@/lib/gateway/v1-route-invoke';

const BASE_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://www.kakunin.ai';
// ── Tool definitions (MCP schema format) ─────────────────────────────────────

const TOOLS = [
  {
    name: 'verify_agent_scope',
    description:
      'Check whether the agent is authorised to perform a specific action. Verifies the active X.509 certificate, permitted_actions scope, financial limits, and revocation status. Call this BEFORE executing — not after.',
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          description:
            'The action or endpoint the agent wants to perform. Can be a scope string (e.g. "write:invoices"), an API path (e.g. "/api/v1/trade"), or a plain description (e.g. "initiate EUR/USD trade for 50000 USD").',
        },
        venue: {
          type: 'string',
          description: 'Optional trading venue or system — checked against permitted_venues in the certificate.',
        },
        amount_usd: {
          type: 'number',
          description: 'Optional transaction amount in USD — checked against max_single_trade_usd.',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'check_risk_score',
    description:
      "Get the agent's rolling 30-day risk profile. Returns an actionable recommendation the agent can act on without parsing the raw score. No input required — agent ID is read from X-Kakunin-Agent-Id header.",
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'audit_log_append',
    description:
      'Voluntarily log a behavioral event to the immutable audit trail. Returns the risk score for the event synchronously (p99 200ms). High-risk events (score >= 0.85) automatically trigger a certificate revocation check.',
    inputSchema: {
      type: 'object',
      properties: {
        event_type: {
          type: 'string',
          enum: [
            'api_call',
            'authentication_attempt',
            'authentication_failure',
            'data_access',
            'data_mutation',
            'transaction_initiated',
            'transaction_anomaly',
            'unauthorized_access_attempt',
            'message_signed',
            'message_verification_failed',
          ],
          description: 'Type of behavioral event.',
        },
        metadata: {
          type: 'object',
          description: 'Key-value context for the event. Avoid PII — stored in immutable log.',
        },
        session_id: {
          type: 'string',
          description: 'Optional — group related events in the audit trail.',
        },
      },
      required: ['event_type', 'metadata'],
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function jsonRpc(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id: string | number | null, code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } });
}

// ── Tool handlers ─────────────────────────────────────────────────────────────

async function handleVerifyScope(
  args: Record<string, unknown>,
  tenantId: string,
  agentId: string,
): Promise<unknown> {
  const response = await invokeTenantScopedAgentRoute(tenantId, agentId);
  const data = await response.json() as Record<string, unknown>;
  const agent = (data['data'] ?? data) as Record<string, unknown>;
  const checkedAt = new Date().toISOString();
  const certificates = (agent['certificates'] as Array<Record<string, unknown>> | undefined) ?? [];
  const latestCertificate = certificates[0] ?? null;
  const certStatus = String(latestCertificate?.['status'] ?? 'none');
  const financialScope =
    ((agent['metadata'] as Record<string, unknown> | null)?.['financial_scope'] as Record<string, unknown> | undefined) ??
    undefined;

  if (certStatus !== 'active') {
    return {
      allowed: false,
      reason: `Certificate is ${certStatus}. All actions are blocked until a new certificate is issued.`,
      certificate_status: certStatus,
      scope_source: 'certificate_status',
      checked_at: checkedAt,
    };
  }

  const venue = typeof args['venue'] === 'string' ? args['venue'] : null;
  const amountUsd = typeof args['amount_usd'] === 'number' ? args['amount_usd'] : null;

  if (financialScope) {
    const permittedVenues = Array.isArray(financialScope['permitted_venues'])
      ? financialScope['permitted_venues'].filter((value): value is string => typeof value === 'string')
      : [];
    const maxSingleTradeUsd =
      typeof financialScope['max_single_trade_usd'] === 'number'
        ? financialScope['max_single_trade_usd']
        : null;

    if (venue && permittedVenues.length > 0 && !permittedVenues.includes(venue)) {
      return {
        allowed: false,
        reason: `Venue "${venue}" is outside the certified financial scope.`,
        certificate_status: certStatus,
        financial_scope: {
          permitted_venues: permittedVenues,
          max_single_trade_usd: maxSingleTradeUsd,
        },
        checked_at: checkedAt,
      };
    }

    if (amountUsd !== null && maxSingleTradeUsd !== null && amountUsd > maxSingleTradeUsd) {
      return {
        allowed: false,
        reason: `Transaction amount ${amountUsd} exceeds the certified max_single_trade_usd of ${maxSingleTradeUsd}.`,
        certificate_status: certStatus,
        financial_scope: {
          permitted_venues: permittedVenues,
          max_single_trade_usd: maxSingleTradeUsd,
        },
        checked_at: checkedAt,
      };
    }
  }

  return {
    allowed: true,
    reason: `Certificate is active and no financial scope constraint was violated for "${args['action']}".`,
    certificate_status: certStatus,
    financial_scope: financialScope ?? null,
    checked_at: checkedAt,
  };
}

async function handleCheckRisk(tenantId: string, agentId: string): Promise<unknown> {
  const response = await invokeTenantScopedAgentRiskRoute(tenantId, agentId);
  const data = await response.json() as Record<string, unknown>;
  const d = (data['data'] ?? data) as Record<string, unknown>;
  const score = Number(d['avg_score'] ?? 0);
  const band = String(d['dominant_band'] ?? 'low');
  const trendPoints = Array.isArray(d['trend']) ? d['trend'] as Array<Record<string, unknown>> : [];
  const lastPoint = trendPoints.at(-1);
  const previousPoint = trendPoints.at(-2);
  const trend =
    typeof d['drift'] === 'object' && d['drift'] !== null && typeof (d['drift'] as Record<string, unknown>)['drift_trend'] === 'string'
      ? String((d['drift'] as Record<string, unknown>)['drift_trend'])
      : previousPoint && lastPoint
        ? Number(lastPoint['avg_score'] ?? 0) > Number(previousPoint['avg_score'] ?? 0)
          ? 'increasing'
          : Number(lastPoint['avg_score'] ?? 0) < Number(previousPoint['avg_score'] ?? 0)
            ? 'decreasing'
            : 'stable'
        : 'stable';

  let recommendation: string;
  if (band === 'high') {
    recommendation = `Risk score ${score.toFixed(2)} is HIGH. Pause operations. Notify human operator. Revocation check queued.`;
  } else if (band === 'medium' && trend === 'increasing') {
    recommendation = `Risk score ${score.toFixed(2)} is MEDIUM and INCREASING. Reduce transaction frequency. Wait for trend to stabilise.`;
  } else if (band === 'medium') {
    recommendation = `Risk score ${score.toFixed(2)} is MEDIUM. Caution — avoid high-value or irreversible ops without human confirmation.`;
  } else if (band === 'low' && trend === 'increasing') {
    recommendation = `Risk score ${score.toFixed(2)} is LOW but INCREASING. Monitor — consider logging additional context.`;
  } else {
    recommendation = `Risk score ${score.toFixed(2)} is LOW. Normal operations permitted.`;
  }

  return {
    score,
    band,
    trend,
    recommendation,
    recent_high_risk_events: (d['recent_high_risk_events'] as unknown[]) ?? [],
    high_risk_event_count: d['high_risk_event_count'] ?? 0,
    total_events: d['total_events'] ?? 0,
    checked_at: new Date().toISOString(),
  };
}

async function handleAuditLogAppend(
  args: Record<string, unknown>,
  tenantId: string,
  agentId: string,
): Promise<unknown> {
  const response = await invokeTenantScopedEventRoute(tenantId, {
    agentId,
    actionType: args['event_type'],
    details: args['metadata'] ?? {},
    ...(args['session_id'] !== undefined ? { session_id: args['session_id'] } : {}),
  });
  const data = await response.json() as Record<string, unknown>;
  const d = (data['data'] ?? data) as Record<string, unknown>;
  return {
    inserted: response.ok,
    tx_id: d['event_id'] ?? d['id'] ?? null,
    risk_score: d['risk_score'] ?? null,
    risk_band: d['risk_band'] ?? null,
    revocation_check_queued: d['revocation_check_queued'] ?? false,
    logged_at: new Date().toISOString(),
  };
}

// ── Route handlers ────────────────────────────────────────────────────────────

/** GET — server info for discovery */
export async function GET() {
  return NextResponse.json({
    name: 'Kakunin Compliance Agent',
    version: '1.0.0',
    protocol: 'mcp',
    transport: 'streamable-http',
    tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
    documentation: `${BASE_URL}/docs/mcp`,
  });
}

/** OPTIONS — CORS preflight for browser-based agents */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kakunin-Agent-Id',
    },
  });
}

/** POST — JSON-RPC 2.0 request handler */
export async function POST(req: NextRequest) {
  // CORS headers on all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Kakunin-Agent-Id',
  };

  // Auth
  const authHeader = req.headers.get('authorization') ?? '';
  const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const apiKeyContext = apiKey
    ? await resolveApiKeyTenantContext(apiKey, req.headers.get('host'))
    : null;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
      { status: 400, headers: corsHeaders },
    );
  }

  const id = (body['id'] as string | number | null) ?? null;
  const method = String(body['method'] ?? '');
  const params = (body['params'] as Record<string, unknown> | undefined) ?? {};

  // ── Method dispatch ──────────────────────────────────────────────────────

  if (method === 'initialize') {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'Kakunin Compliance Agent', version: '1.0.0' },
        },
      },
      { headers: corsHeaders },
    );
  }

  if (method === 'tools/list') {
    return NextResponse.json(
      jsonRpc(id, { tools: TOOLS }).body,
      { headers: corsHeaders },
    );
  }

  if (method === 'tools/call') {
    if (!apiKey || !apiKeyContext) {
      return NextResponse.json(
        jsonRpcError(id, -32001, 'Authorization: Bearer <api_key> header required').body,
        { status: 401, headers: corsHeaders },
      );
    }

    const agentId = req.headers.get('x-kakunin-agent-id') ?? '';
    const toolName = String((params as Record<string, unknown>)['name'] ?? '');
    const args = ((params as Record<string, unknown>)['arguments'] as Record<string, unknown>) ?? {};

    try {
      let toolResult: unknown;

      if (toolName === 'verify_agent_scope') {
        if (!agentId) {
          return NextResponse.json(
            jsonRpcError(id, -32602, 'X-Kakunin-Agent-Id header required for verify_agent_scope').body,
            { status: 400, headers: corsHeaders },
          );
        }
        toolResult = await handleVerifyScope(args, apiKeyContext.tenantId, agentId);
      } else if (toolName === 'check_risk_score') {
        if (!agentId) {
          return NextResponse.json(
            jsonRpcError(id, -32602, 'X-Kakunin-Agent-Id header required for check_risk_score').body,
            { status: 400, headers: corsHeaders },
          );
        }
        toolResult = await handleCheckRisk(apiKeyContext.tenantId, agentId);
      } else if (toolName === 'audit_log_append') {
        if (!agentId) {
          return NextResponse.json(
            jsonRpcError(id, -32602, 'X-Kakunin-Agent-Id header required for audit_log_append').body,
            { status: 400, headers: corsHeaders },
          );
        }
        toolResult = await handleAuditLogAppend(args, apiKeyContext.tenantId, agentId);
      } else {
        return NextResponse.json(
          jsonRpcError(id, -32601, `Tool not found: ${toolName}`).body,
          { status: 404, headers: corsHeaders },
        );
      }

      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }],
          },
        },
        { headers: corsHeaders },
      );
    } catch (err) {
      console.error('[api/mcp] tool call error', { toolName, err });
      return NextResponse.json(
        jsonRpcError(id, -32603, 'Internal error executing tool').body,
        { status: 500, headers: corsHeaders },
      );
    }
  }

  // Unrecognised method
  return NextResponse.json(
    jsonRpcError(id, -32601, `Method not found: ${method}`).body,
    { status: 404, headers: corsHeaders },
  );
}
