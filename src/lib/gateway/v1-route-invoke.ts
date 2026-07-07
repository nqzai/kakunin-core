import { NextRequest, type NextResponse } from 'next/server';
import { GET as getAgentRoute } from '@/app/api/v1/agents/[id]/route';
import { GET as getAgentRiskRoute } from '@/app/api/v1/agents/[id]/risk/route';
import { POST as postEventRoute } from '@/app/api/v1/events/route';

function tenantHeaders(tenantId: string, extra?: Record<string, string>): Headers {
  const headers = new Headers({ 'x-tenant-id': tenantId });
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      headers.set(key, value);
    }
  }
  return headers;
}

export async function invokeTenantScopedAgentRoute(
  tenantId: string,
  agentId: string,
): Promise<NextResponse> {
  const request = new NextRequest(`http://localhost/api/v1/agents/${agentId}`, {
    method: 'GET',
    headers: tenantHeaders(tenantId),
  });
  return getAgentRoute(request, { params: Promise.resolve({ id: agentId }) });
}

export async function invokeTenantScopedAgentRiskRoute(
  tenantId: string,
  agentId: string,
): Promise<NextResponse> {
  const request = new NextRequest(`http://localhost/api/v1/agents/${agentId}/risk`, {
    method: 'GET',
    headers: tenantHeaders(tenantId),
  });
  return getAgentRiskRoute(request, { params: Promise.resolve({ id: agentId }) });
}

export async function invokeTenantScopedEventRoute(
  tenantId: string,
  body: Record<string, unknown>,
): Promise<NextResponse> {
  const request = new NextRequest('http://localhost/api/v1/events', {
    method: 'POST',
    headers: tenantHeaders(tenantId, { 'content-type': 'application/json' }),
    body: JSON.stringify(body),
  });
  return postEventRoute(request);
}
