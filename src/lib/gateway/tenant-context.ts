import { type NextRequest, NextResponse } from 'next/server';

/**
 * Tenant context guard for /api/v1/* route handlers.
 *
 * The proxy (src/proxy.ts) authenticates the API key and injects
 * x-tenant-id; it also strips any client-supplied value. Route handlers
 * must still guard the read — a matcher misconfiguration, direct handler
 * invocation in tests, or a future public route would otherwise turn the
 * old non-null assertion (`.get('x-tenant-id')!`) into a null tenant
 * flowing into DB queries.
 *
 * @example
 * const tenantAuth = requireTenantId(req);
 * if (!tenantAuth.ok) return tenantAuth.response;
 * const tenantId = tenantAuth.tenantId;
 */
export function requireTenantId(
  req: NextRequest,
):
  | { ok: true; tenantId: string }
  | { ok: false; response: NextResponse<{ error: string }> } {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, tenantId };
}
