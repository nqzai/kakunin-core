/**
 * Integration tests — POST /v1/events (event ingestion) + GET /v1/events (list)
 *
 * All I/O is stubbed: no real DB, KMS, QStash, or email calls.
 * Financial scope auto-elevation, quota enforcement, high-risk async paths,
 * and audit log writes are all verified here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (available before vi.mock factory runs) ────────────────────
const {
  mockConsumeEventQuota,
  mockReleaseEventQuotaReservation,
  mockWriteAuditLog,
  mockEnqueue,
  mockDispatchWebhookEvent,
  mockDispatchEmail,
  mockDispatchAlertChannels,
  mockWriteAuditWorm,
  mockScoreEvent,
} = vi.hoisted(() => ({
  mockConsumeEventQuota: vi.fn(),
  mockReleaseEventQuotaReservation: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockEnqueue: vi.fn(),
  mockDispatchWebhookEvent: vi.fn(),
  mockDispatchEmail: vi.fn(),
  mockDispatchAlertChannels: vi.fn(),
  mockWriteAuditWorm: vi.fn(),
  mockScoreEvent: vi.fn(),
}));

vi.mock('@/lib/quota/event-quota', () => ({
  consumeEventQuota: mockConsumeEventQuota,
  releaseEventQuotaReservation: mockReleaseEventQuotaReservation,
}));
vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/queue/qstash', () => ({ enqueue: mockEnqueue }));
vi.mock('@/lib/webhooks/dispatch', () => ({ dispatchWebhookEvent: mockDispatchWebhookEvent }));
vi.mock('@/lib/email/dispatch', () => ({ dispatchEmail: mockDispatchEmail }));
vi.mock('@/lib/alerts/channel-dispatch', () => ({ dispatchAlertChannels: mockDispatchAlertChannels }));
vi.mock('@/lib/audit/worm-writer', () => ({ writeAuditWorm: mockWriteAuditWorm }));
vi.mock('@/lib/monitoring/risk-engine', () => ({ scoreEvent: mockScoreEvent }));

// ── Supabase mock chain ───────────────────────────────────────────────────────
const mockSingle = vi.fn();

const makeChain = () => {
  const chain: Record<string, unknown> = {};
  chain['eq'] = vi.fn(() => chain);
  chain['single'] = mockSingle;
  chain['select'] = vi.fn(() => chain);
  chain['insert'] = vi.fn(() => chain);
  chain['order'] = vi.fn(() => chain);
  chain['limit'] = vi.fn(() => chain);
  chain['lt'] = vi.fn(() => chain);
  return chain;
};

let chain = makeChain();
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => chain),
  insert: vi.fn(() => chain),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST, GET } from '@/app/api/v1/events/route';
import { NextRequest } from 'next/server';

// ── Test fixtures ─────────────────────────────────────────────────────────────
// UUIDs must be RFC 4122 valid: version (pos 13) 1-8, variant (pos 17) 8/9/a/b
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const EVENT_ID = '550e8400-e29b-41d4-a716-446655440003';

const mockAgent = {
  id: AGENT_ID,
  name: 'TestBot',
  status: 'active',
  metadata: null as null,
};

const mockEvent = {
  id: EVENT_ID,
  risk_score: 0.05,
  risk_band: 'low',
  action_type: 'api_call',
  occurred_at: '2026-05-20T10:00:00Z',
};

function makePostRequest(body: Record<string, unknown>): NextRequest {
  const req = new NextRequest('http://localhost/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  req.headers.set('x-forwarded-for', '192.168.1.1');
  return req;
}

function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/v1/events');
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const req = new NextRequest(url);
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

const defaultQuota = {
  allowed: true,
  current: 10,
  limit: 1000,
  retryAfterSeconds: 3600,
};

// ── POST /v1/events ──────────────────────────────────────────────────────────
describe('POST /v1/events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();
    mockFrom.mockReturnValue({ select: vi.fn(() => chain), insert: vi.fn(() => chain) });

    // Defaults: low-risk api_call succeeds
    mockScoreEvent.mockReturnValue({ score: 0.05, band: 'low', factors: [] });
    mockConsumeEventQuota.mockResolvedValue(defaultQuota);
    mockReleaseEventQuotaReservation.mockResolvedValue(undefined);
    mockWriteAuditLog.mockResolvedValue('audit-uuid');
    mockEnqueue.mockResolvedValue(undefined);
    mockDispatchWebhookEvent.mockResolvedValue(undefined);
    mockDispatchEmail.mockResolvedValue(undefined);
    mockDispatchAlertChannels.mockResolvedValue(undefined);
    mockWriteAuditWorm.mockResolvedValue(undefined);
  });

  it('ingests low-risk event — returns risk_score, band, event_id', async () => {
    // 1st single: agent lookup, 2nd single: tenant plan, 3rd single: event insert
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: mockEvent, error: null });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { data: { event_id: string; risk_score: number; risk_band: string; revocation_check_queued: boolean } };

    expect(res.status).toBe(200);
    expect(body.data.event_id).toBe(EVENT_ID);
    expect(body.data.risk_score).toBe(0.05);
    expect(body.data.risk_band).toBe('low');
    expect(body.data.revocation_check_queued).toBe(false);
  });

  it('writes audit_log on successful ingest', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: mockEvent, error: null });

    await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));

    expect(mockWriteAuditLog).toHaveBeenCalledOnce();
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: TENANT_ID,
        event_type: 'behavior.api_call',
        actor_type: 'agent',
        actor_id: AGENT_ID,
      }),
    );
  });

  it('high-risk event queues revocation check via QStash', async () => {
    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: [] });
    const highEvent = { ...mockEvent, risk_score: 0.95, risk_band: 'high', action_type: 'unauthorized_access_attempt' };

    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: highEvent, error: null })
      .mockResolvedValueOnce({ data: mockAgent, error: null })       // agent name for email
      .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null }); // tenant email

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'unauthorized_access_attempt' }));
    const body = await res.json() as { data: { revocation_check_queued: boolean } };

    expect(body.data.revocation_check_queued).toBe(true);
    expect(mockEnqueue).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'revocation-check' }),
    );
  });

  it('high-risk event dispatches risk.alert webhook', async () => {
    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: [] });
    const highEvent = { ...mockEvent, risk_score: 0.95, risk_band: 'high', action_type: 'transaction_anomaly' };

    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: highEvent, error: null })
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null });

    await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'transaction_anomaly' }));

    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'risk.alert', tenantId: TENANT_ID }),
    );
  });

  // Regression (RA-166): scope enforcement moved from the route into the engine.
  // These assert BEHAVIOR (engine receives scope + the high-risk path fires),
  // not the old mechanism (route swapping actionType to borrow a score).
  it('financial scope: passes scope to the engine and a violation drives the high-risk path', async () => {
    const agentWithScope = {
      ...mockAgent,
      metadata: {
        financial_scope: {
          max_single_trade_usd: 1000,
          permitted_venues: ['NYSE', 'NASDAQ'],
        },
      },
    };
    // Engine (mocked) returns the scope-violation floor.
    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: ['scope_violation'] });

    const elevatedEvent = { ...mockEvent, risk_score: 0.95, risk_band: 'high', action_type: 'transaction_initiated', factors: ['scope_violation'] };
    mockSingle
      .mockResolvedValueOnce({ data: agentWithScope, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: elevatedEvent, error: null })
      .mockResolvedValueOnce({ data: agentWithScope, error: null })
      .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null });

    const res = await POST(makePostRequest({
      agentId: AGENT_ID,
      actionType: 'transaction_initiated',
      details: { amount_usd: 5000, venue: 'NYSE' }, // exceeds 1000 limit
    }));
    const body = await res.json() as { data: { risk_band: string; factors: string[]; revocation_check_queued: boolean } };

    // Engine receives the real action type + details + the agent's scope (no swap).
    expect(mockScoreEvent).toHaveBeenCalledWith({
      actionType: 'transaction_initiated',
      details: { amount_usd: 5000, venue: 'NYSE' },
      financialScope: { max_single_trade_usd: 1000, permitted_venues: ['NYSE', 'NASDAQ'] },
    });
    // Behavior: high band → revocation queued, factors surfaced + persisted.
    expect(body.data.risk_band).toBe('high');
    expect(body.data.factors).toEqual(['scope_violation']);
    expect(body.data.revocation_check_queued).toBe(true);
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({ path: 'revocation-check' }));
  });

  it('high-risk event dispatches alert channels exactly once (no duplicate)', async () => {
    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: [] });
    const highEvent = { ...mockEvent, risk_score: 0.95, risk_band: 'high', action_type: 'transaction_anomaly' };
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: highEvent, error: null })
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null });

    await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'transaction_anomaly' }));

    // Was a copy-paste bug: dispatched twice. Must fire once.
    expect(mockDispatchAlertChannels).toHaveBeenCalledTimes(1);
  });

  it('returns 429 when event quota exceeded', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null });

    mockConsumeEventQuota.mockResolvedValue({
      allowed: false,
      current: 1000,
      limit: 1000,
      retryAfterSeconds: 86400,
    });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { error: string; quota: { limit: number } };

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/quota exceeded/);
    expect(body.quota.limit).toBe(1000);
    expect(res.headers.get('Retry-After')).toBe('86400');
  });

  it('returns 404 when agent not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(404);
    expect(body.error).toBe('Agent not found');
  });

  it('releases the reserved quota slot when the event insert fails', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to record event');
    expect(mockReleaseEventQuotaReservation).toHaveBeenCalledWith(expect.anything(), TENANT_ID, AGENT_ID);
  });

  it('returns 422 when agent is retired', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockAgent, status: 'retired' }, error: null });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/retired/i);
  });

  it('returns 422 when agent is suspended', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockAgent, status: 'suspended' }, error: null });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    const body = await res.json() as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/suspended/i);
    expect(mockConsumeEventQuota).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid action_type', async () => {
    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'totally_invalid_type' }));
    expect(res.status).toBe(400);
    expect(mockConsumeEventQuota).not.toHaveBeenCalled();
  });

  it('returns 400 on non-UUID agentId', async () => {
    const res = await POST(makePostRequest({ agentId: 'not-a-uuid', actionType: 'api_call' }));
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB insert failure', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'DB insert failed' } });

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'api_call' }));
    expect(res.status).toBe(500);
  });

  it('QStash failure does not fail the response (high-risk path)', async () => {
    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: [] });
    const highEvent = { ...mockEvent, risk_score: 0.95, risk_band: 'high', action_type: 'transaction_anomaly' };

    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: highEvent, error: null })
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null });

    // QStash throws — should not propagate to response
    mockEnqueue.mockRejectedValue(new Error('QStash not configured'));

    const res = await POST(makePostRequest({ agentId: AGENT_ID, actionType: 'transaction_anomaly' }));

    // Response is still 200 — QStash failure is non-blocking
    expect(res.status).toBe(200);
  });
});

// ── GET /v1/events ───────────────────────────────────────────────────────────
describe('GET /v1/events', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();
    // GET uses from().select().eq()...order().limit()
    mockFrom.mockReturnValue({ select: vi.fn(() => chain), insert: vi.fn(() => chain) });
  });

  it('returns events array with pagination metadata', async () => {
    const events = [
      { id: 'evt-1', action_type: 'api_call', risk_score: 0.05, risk_band: 'low', occurred_at: '2026-05-20T10:00:00Z' },
      { id: 'evt-2', action_type: 'data_access', risk_score: 0.20, risk_band: 'low', occurred_at: '2026-05-20T09:00:00Z' },
    ];
    // GET uses the chain differently — returns { data, error } not single()
    chain['eq'] = vi.fn(() => chain);
    chain['order'] = vi.fn(() => chain);
    chain['limit'] = vi.fn((): Promise<{ data: typeof events; error: null }> => Promise.resolve({ data: events, error: null }));

    const res = await GET(makeGetRequest({ limit: '2' }));
    const body = await res.json() as { data: typeof events; pagination: { has_next_page: boolean } };

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.pagination.has_next_page).toBe(false);
  });

  it('returns 400 for invalid band param', async () => {
    const res = await GET(makeGetRequest({ band: 'critical' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('band') });
  });

  it('returns 400 for invalid action_type param', async () => {
    const res = await GET(makeGetRequest({ action_type: 'not_valid' }));
    expect(res.status).toBe(400);
  });

  it('clamps limit to max 100', async () => {
    chain['limit'] = vi.fn((): Promise<{ data: []; error: null }> => Promise.resolve({ data: [], error: null }));

    await GET(makeGetRequest({ limit: '9999' }));

    // limit(n+1) should be called with max 101 (100 + 1 for next page detection)
    expect(chain['limit']).toHaveBeenCalledWith(101);
  });
});
