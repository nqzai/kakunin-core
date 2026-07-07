/**
 * Integration tests — POST /v1/agents (create) + GET /v1/agents (list)
 *
 * Verifies agent registration with quota enforcement, financial scope
 * metadata storage, audit log writes, and Stripe quantity sync.
 * All I/O stubbed — no real DB or Stripe calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const { mockCreateAgentWithQuota, mockUpdateSubscriptionQuantity, mockWriteAuditLog } = vi.hoisted(() => ({
  mockCreateAgentWithQuota: vi.fn(),
  mockUpdateSubscriptionQuantity: vi.fn(),
  mockWriteAuditLog: vi.fn(),
}));

vi.mock('@/lib/quota/resource-quota', () => ({ createAgentWithQuota: mockCreateAgentWithQuota }));
vi.mock('@/lib/stripe/client', () => ({ updateSubscriptionQuantity: mockUpdateSubscriptionQuantity }));
vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));

// ── Supabase mock chain ────────────────────────────────────────────────────────
const mockSingle = vi.fn();

const makeChain = () => {
  const c: Record<string, unknown> = {};
  c['eq'] = vi.fn(() => c);
  c['single'] = mockSingle;
  c['select'] = vi.fn(() => c);
  c['insert'] = vi.fn(() => c);
  c['order'] = vi.fn(() => c);
  c['range'] = vi.fn(() => c);
  return c;
};

let chain = makeChain();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST, GET } from '@/app/api/v1/agents/route';
import { NextRequest } from 'next/server';

// ── Test fixtures ──────────────────────────────────────────────────────────────
const TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const validBody = {
  name: 'TradingBot v1',
  model_hash: 'sha256:aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899',
  model: 'gpt-4o',
  version: '1.0.0',
};

const mockAgentRow = {
  id: 'agent-uuid-bbbb',
  tenant_id: TENANT_ID,
  name: 'TradingBot v1',
  model_hash: validBody.model_hash,
  model: 'gpt-4o',
  version: '1.0.0',
  status: 'pending',
  metadata: {},
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  const req = new NextRequest('http://localhost/api/v1/agents', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/v1/agents');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url);
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

const defaultQuota = { allowed: true, current: 2, limit: 10, plan: 'starter' };

// ── POST /v1/agents ────────────────────────────────────────────────────────────
describe('POST /v1/agents', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();
    mockCreateAgentWithQuota.mockResolvedValue(defaultQuota);
    mockUpdateSubscriptionQuantity.mockResolvedValue(undefined);
    mockWriteAuditLog.mockResolvedValue('audit-uuid');

    mockFrom.mockReturnValue({
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
    });
  });

  it('creates agent and returns 201 with agent data', async () => {
    mockCreateAgentWithQuota.mockResolvedValueOnce({
      ...defaultQuota,
      agent: mockAgentRow,
    });

    const res = await POST(makePostRequest(validBody));
    const body = await res.json() as { data: typeof mockAgentRow };

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('agent-uuid-bbbb');
    expect(body.data.status).toBe('pending');
    expect(body.data.name).toBe('TradingBot v1');
  });

  it('writes audit_log on successful registration', async () => {
    mockCreateAgentWithQuota.mockResolvedValueOnce({
      ...defaultQuota,
      agent: mockAgentRow,
    });

    await POST(makePostRequest(validBody));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: TENANT_ID,
        event_type: 'agent.created',
        actor_type: 'system',
      }),
    );
  });

  it('fires Stripe quantity sync (fire-and-forget, does not block response)', async () => {
    mockCreateAgentWithQuota.mockResolvedValueOnce({
      ...defaultQuota,
      agent: mockAgentRow,
    });

    await POST(makePostRequest(validBody));

    // void — may be called asynchronously, just verify it was called
    expect(mockUpdateSubscriptionQuantity).toHaveBeenCalled();
  });

  it('passes financial_scope through the quota-aware creation seam', async () => {
    mockCreateAgentWithQuota.mockResolvedValueOnce({
      ...defaultQuota,
      agent: mockAgentRow,
    });
    const bodyWithScope = {
      ...validBody,
      financial_scope: {
        max_single_trade_usd: 5000,
        daily_limit_usd: 25000,
        permitted_instruments: ['AAPL', 'GOOGL'],
        permitted_venues: ['NYSE', 'NASDAQ'],
        leverage_permitted: false,
      },
    };

    await POST(makePostRequest(bodyWithScope));

    expect(mockCreateAgentWithQuota).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      metadata: expect.objectContaining({
        financial_scope: expect.objectContaining({ max_single_trade_usd: 5000 }),
      }),
    }));
  });

  it('returns 422 when agent quota exceeded', async () => {
    mockCreateAgentWithQuota.mockResolvedValue({ allowed: false, current: 10, limit: 10 });

    const res = await POST(makePostRequest(validBody));
    const body = await res.json() as { error: string; quota: { limit: number } };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/limit reached/i);
    expect(body.quota.limit).toBe(10);
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makePostRequest({ model_hash: validBody.model_hash }));
    expect(res.status).toBe(400);
    expect(mockCreateAgentWithQuota).not.toHaveBeenCalled();
  });

  it('returns 400 when model_hash is missing', async () => {
    const res = await POST(makePostRequest({ name: 'MyBot' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when financial_scope is missing required fields', async () => {
    const res = await POST(makePostRequest({
      ...validBody,
      financial_scope: { max_single_trade_usd: 1000 }, // missing daily_limit_usd, permitted_instruments, permitted_venues
    }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB insert failure', async () => {
    mockCreateAgentWithQuota.mockResolvedValueOnce({
      ...defaultQuota,
      agent: null,
    });

    const res = await POST(makePostRequest(validBody));
    expect(res.status).toBe(500);
  });
});

// ── GET /v1/agents ──────────────────────────────────────────────────────────
describe('GET /v1/agents', () => {
  // Thenable chain — range() returns chain itself; await chain → getChainResolve
  // This handles `query = query.eq('status', status)` called AFTER range().
  let getChainResolve: unknown = { data: [], error: null, count: 0 };

  function makeGetChain() {
    const c: Record<string, unknown> = {};
    c['eq'] = vi.fn(() => c);
    c['select'] = vi.fn(() => c);
    c['order'] = vi.fn(() => c);
    c['range'] = vi.fn(() => c);
    c['then'] = (
      onFulfilled: (v: unknown) => unknown,
      onRejected?: (v: unknown) => unknown,
    ) => Promise.resolve(getChainResolve).then(onFulfilled, onRejected);
    return c;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    getChainResolve = { data: [], error: null, count: 0 };
    mockFrom.mockReturnValue({ select: vi.fn(() => makeGetChain()) });
  });

  it('returns agents list with total count', async () => {
    getChainResolve = { data: [mockAgentRow], error: null, count: 1 };

    const res = await GET(makeGetRequest());
    const body = await res.json() as { data: typeof mockAgentRow[]; meta: { total: number } };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.meta.total).toBe(1);
  });

  it('clamps limit to max 100', async () => {
    let capturedChain: ReturnType<typeof makeGetChain> | null = null;
    mockFrom.mockReturnValue({
      select: vi.fn(() => {
        capturedChain = makeGetChain();
        return capturedChain;
      }),
    });

    await GET(makeGetRequest({ limit: '999' }));
    // Math.min(999, 100) = 100 → range(0, 99)
    expect(capturedChain).not.toBeNull();
    const rangeCalls = (capturedChain!['range'] as ReturnType<typeof vi.fn>).mock.calls;
    expect(rangeCalls[0]).toEqual([0, 99]);
  });

  it('applies status filter when provided', async () => {
    let capturedChain: ReturnType<typeof makeGetChain> | null = null;
    mockFrom.mockReturnValue({
      select: vi.fn(() => {
        capturedChain = makeGetChain();
        return capturedChain;
      }),
    });

    await GET(makeGetRequest({ status: 'active' }));

    expect(capturedChain).not.toBeNull();
    const eqCalls = (capturedChain!['eq'] as ReturnType<typeof vi.fn>).mock.calls;
    expect(eqCalls.some((call: unknown[]) => call[0] === 'status' && call[1] === 'active')).toBe(true);
  });

  it('ignores invalid status param (falls back to no filter)', async () => {
    const res = await GET(makeGetRequest({ status: 'invalid_status' }));
    expect(res.status).toBe(200);
  });

  it('returns 500 on DB error', async () => {
    getChainResolve = { data: null, error: { message: 'DB error' }, count: null };
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);
  });
});
