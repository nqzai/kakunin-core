/**
 * GET /api/v1/agents/:id/credential
 *
 * Returns the W3C Verifiable Credential (vc+jwt) for an agent's active certificate.
 * Tenant-scoped — only returns credentials belonging to the authenticated tenant.
 *
 * Response:
 *   200 { data: { vc_jwt: string, serial_number: string, expires_at: string } }
 *   404 if agent has no active certificate or no VC (issued before RA-97)
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { decodeVcJwt } from '@/lib/certificates/vc';
import { log } from '@/lib/logging';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id: agentId } = await params;
  const supabase = createServiceClient();

  // Fetch active cert for this agent — tenant scoped
  const { data: cert, error } = await supabase
    .from('certificates')
    // vc_jwt not in generated types yet — select via cast
    .select('id, serial_number, expires_at, issued_at, vc_jwt' as 'id, serial_number, expires_at, issued_at')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    log.error('[credential.get]', { error: error.message, agentId });
    return NextResponse.json({ error: 'Failed to fetch credential' }, { status: 500 });
  }

  if (!cert) {
    return NextResponse.json(
      { error: 'No active certificate found for this agent' },
      { status: 404 },
    );
  }

  const certAny = cert as typeof cert & { vc_jwt?: string | null };
  if (!certAny.vc_jwt) {
    return NextResponse.json(
      { error: 'No Verifiable Credential found. Re-certify the agent to issue a VC alongside the X.509 certificate.' },
      { status: 404 },
    );
  }

  // Decode for display — signature already verified at issuance by KMS
  const decoded = decodeVcJwt(certAny.vc_jwt);

  return NextResponse.json({
    data: {
      vc_jwt: certAny.vc_jwt,
      serial_number: cert.serial_number,
      issued_at: cert.issued_at,
      expires_at: cert.expires_at,
      // Convenience: decoded VC payload for clients that don't want to parse JWT
      credential: decoded?.vc ?? null,
    },
  });
}
