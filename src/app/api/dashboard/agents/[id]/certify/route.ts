import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveSessionTenantContext } from '@/lib/tenant/session';
import { certifyAgent } from '@/lib/certificates/certify-agent';

/**
 * POST /api/dashboard/agents/:id/certify
 *
 * Dashboard-only cert issuance. Session-cookie authenticated — not API key.
 * Delegates to the shared certifyAgent() logic with actor_type='user'.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await resolveSessionTenantContext();
  if (!session?.tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { user, tenant } = session;

  const { id } = await params;
  const supabase = createServiceClient();

  return certifyAgent({
    supabase,
    tenantId: tenant.id,
    agentId: id,
    actorType: 'user',
    actorId: user.id,
    issueVC: false,
    logPrefix: 'dashboard.certify',
  });
}
