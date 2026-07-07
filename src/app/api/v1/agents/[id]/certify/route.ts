import { type NextRequest } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { certifyAgent } from '@/lib/certificates/certify-agent';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  return certifyAgent({
    supabase,
    tenantId,
    agentId: id,
    actorType: 'system',
    actorId: tenantId,
    issueVC: true,
    logPrefix: 'agents.certify',
  });
}
