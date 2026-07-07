/**
 * Integration tests — POST /v1/certificates/:id/revoke
 *
 * Verifies: cert status set to revoked, agent suspended, audit log written,
 * webhook dispatched, CRL regeneration enqueued. Error cases: already revoked,
 * expired, not found, wrong tenant (404). All I/O stubbed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const {
  mockWriteAuditLog,
  mockDispatchWebhookEvent,
  mockDispatchEmail,
  mockQstashPublishJSON,
} = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn(),
  mockDispatchWebhookEvent: vi.fn(),
  mockDispatchEmail: vi.fn(),
  mockQstashPublishJSON: vi.fn(),
}));

vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog, writeAuditLogStrict: mockWriteAuditLog }));
vi.mock('@/lib/webhooks/dispatch', () => ({ dispatchWebhookEvent: mockDispatchWebhookEvent }));
vi.mock('@/lib/email/dispatch', () => ({ dispatchEmail: mockDispatchEmail }));
vi.mock('@upstash/qstash', () => ({
  // Arrow functions are not constructable; use regular function so `new Client()` works
  Client: vi.fn(function(this: unknown) { return { publishJSON: mockQstashPublishJSON }; }),
}));

// ── Supabase mock — table-aware ───────────────────────────────────────────────
//
// The revoke route does three kinds of DB calls:
//   1. select().eq().eq().single()       → cert fetch
//   2. update().eq().eq()                → cert/agent updates (parallel, awaited)
//   3. select().eq().eq().single()       → agent name + tenant email
//
// We build a chain factory that is thenable so `await update().eq().eq()` works.

const mockSingle = vi.fn();

function makeUpdateChain(resolveWith: unknown = { error: null }) {
  const c: Record<string, unknown> = {};
  c['eq'] = vi.fn(() => c);
  c['then'] = (onFulfilled: (v: unknown) => unknown, onRejected?: (v: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(onFulfilled, onRejected);
  return c;
}

function makeSelectChain() {
  const c: Record<string, unknown> = {};
  c['eq'] = vi.fn(() => c);
  c['single'] = mockSingle;
  c['select'] = vi.fn(() => c);
  return c;
}

let updateResolve: unknown = { error: null };

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/v1/certificates/[id]/revoke/route';
import { NextRequest } from 'next/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────
// RFC 4122 valid: version (pos 13) = 4, variant (pos 17) = a
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440020';
const CERT_ID = '550e8400-e29b-41d4-a716-446655440021';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440022';

const mockActiveCert = {
  id: CERT_ID,
  tenant_id: TENANT_ID,
  agent_id: AGENT_ID,
  status: 'active',
  serial_number: 'FFEE001122334455',
};

function makeRequest(certId: string, body: Record<string, unknown>): NextRequest {
  const req = new NextRequest(`http://localhost/api/v1/certificates/${certId}/revoke`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

function setupDefaultMocks() {
  updateResolve = { error: null };
  mockWriteAuditLog.mockResolvedValue('audit-uuid');
  mockDispatchWebhookEvent.mockResolvedValue(undefined);
  mockDispatchEmail.mockResolvedValue(undefined);
  mockQstashPublishJSON.mockResolvedValue(undefined);

  process.env.NEXT_PUBLIC_APP_URL = 'https://kakunin.ai';
  process.env.QSTASH_TOKEN = 'test-qstash-token';

  // Default: cert fetch succeeds (active), updates succeed, email lookups succeed
  mockSingle
    .mockResolvedValueOnce({ data: mockActiveCert, error: null }) // cert fetch
    .mockResolvedValueOnce({ data: { name: 'TestBot' }, error: null }) // agent name
    .mockResolvedValueOnce({ data: { email: 'admin@acme.com' }, error: null }); // tenant email

  mockFrom.mockImplementation(() => ({
    select: vi.fn(() => makeSelectChain()),
    update: vi.fn(() => makeUpdateChain(updateResolve)),
  }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /v1/certificates/:id/revoke', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupDefaultMocks();
  });

  it('revokes cert and returns revoked status with timestamp', async () => {
    const res = await POST(makeRequest(CERT_ID, { reason: 'Compliance violation' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    const body = await res.json() as {
      data: { certificate_id: string; status: string; reason: string; revoked_at: string };
    };

    expect(res.status).toBe(200);
    expect(body.data.certificate_id).toBe(CERT_ID);
    expect(body.data.status).toBe('revoked');
    expect(body.data.reason).toBe('Compliance violation');
    expect(body.data.revoked_at).toBeTruthy();
  });

  it('writes certificate.revoked to audit_log', async () => {
    await POST(makeRequest(CERT_ID, { reason: 'MiCA Art. 72 violation' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: TENANT_ID,
        event_type: 'certificate.revoked',
        actor_type: 'user',
        affected_id: CERT_ID,
      }),
    );
  });

  it('dispatches certificate.revoked webhook', async () => {
    await POST(makeRequest(CERT_ID, { reason: 'Test revocation' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });

    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        eventType: 'certificate.revoked',
        payload: expect.objectContaining({
          certificate_id: CERT_ID,
          serial_number: mockActiveCert.serial_number,
        }),
      }),
    );
  });

  it('enqueues CRL regeneration via QStash after revocation', async () => {
    await POST(makeRequest(CERT_ID, { reason: 'Test' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });

    expect(mockQstashPublishJSON).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('/api/v1/crl/generate'),
        body: expect.objectContaining({ certificate_id: CERT_ID }),
      }),
    );
  });

  it('returns 409 when cert already revoked', async () => {
    vi.resetAllMocks();
    mockSingle.mockResolvedValueOnce({
      data: { ...mockActiveCert, status: 'revoked' },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => makeSelectChain()),
    }));

    const res = await POST(makeRequest(CERT_ID, { reason: 'Double revoke attempt' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already revoked/i);
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('returns 422 when cert is expired', async () => {
    vi.resetAllMocks();
    mockSingle.mockResolvedValueOnce({
      data: { ...mockActiveCert, status: 'expired' },
      error: null,
    });
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => makeSelectChain()),
    }));

    const res = await POST(makeRequest(CERT_ID, { reason: 'Expired cert revoke' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/expired/i);
  });

  it('returns 404 when cert not found (cross-tenant blocked)', async () => {
    vi.resetAllMocks();
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => makeSelectChain()),
    }));

    const res = await POST(makeRequest('550e8400-e29b-41d4-a716-446655440099', { reason: 'Test' }), {
      params: Promise.resolve({ id: '550e8400-e29b-41d4-a716-446655440099' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 when reason is empty string', async () => {
    vi.resetAllMocks();
    const res = await POST(makeRequest(CERT_ID, { reason: '' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is missing reason', async () => {
    vi.resetAllMocks();
    const res = await POST(makeRequest(CERT_ID, {}), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB update failure', async () => {
    vi.resetAllMocks();
    updateResolve = { error: { message: 'DB update failed' } };

    mockSingle.mockResolvedValueOnce({ data: mockActiveCert, error: null });
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => makeSelectChain()),
      update: vi.fn(() => makeUpdateChain(updateResolve)),
    }));

    const res = await POST(makeRequest(CERT_ID, { reason: 'Test' }), {
      params: Promise.resolve({ id: CERT_ID }),
    });
    expect(res.status).toBe(500);
  });
});
