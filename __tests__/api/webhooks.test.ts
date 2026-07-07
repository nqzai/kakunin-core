import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockCreateWebhookWithQuota,
  mockWriteAuditLog,
  mockEncryptSecret,
  mockRandomBytes,
} = vi.hoisted(() => ({
  mockCreateWebhookWithQuota: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockEncryptSecret: vi.fn(() => 'enc-secret'),
  mockRandomBytes: vi.fn(() => Buffer.from('0123456789abcdef0123456789abcdef', 'hex')),
}));

vi.mock('@/lib/quota/resource-quota', () => ({
  createWebhookWithQuota: mockCreateWebhookWithQuota,
}));
vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/webhooks/crypto', () => ({ encryptSecret: mockEncryptSecret }));
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomBytes: mockRandomBytes,
  };
});

const mockSingle = vi.fn();
const makeChain = () => {
  const chain: Record<string, unknown> = {};
  chain['eq'] = vi.fn(() => chain);
  chain['single'] = mockSingle;
  chain['select'] = vi.fn(() => chain);
  chain['order'] = vi.fn(() => chain);
  return chain;
};

let chain = makeChain();
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => chain),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}));

import { POST, GET } from '@/app/api/v1/webhooks/route';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const WEBHOOK_ID = '550e8400-e29b-41d4-a716-446655440002';

const defaultWebhook = {
  id: WEBHOOK_ID,
  url: 'https://example.com/hook',
  events: ['risk.alert'],
  active: true,
  created_at: '2026-06-13T00:00:00Z',
};

function makePostRequest(body: Record<string, unknown>) {
  const req = new NextRequest('http://localhost/api/v1/webhooks', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

function makeGetRequest() {
  const req = new NextRequest('http://localhost/api/v1/webhooks');
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

describe('POST /v1/webhooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();
    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });
    mockSingle.mockResolvedValue({ data: { plan_tier: 'starter' }, error: null });
    mockCreateWebhookWithQuota.mockResolvedValue({
      allowed: true,
      current: 1,
      limit: 3,
      plan: 'starter',
      webhook: defaultWebhook,
    });
    mockWriteAuditLog.mockResolvedValue('audit-uuid');
    mockEncryptSecret.mockReturnValue('enc-secret');
    mockRandomBytes.mockReturnValue(Buffer.from('0123456789abcdef0123456789abcdef', 'hex'));
  });

  it('creates webhook and returns 201 with the one-time secret', async () => {
    const res = await POST(makePostRequest({
      url: 'https://example.com/hook',
      events: ['risk.alert'],
    }));
    const body = await res.json() as { data: { id: string; secret: string; secret_hint: string } };

    expect(res.status).toBe(201);
    expect(body.data.id).toBe(WEBHOOK_ID);
    expect(body.data.secret.startsWith('whsec_')).toBe(true);
    expect(body.data.secret_hint.startsWith(body.data.secret.slice(0, 12))).toBe(true);
  });

  it('passes the encrypted secret and events through the quota-aware creation seam', async () => {
    await POST(makePostRequest({
      url: 'https://example.com/hook',
      events: ['risk.alert', 'certificate.issued'],
    }));

    expect(mockCreateWebhookWithQuota).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: TENANT_ID,
        url: 'https://example.com/hook',
        events: ['risk.alert', 'certificate.issued'],
        secretHash: expect.any(String),
        secretEnc: 'enc-secret',
      }),
    );
  });

  it('returns 429 when webhook quota is exceeded', async () => {
    mockCreateWebhookWithQuota.mockResolvedValueOnce({
      allowed: false,
      current: 3,
      limit: 3,
      plan: 'starter',
      webhook: null,
    });

    const res = await POST(makePostRequest({
      url: 'https://example.com/hook',
      events: ['risk.alert'],
    }));
    const body = await res.json() as { error: string; quota: { limit: number } };

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/limit reached/i);
    expect(body.quota.limit).toBe(3);
  });

  it('returns 400 when the URL is not HTTPS', async () => {
    const res = await POST(makePostRequest({
      url: 'http://example.com/hook',
      events: ['risk.alert'],
    }));

    expect(res.status).toBe(400);
    expect(mockCreateWebhookWithQuota).not.toHaveBeenCalled();
  });

  it('writes audit_log on successful registration', async () => {
    await POST(makePostRequest({
      url: 'https://example.com/hook',
      events: ['risk.alert'],
    }));

    expect(mockWriteAuditLog).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenant_id: TENANT_ID,
        event_type: 'webhook.registered',
        affected_id: WEBHOOK_ID,
      }),
    );
  });
});

describe('GET /v1/webhooks', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    chain = makeChain();
    const thenable = {
      then: (onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
        Promise.resolve({ data: [defaultWebhook], error: null }).then(onFulfilled, onRejected),
    };
    chain['order'] = vi.fn(() => thenable);
    mockFrom.mockReturnValue({ select: vi.fn(() => chain) });
  });

  it('lists tenant webhooks', async () => {
    const res = await GET(makeGetRequest());
    const body = await res.json() as { data: Array<{ id: string }> };

    expect(res.status).toBe(200);
    expect(body.data[0]?.id).toBe(WEBHOOK_ID);
  });
});
