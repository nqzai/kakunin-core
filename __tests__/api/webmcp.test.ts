import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockAuthGetUser,
  mockTenantMaybeSingle,
  mockCertMaybeSingle,
  mockGetFinancialScope,
  mockPostEvent,
  mockGetAgentRisk,
  mockGetAgent,
  mockHeaders,
} = vi.hoisted(() => ({
  mockAuthGetUser: vi.fn(),
  mockTenantMaybeSingle: vi.fn(),
  mockCertMaybeSingle: vi.fn(),
  mockGetFinancialScope: vi.fn(),
  mockPostEvent: vi.fn(),
  mockGetAgentRisk: vi.fn(),
  mockGetAgent: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => mockHeaders(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createAnonServerClient: async () => ({
    auth: {
      getUser: mockAuthGetUser,
    },
  }),
  createServiceClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'tenants') {
        const chain: Record<string, unknown> = {};
        chain['select'] = vi.fn(() => chain);
        chain['eq'] = vi.fn(() => chain);
        chain['maybeSingle'] = mockTenantMaybeSingle;
        return chain;
      }
      if (table === 'certificates') {
        const chain: Record<string, unknown> = {};
        chain['select'] = vi.fn(() => chain);
        chain['eq'] = vi.fn(() => chain);
        chain['order'] = vi.fn(() => chain);
        chain['limit'] = vi.fn(() => chain);
        chain['maybeSingle'] = mockCertMaybeSingle;
        return chain;
      }
      return {};
    }),
  }),
}));

vi.mock('@/lib/certificates/issue', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/certificates/issue');
  return {
    ...actual,
    getFinancialScopeFromCertificatePem: mockGetFinancialScope,
  };
});

vi.mock('@/app/api/v1/events/route', () => ({
  POST: mockPostEvent,
}));
vi.mock('@/app/api/v1/agents/[id]/risk/route', () => ({
  GET: mockGetAgentRisk,
}));
vi.mock('@/app/api/v1/agents/[id]/route', () => ({
  GET: mockGetAgent,
}));

import { POST as postWebMcpAudit } from '@/app/api/webmcp/audit-log/route';
import { GET as getWebMcpRisk } from '@/app/api/webmcp/risk-score/route';
import { GET as getWebMcpVerify } from '@/app/api/webmcp/verify-scope/route';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440002';

describe('WebMCP routes', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
    mockAuthGetUser.mockResolvedValue({
      data: { user: { email: 'owner@acme.com' } },
    });
    mockTenantMaybeSingle.mockResolvedValue({
      data: { id: TENANT_ID },
      error: null,
    });
    mockCertMaybeSingle.mockResolvedValue({
      data: { certificate_pem: 'mock-pem' },
      error: null,
    });
    mockGetFinancialScope.mockReturnValue({
      permitted_venues: ['NYSE'],
    });
  });

  it('routes audit-log through the canonical /api/v1/events handler contract', async () => {
    mockPostEvent.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            event_id: 'evt-1',
            risk_score: 0.93,
            risk_band: 'high',
            revocation_check_queued: true,
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const response = await postWebMcpAudit(
      new NextRequest('http://localhost/api/webmcp/audit-log', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: AGENT_ID,
          action_type: 'trade_execution',
          metadata: { amount_usd: 2500 },
        }),
      })
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.event_id).toBe('evt-1');

    const forwardedRequest = mockPostEvent.mock.calls[0]?.[0] as NextRequest;
    expect(forwardedRequest.headers.get('x-tenant-id')).toBe(TENANT_ID);
    expect(await forwardedRequest.json()).toEqual({
      agentId: AGENT_ID,
      actionType: 'transaction_initiated',
      details: { amount_usd: 2500 },
    });
  });

  it('routes risk-score through the canonical /api/v1/agents/:id/risk handler', async () => {
    mockGetAgentRisk.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            avg_score: 0.47,
            dominant_band: 'medium',
            total_events: 14,
            window_days: 30,
            trend: [],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    const response = await getWebMcpRisk(
      new NextRequest(`http://localhost/api/webmcp/risk-score?agent_id=${AGENT_ID}`)
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.risk_score).toBe(0.47);
    expect(body.risk_band).toBe('medium');
    expect(body.event_count).toBe(14);
    expect(body.raw).toBeDefined();
  });

  it('applies certificate-aware verify-scope semantics from the canonical agent route', async () => {
    mockGetAgent.mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: AGENT_ID,
            status: 'active',
            metadata: {
              financial_scope: {
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

    const response = await getWebMcpVerify(
      new NextRequest(
        `http://localhost/api/webmcp/verify-scope?agent_id=${AGENT_ID}&action=trade_execution`
      )
    );
    const body = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(body.allowed).toBe(true);
    expect(body.certificate_status).toBe('active');
    expect(body.financial_scope).toBeDefined();
  });
});
