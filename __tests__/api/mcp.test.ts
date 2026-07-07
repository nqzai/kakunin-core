import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockFrom,
  mockInvokeAgentRoute,
  mockInvokeAgentRiskRoute,
  mockInvokeEventRoute,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockInvokeAgentRoute: vi.fn(),
  mockInvokeAgentRiskRoute: vi.fn(),
  mockInvokeEventRoute: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: mockFrom,
  }),
}));

vi.mock('@/lib/gateway/v1-route-invoke', () => ({
  invokeTenantScopedAgentRoute: mockInvokeAgentRoute,
  invokeTenantScopedAgentRiskRoute: mockInvokeAgentRiskRoute,
  invokeTenantScopedEventRoute: mockInvokeEventRoute,
}));

import { POST } from '@/app/api/mcp/route';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440002';

function makeToolCallRequest(name: string, args: Record<string, unknown> = {}) {
  const req = new NextRequest('http://localhost/api/mcp', {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  });
  req.headers.set('authorization', 'Bearer kak_test_123');
  req.headers.set('x-kakunin-agent-id', AGENT_ID);
  return req;
}

describe('POST /api/mcp', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const mockChain: Record<string, unknown> = {};
    mockChain['select'] = vi.fn(() => mockChain);
    mockChain['eq'] = vi.fn(() => mockChain);
    mockChain['single'] = vi.fn(() => ({
      data: { tenant_id: TENANT_ID, revoked_at: null },
      error: null,
    }));
    mockFrom.mockReturnValue(mockChain);
  });

  it('maps audit_log_append to the real /api/v1/events payload contract', async () => {
    mockInvokeEventRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            event_id: 'evt_123',
            risk_score: 0.91,
            risk_band: 'high',
            revocation_check_queued: true,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await POST(
      makeToolCallRequest('audit_log_append', {
        event_type: 'transaction_anomaly',
        metadata: { amount_usd: 5000 },
        session_id: 'sess-1',
      })
    );
    const body = await res.json() as {
      result: { content: Array<{ text: string }> };
    };
    const toolResult = JSON.parse(body.result.content[0]?.text ?? '{}') as Record<string, unknown>;

    expect(mockInvokeEventRoute).toHaveBeenCalledWith(
      TENANT_ID,
      {
        agentId: AGENT_ID,
        actionType: 'transaction_anomaly',
        details: { amount_usd: 5000 },
        session_id: 'sess-1',
      }
    );
    expect(toolResult.tx_id).toBe('evt_123');
    expect(toolResult.revocation_check_queued).toBe(true);
  });

  it('maps check_risk_score to the real /api/v1/agents/:id/risk response shape', async () => {
    mockInvokeAgentRiskRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            avg_score: 0.47,
            dominant_band: 'medium',
            high_risk_event_count: 2,
            total_events: 14,
            recent_high_risk_events: [{ id: 'evt-1' }],
            trend: [
              { date: '2026-06-11', avg_score: 0.31, event_count: 5, dominant_band: 'low' },
              { date: '2026-06-12', avg_score: 0.47, event_count: 9, dominant_band: 'medium' },
            ],
            drift: {
              drift_trend: 'increasing',
            },
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await POST(makeToolCallRequest('check_risk_score'));
    const body = await res.json() as {
      result: { content: Array<{ text: string }> };
    };
    const toolResult = JSON.parse(body.result.content[0]?.text ?? '{}') as Record<string, unknown>;

    expect(mockInvokeAgentRiskRoute).toHaveBeenCalledWith(TENANT_ID, AGENT_ID);
    expect(toolResult.score).toBe(0.47);
    expect(toolResult.band).toBe('medium');
    expect(toolResult.trend).toBe('increasing');
    expect(toolResult.high_risk_event_count).toBe(2);
  });

  it('derives certificate status and financial scope from the real agent response', async () => {
    mockInvokeAgentRoute.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: AGENT_ID,
            metadata: {
              financial_scope: {
                max_single_trade_usd: 1000,
                permitted_venues: ['NYSE'],
              },
            },
            certificates: [
              {
                id: 'cert-1',
                status: 'active',
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const res = await POST(
      makeToolCallRequest('verify_agent_scope', {
        action: 'initiate trade',
        venue: 'NASDAQ',
        amount_usd: 500,
      })
    );
    const body = await res.json() as {
      result: { content: Array<{ text: string }> };
    };
    const toolResult = JSON.parse(body.result.content[0]?.text ?? '{}') as Record<string, unknown>;

    expect(mockInvokeAgentRoute).toHaveBeenCalledWith(TENANT_ID, AGENT_ID);
    expect(toolResult.allowed).toBe(false);
    expect(toolResult.certificate_status).toBe('active');
    expect(String(toolResult.reason)).toMatch(/outside the certified financial scope/i);
  });
});
