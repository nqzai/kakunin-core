import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockCheckReportQuota,
  mockIncrementReportCount,
  mockWriteAuditLog,
  mockEnqueue,
  mockCreateAnonServerClient,
  mockHeaders,
} = vi.hoisted(() => ({
  mockCheckReportQuota: vi.fn(),
  mockIncrementReportCount: vi.fn(),
  mockWriteAuditLog: vi.fn(),
  mockEnqueue: vi.fn(),
  mockCreateAnonServerClient: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: async () => mockHeaders(),
}));

vi.mock('@/lib/quota/resource-quota', () => ({
  checkReportQuota: mockCheckReportQuota,
  incrementReportCount: mockIncrementReportCount,
}));
vi.mock('@/lib/audit/audit-log', () => ({ writeAuditLog: mockWriteAuditLog }));
vi.mock('@/lib/queue/qstash', () => ({ enqueue: mockEnqueue }));

const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();

function makeChain() {
  const chain: Record<string, unknown> = {};
  chain['eq'] = vi.fn(() => chain);
  chain['single'] = mockSingle;
  chain['maybeSingle'] = mockMaybeSingle;
  chain['select'] = vi.fn(() => chain);
  chain['insert'] = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
  return chain;
}

let chain = makeChain();
const mockFrom = vi.fn(() => ({
  select: vi.fn(() => chain),
  insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
  createAnonServerClient: mockCreateAnonServerClient,
}));

import { POST as postCompliance } from '@/app/api/v1/reports/compliance/route';
import { POST as postDashboardReport } from '@/app/api/reports/generate/route';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440001';
const AGENT_ID = '550e8400-e29b-41d4-a716-446655440002';
const REPORT_ID = '550e8400-e29b-41d4-a716-446655440003';

function makeComplianceRequest() {
  const req = new NextRequest('http://localhost/api/v1/reports/compliance', {
    method: 'POST',
    body: JSON.stringify({ agentId: AGENT_ID, windowDays: 30 }),
  });
  req.headers.set('x-tenant-id', TENANT_ID);
  return req;
}

function makeDashboardRequest() {
  return new NextRequest('http://localhost/api/reports/generate', {
    method: 'POST',
    body: JSON.stringify({ agentId: AGENT_ID, windowDays: 30 }),
  });
}

describe('report quota metering', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockHeaders.mockResolvedValue(new Headers());
    chain = makeChain();
    mockFrom.mockReturnValue({
      select: vi.fn(() => chain),
      insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) })),
    });
    mockCheckReportQuota.mockResolvedValue({
      allowed: true,
      current: 0,
      limit: 10,
      plan: 'starter',
    });
    mockIncrementReportCount.mockResolvedValue(undefined);
    mockWriteAuditLog.mockResolvedValue('audit-uuid');
    mockEnqueue.mockResolvedValue(undefined);
  });

  it('increments the monthly report counter for API-key report creation', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { id: AGENT_ID, name: 'TestBot' }, error: null })
      .mockResolvedValueOnce({ data: { plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: { id: REPORT_ID }, error: null });

    const res = await postCompliance(makeComplianceRequest());

    expect(res.status).toBe(202);
    expect(mockIncrementReportCount).toHaveBeenCalledWith(expect.anything(), TENANT_ID, AGENT_ID);
  });

  it('increments the monthly report counter for dashboard report creation', async () => {
    mockCreateAnonServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-1', email: 'owner@acme.com' } },
        }),
      },
    });

    mockMaybeSingle
      .mockResolvedValueOnce({ data: { id: TENANT_ID, plan_tier: 'starter' }, error: null })
      .mockResolvedValueOnce({ data: { reports_enabled: true }, error: null });

    mockSingle
      .mockResolvedValueOnce({ data: { id: AGENT_ID, name: 'TestBot' }, error: null })
      .mockResolvedValueOnce({ data: { id: REPORT_ID }, error: null });

    const res = await postDashboardReport(makeDashboardRequest());

    expect(res.status).toBe(202);
    expect(mockIncrementReportCount).toHaveBeenCalledWith(expect.anything(), TENANT_ID, AGENT_ID);
  });
});
