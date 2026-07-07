import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyQStashBody, mockCreateServiceClient } = vi.hoisted(() => ({
  mockVerifyQStashBody: vi.fn(),
  mockCreateServiceClient: vi.fn(),
}));

vi.mock('@/lib/queue/verify-qstash', () => ({
  verifyQStashBody: mockVerifyQStashBody,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: mockCreateServiceClient,
}));

import { POST } from '@/app/api/internal/provision-inbox/route';

function makeRequest() {
  return new NextRequest('http://localhost/api/internal/provision-inbox', { method: 'POST' });
}

describe('POST /api/internal/provision-inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unsigned requests before service-role access', async () => {
    mockVerifyQStashBody.mockResolvedValueOnce(null);

    const res = await POST(makeRequest());
    const body = await res.json() as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });

  it('rejects malformed payloads before service-role access', async () => {
    mockVerifyQStashBody.mockResolvedValueOnce(
      JSON.stringify({ tenantId: 'not-a-uuid', agentId: 'also-bad', agentName: '' })
    );

    const res = await POST(makeRequest());
    const body = await res.json() as { error: string };

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid UUID|Too small|Invalid input/i);
    expect(mockCreateServiceClient).not.toHaveBeenCalled();
  });
});
