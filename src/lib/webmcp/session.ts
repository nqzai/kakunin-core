import { NextResponse } from 'next/server';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

export interface WebMcpTenantContext {
  tenantId: string;
}

export async function resolveWebMcpTenantContext(): Promise<
  { context: WebMcpTenantContext; response?: never } | { context?: never; response: NextResponse }
> {
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!appContext.tenant?.id) {
    return { response: NextResponse.json({ error: 'Tenant not found' }, { status: 404 }) };
  }

  return { context: { tenantId: appContext.tenant.id } };
}
