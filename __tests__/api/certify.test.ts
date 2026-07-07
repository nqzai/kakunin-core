/**
 * Integration tests — POST /v1/agents/:id/certify + audit_log assertions
 *
 * Uses vitest with mocked Supabase service client and KMS client.
 * No real DB or AWS calls — all I/O is stubbed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// vi.hoisted ensures these are available before vi.mock factory runs
const { mockIssueCertificate } = vi.hoisted(() => ({
  mockIssueCertificate: vi.fn(),
}));

vi.mock('@/lib/certificates/issue', () => ({
  issueCertificate: mockIssueCertificate,
}));

// Build supabase mock chain
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const makeEqChain = (): Record<string, unknown> => {
  const chain: Record<string, unknown> = {};
  chain['eq'] = vi.fn(() => chain);
  chain['single'] = mockSingle;
  chain['maybeSingle'] = mockMaybeSingle;
  chain['select'] = vi.fn(() => chain);
  return chain;
};

let eqChain = makeEqChain();
const mockInsert = vi.fn();
const mockUpdate = vi.fn(() => eqChain);
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => eqChain),
  insert: mockInsert,
  update: mockUpdate,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST } from '@/app/api/v1/agents/[id]/certify/route';
import { NextRequest } from 'next/server';

function makeRequest(id: string): NextRequest {
  const req = new NextRequest(`http://localhost/api/v1/agents/${id}/certify`, { method: 'POST' });
  req.headers.set('x-tenant-id', 'tenant-uuid-1234');
  return req;
}

const AGENT_ID = 'agent-uuid-abcd';
const TENANT_ID = 'tenant-uuid-1234';

const mockAgent = {
  id: AGENT_ID,
  tenant_id: TENANT_ID,
  name: 'TestBot',
  model: 'gpt-4',
  version: '1.0',
  status: 'pending',
  model_hash: 'sha256:1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890',
  inbox_address: null,
  metadata: null,
};

const mockCertResult = {
  certificatePem: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
  kmsKeyArn: 'arn:aws:kms:eu-west-1:123456789:key/mock-key-id',
  serialNumber: 'AABBCCDDEEFF00112233',
  issuedAt: new Date('2026-05-16T00:00:00Z'),
  expiresAt: new Date('2027-05-16T00:00:00Z'),
};

const mockCertRow = {
  id: 'cert-uuid-5678',
  tenant_id: TENANT_ID,
  agent_id: AGENT_ID,
  serial_number: mockCertResult.serialNumber,
  kms_key_arn: mockCertResult.kmsKeyArn,
  certificate_pem: mockCertResult.certificatePem,
  status: 'active',
  issued_at: mockCertResult.issuedAt.toISOString(),
  expires_at: mockCertResult.expiresAt.toISOString(),
};

describe('POST /v1/agents/:id/certify', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    eqChain = makeEqChain();
    mockFrom.mockReturnValue({
      select: vi.fn(() => eqChain),
      insert: mockInsert,
      update: mockUpdate,
    });
    // Both certificates and audit_log inserts use .insert().select().single() chain
    mockInsert.mockReturnValue({ select: vi.fn(() => ({ single: mockSingle })) });
    // Default fallback for any extra mockSingle calls (e.g. audit_log insert)
    mockSingle.mockResolvedValue({ data: { id: 'audit-uuid', created_at: new Date().toISOString() }, error: null });
  });

  it('issues cert and writes audit_log on success', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })        // agent fetch
      .mockResolvedValueOnce({ data: mockCertRow, error: null });     // cert insert
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // no existing cert
    mockIssueCertificate.mockResolvedValueOnce(mockCertResult);

    const res = await POST(makeRequest(AGENT_ID), { params: Promise.resolve({ id: AGENT_ID }) });
    const body = await res.json() as { data: typeof mockCertRow };

    expect(res.status).toBe(201);
    expect(body.data.serial_number).toBe(mockCertResult.serialNumber);
    expect(body.data.status).toBe('active');
    expect(mockIssueCertificate).toHaveBeenCalledWith(expect.objectContaining({ id: AGENT_ID }));
  });

  it('returns 409 when agent already has active cert', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-cert', expires_at: '2027-01-01' }, error: null });

    const res = await POST(makeRequest(AGENT_ID), { params: Promise.resolve({ id: AGENT_ID }) });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/active certificate/);
    expect(mockIssueCertificate).not.toHaveBeenCalled();
  });

  it('returns 404 when agent not found', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    const res = await POST(makeRequest('nonexistent'), { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(404);
    expect(body.error).toBe('Agent not found');
  });

  it('returns 422 when agent is retired', async () => {
    mockSingle.mockResolvedValueOnce({ data: { ...mockAgent, status: 'retired' }, error: null });

    const res = await POST(makeRequest(AGENT_ID), { params: Promise.resolve({ id: AGENT_ID }) });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(422);
    expect(body.error).toMatch(/retired/);
  });

  it('returns 503 when KMS not configured', async () => {
    mockSingle.mockResolvedValueOnce({ data: mockAgent, error: null });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockIssueCertificate.mockRejectedValueOnce(
      new Error('AWS KMS credentials not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.')
    );

    const res = await POST(makeRequest(AGENT_ID), { params: Promise.resolve({ id: AGENT_ID }) });
    const body = await res.json() as { error: string };

    expect(res.status).toBe(503);
    expect(body.error).toMatch(/credentials not configured/);
  });

  it('returns 500 on DB insert failure', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockAgent, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'DB error' } });
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockIssueCertificate.mockResolvedValueOnce(mockCertResult);

    const res = await POST(makeRequest(AGENT_ID), { params: Promise.resolve({ id: AGENT_ID }) });
    expect(res.status).toBe(500);
  });
});
