/**
 * Unit tests — GET /v1/verify/:serial
 *
 * Public endpoint — no auth header. Verifies correct status resolution,
 * cache headers, and 404 on unknown serial.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSingle = vi.fn();
const makeEqChain = (): Record<string, unknown> => {
  const chain: Record<string, unknown> = {};
  chain['eq'] = vi.fn(() => chain);
  chain['single'] = mockSingle;
  return chain;
};

let eqChain = makeEqChain();
const mockFrom = vi.fn(() => ({ select: vi.fn(() => eqChain) }));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { GET } from '@/app/api/v1/verify/[serial]/route';
import { NextRequest } from 'next/server';

function makeRequest(serial: string): NextRequest {
  return new NextRequest(`http://localhost/api/v1/verify/${serial}`);
}

const SERIAL = 'AABBCCDDEEFF001122';

const mockCert = {
  id: 'cert-uuid',
  serial_number: SERIAL,
  status: 'active',
  issued_at: '2026-05-16T00:00:00Z',
  expires_at: '2027-05-16T00:00:00Z',
  revoked_at: null,
  revocation_reason: null,
  agent_id: 'agent-uuid',
  tenant_id: 'tenant-uuid',
};

const mockAgent = {
  id: 'agent-uuid',
  name: 'TestBot',
  model: 'gpt-4',
  version: '1.0',
  status: 'active',
};

describe('GET /v1/verify/:serial', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    eqChain = makeEqChain();
    mockFrom.mockReturnValue({ select: vi.fn(() => eqChain) });
  });

  it('returns valid cert with agent info and cache headers', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: mockCert, error: null })
      .mockResolvedValueOnce({ data: mockAgent, error: null });

    const res = await GET(makeRequest(SERIAL), { params: Promise.resolve({ serial: SERIAL }) });
    const body = await res.json() as { data: { valid: boolean; serial_number: string; agent: { name: string } } };

    expect(res.status).toBe(200);
    expect(body.data.valid).toBe(true);
    expect(body.data.serial_number).toBe(SERIAL);
    expect(body.data.agent.name).toBe('TestBot');
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=300/);
  });

  it('returns 404 for unknown serial (8+ chars, DB miss)', async () => {
    // Serial must be ≥ 8 chars to pass length guard
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    const res = await GET(makeRequest('UNKNWN12'), { params: Promise.resolve({ serial: 'UNKNWN12' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 for serial shorter than 8 chars (no DB call)', async () => {
    const res = await GET(makeRequest('AB'), { params: Promise.resolve({ serial: 'AB' }) });
    expect(res.status).toBe(400);
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('revoked cert returns valid=false with shorter cache', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: { ...mockCert, status: 'revoked', revoked_at: '2026-05-17T00:00:00Z', revocation_reason: 'Auto-revoked' },
        error: null,
      })
      .mockResolvedValueOnce({ data: mockAgent, error: null });

    const res = await GET(makeRequest(SERIAL), { params: Promise.resolve({ serial: SERIAL }) });
    const body = await res.json() as { data: { valid: boolean; status: string; revocation_reason: string } };

    expect(body.data.valid).toBe(false);
    expect(body.data.status).toBe('revoked');
    expect(body.data.revocation_reason).toBe('Auto-revoked');
    expect(res.headers.get('Cache-Control')).toMatch(/s-maxage=60/);
  });

  it('active cert with past expires_at shows status=expired, valid=false', async () => {
    mockSingle
      .mockResolvedValueOnce({
        data: { ...mockCert, status: 'active', expires_at: '2020-01-01T00:00:00Z' },
        error: null,
      })
      .mockResolvedValueOnce({ data: mockAgent, error: null });

    const res = await GET(makeRequest(SERIAL), { params: Promise.resolve({ serial: SERIAL }) });
    const body = await res.json() as { data: { status: string; valid: boolean } };

    expect(body.data.status).toBe('expired');
    expect(body.data.valid).toBe(false);
  });
});
