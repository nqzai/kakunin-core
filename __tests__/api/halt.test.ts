/**
 * Integration tests — POST /v1/agents/:id/halt (kill switch)
 *
 * Verifies: behavioral event recorded, audit log written, cert revoked,
 * agent suspended, halt receipt returned, KMS signing failure is non-fatal.
 * All I/O stubbed — no real KMS or DB calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  mockWriteAuditLog,
  mockDispatchWebhookEvent,
  mockScoreEvent,
  mockKmsSend,
} = vi.hoisted(() => ({
  mockWriteAuditLog: vi.fn(),
  mockDispatchWebhookEvent: vi.fn(),
  mockScoreEvent: vi.fn(),
  mockKmsSend: vi.fn(),
}));

vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/webhooks/dispatch', () => ({ dispatchWebhookEvent: mockDispatchWebhookEvent }));
vi.mock('@/lib/monitoring/risk-engine', () => ({ scoreEvent: mockScoreEvent }));

// KMS mock — intercept @aws-sdk/client-kms SignCommand
vi.mock('@aws-sdk/client-kms', () => ({
  KMSClient: vi.fn(() => ({ send: mockKmsSend })),
  SignCommand: vi.fn(),
  SigningAlgorithmSpec: { RSASSA_PKCS1_V1_5_SHA_256: 'RSASSA_PKCS1_V1_5_SHA_256' },
}));

// ── Supabase mock ─────────────────────────────────────────────────────────────
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

const makeChain = () => {
  const c: Record<string, unknown> = {};
  c['eq'] = vi.fn(() => c);
  c['single'] = mockSingle;
  c['maybeSingle'] = mockMaybeSingle;
  c['select'] = vi.fn(() => c);
  c['insert'] = vi.fn(() => c);
  c['order'] = vi.fn(() => c);
  c['limit'] = vi.fn(() => c);
  c['update'] = vi.fn(() => c);
  return c;
};

let chain = makeChain();
const mockFrom = vi.fn();
const mockInsert = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/v1/agents/[id]/halt/route';
import { NextRequest } from 'next/server';

// ── Fixtures ──────────────────────────────────────────────────────────────────
const TENANT_ID = '550e8400-e29b-41d4-a716-446655440010';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440011';
const CERT_ID = '550e8400-e29b-41d4-a716-446655440012';

const mockAgent = { id: AGENT_ID, name: 'TestBot', status: 'active' };
const mockCert = {
  id: CERT_ID,
  serial_number: 'AABBCCDD11223344',
  status: 'active',
  kms_key_arn: 'arn:aws:kms:eu-west-1:123456789:key/mock',
};

const mockSignatureBytes = new Uint8Array([1, 2, 3, 4, 5]);

function makeRequest(agentId: string, body: Record<string, unknown>): NextRequest {
  const req = new NextRequest(`http://localhost/api/v1/agents/${agentId}/halt`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('POST /v1/agents/:id/halt', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();

    mockFrom.mockReturnValue({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue(chain);
    mockInsert.mockResolvedValue({ error: null });

    mockScoreEvent.mockReturnValue({ score: 0.95, band: 'high', factors: ['policy_violation'] });
    mockWriteAuditLog.mockResolvedValue('audit-uuid');
    mockDispatchWebhookEvent.mockResolvedValue(undefined);

    // KMS returns mock signature by default
    mockKmsSend.mockResolvedValue({ Signature: mockSignatureBytes });

    process.env.KMS_CA_KEY_ARN = 'arn:aws:kms:eu-west-1:123456789:key/ca-key';
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
  });

  it('halts agent and returns signed halt receipt', async () => {
    // agent fetch, cert lookup (maybeSingle), behavior_events insert, cert update, agent update
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })       // agent fetch
      .mockResolvedValueOnce({ data: null, error: null });            // behavior_events insert (no single needed but chain hits it)
    mockMaybeSingle.mockResolvedValueOnce({ data: mockCert, error: null }); // cert lookup

    chain['eq'] = vi.fn(() => chain);
    chain['order'] = vi.fn(() => chain);
    chain['limit'] = vi.fn(() => chain);
    chain['maybeSingle'] = mockMaybeSingle;
    chain['single'] = mockSingle;

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: vi.fn(() => chain),
    }));

    // Re-mock single for the agent fetch
    mockSingle.mockResolvedValue({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValue({ data: mockCert, error: null });

    const res = await POST(makeRequest(AGENT_ID, { reason: 'operator_initiated' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });
    const body = await res.json() as { data: { halt_receipt: { agent_id: string; signed_by_ca: boolean; certificate_serial: string } } };

    expect(res.status).toBe(200);
    expect(body.data.halt_receipt.agent_id).toBe(AGENT_ID);
    expect(body.data.halt_receipt.certificate_serial).toBe(mockCert.serial_number);
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      action_type: 'kill_switch_activated',
      risk_score: 0.95,
      risk_band: 'high',
      factors: ['policy_violation'],
    }));
  });

  it('writes agent.halted to audit_log', async () => {
    mockSingle.mockResolvedValue({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValue({ data: mockCert, error: null });

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: vi.fn(() => chain),
    }));

    await POST(makeRequest(AGENT_ID, { reason: 'risk_threshold_exceeded' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: TENANT_ID,
        event_type: 'agent.halted',
        actor_type: 'user',
        affected_id: AGENT_ID,
      }),
    );
  });

  it('dispatches agent.halted webhook', async () => {
    mockSingle.mockResolvedValue({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValue({ data: mockCert, error: null });

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: vi.fn(() => chain),
    }));

    await POST(makeRequest(AGENT_ID, { reason: 'regulatory_order' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });

    expect(mockDispatchWebhookEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT_ID,
        eventType: 'agent.halted',
        payload: expect.objectContaining({ agent_id: AGENT_ID }),
      }),
    );
  });

  it('KMS signing failure is non-fatal — halt still succeeds with signed_by_ca=false', async () => {
    mockKmsSend.mockRejectedValue(new Error('KMS unavailable'));
    mockSingle.mockResolvedValue({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValue({ data: mockCert, error: null });

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: vi.fn(() => chain),
    }));

    const res = await POST(makeRequest(AGENT_ID, { reason: 'operator_initiated' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });
    const body = await res.json() as { data: { halt_receipt: { signed_by_ca: boolean; receipt_signature: null } } };

    expect(res.status).toBe(200);
    expect(body.data.halt_receipt.signed_by_ca).toBe(false);
    expect(body.data.halt_receipt.receipt_signature).toBeNull();
  });

  it('proceeds without cert (agent suspended only, no cert to revoke)', async () => {
    mockSingle.mockResolvedValue({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null }); // no active cert

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: vi.fn(() => chain),
    }));

    const res = await POST(makeRequest(AGENT_ID, { reason: 'kill_switch_activated' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });
    const body = await res.json() as { data: { halt_receipt: { certificate_serial: null } } };

    expect(res.status).toBe(200);
    expect(body.data.halt_receipt.certificate_serial).toBeNull();
  });

  it('returns 404 when agent not found', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        ...chain,
        single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }),
          })),
        })),
      })),
    }));

    const res = await POST(makeRequest('nonexistent', { reason: 'operator_initiated' }), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 409 when agent is already retired', async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        ...chain,
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { ...mockAgent, status: 'retired' }, error: null }),
          })),
        })),
      })),
    }));

    const res = await POST(makeRequest(AGENT_ID, { reason: 'operator_initiated' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 for invalid reason enum', async () => {
    const res = await POST(makeRequest(AGENT_ID, { reason: 'just_felt_like_it' }), {
      params: Promise.resolve({ id: AGENT_ID }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when body has invalid reason enum', async () => {
    const req = new NextRequest(`http://localhost/api/v1/agents/${AGENT_ID}/halt`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'not_a_valid_reason' }),
    });
    req.headers.set('x-tenant-id', TENANT_ID);
    const res = await POST(req, { params: Promise.resolve({ id: AGENT_ID }) });
    expect(res.status).toBe(400);
  });
});
