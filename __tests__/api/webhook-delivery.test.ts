/**
 * Regression test — POST /api/internal/webhook-delivery SSRF guard.
 *
 * A tenant-supplied URL pointing at a private/link-local address must be
 * rejected BEFORE any outbound fetch leaves the worker. The delivery row is
 * marked failed, the block is audited, and the route returns 200 so QStash
 * does not retry a permanently-bad URL.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRequireVerifiedQStashBody, mockWriteAuditLog, mockDecryptSecret, mockBuildHeaders } = vi.hoisted(
  () => ({
    mockRequireVerifiedQStashBody: vi.fn(),
    mockWriteAuditLog: vi.fn(),
    mockDecryptSecret: vi.fn(() => 'raw-secret'),
    mockBuildHeaders: vi.fn(() => ({ 'content-type': 'application/json' })),
  }),
);

vi.mock('@/lib/queue/verify-qstash', () => ({ requireVerifiedQStashBody: mockRequireVerifiedQStashBody }));
vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/webhooks/crypto', () => ({
  decryptSecret: mockDecryptSecret,
  buildHeaders: mockBuildHeaders,
}));

// Supabase chain — insert→select→single returns a delivery id; update→eq→eq resolves.
const mockSingle = vi.fn(async () => ({ data: { id: DELIVERY_ID }, error: null }));
const updateEq2 = vi.fn(async () => ({ data: null, error: null }));
const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
const mockUpdate = vi.fn(() => ({ eq: updateEq1 }));
const mockFrom = vi.fn(() => ({
  insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
  update: mockUpdate,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/internal/webhook-delivery/route';
import { NextRequest } from 'next/server';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const WEBHOOK_ID = '550e8400-e29b-41d4-a716-446655440002';
const DELIVERY_ID = '550e8400-e29b-41d4-a716-446655440003';

function makeReq() {
  return new NextRequest('http://localhost/api/internal/webhook-delivery', { method: 'POST' });
}

function jobBody(url: string) {
  return JSON.stringify({
    webhookId: WEBHOOK_ID,
    tenantId: TENANT_ID,
    url,
    secretEnc: 'enc',
    eventType: 'agent.event',
    payload: { foo: 'bar' },
  });
}

describe('webhook-delivery SSRF guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: { id: DELIVERY_ID }, error: null });
  });

  it('rejects a webhook URL targeting cloud metadata without fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockRequireVerifiedQStashBody.mockResolvedValue({ ok: true, body: jobBody('https://169.254.169.254/latest/meta-data/') });

    const res = await POST(makeReq());
    const json = await res.json();

    expect(res.status).toBe(200); // QStash must NOT retry
    expect(json.reason).toBe('unsafe_url');
    expect(fetchSpy).not.toHaveBeenCalled(); // no outbound request escaped
    // delivery marked failed
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' }),
    );
    // block was audited
    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ event_type: 'webhook.delivery_blocked', tenant_id: TENANT_ID }),
    );
    fetchSpy.mockRestore();
  });

  it('rejects a loopback URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockRequireVerifiedQStashBody.mockResolvedValue({ ok: true, body: jobBody('https://127.0.0.1:8080/internal') });

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('rejects a plain-http URL', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    mockRequireVerifiedQStashBody.mockResolvedValue({ ok: true, body: jobBody('http://93.184.216.34/hook') });

    const res = await POST(makeReq());
    const json = await res.json();
    expect(json.reason).toBe('unsafe_url');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
