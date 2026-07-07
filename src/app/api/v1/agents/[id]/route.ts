import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { updateSubscriptionQuantity } from '@/lib/stripe/client';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

const patchAgentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  model_hash: z.string().min(1).max(512).optional(),
  model: z.string().max(255).nullable().optional(),
  version: z.string().max(100).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  status: z.enum(['pending', 'active', 'suspended', 'retired']).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  const [agentResult, certsResult] = await Promise.all([
    supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('certificates')
      .select('id, serial_number, status, issued_at, expires_at')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .order('issued_at', { ascending: false }),
  ]);

  if (agentResult.error || !agentResult.data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: { ...agentResult.data, certificates: certsResult.data ?? [] },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const body = patchAgentSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: existing, error: fetchError } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const { metadata, ...rest } = body.data;

  const { data: agent, error } = await supabase
    .from('agents')
    .update({
      ...rest,
      ...(metadata !== undefined ? { metadata: metadata as Json } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error || !agent) {
    log.error('[agents.patch]', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.updated',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Agent "${agent.name}" updated`,
    affected_id: agent.id,
    metadata: { changes: rest } as Json,
  });

  // Status changed to/from retired → sync Stripe subscription quantity
  if (body.data.status && body.data.status !== existing.status) {
    void updateSubscriptionQuantity(supabase, tenantId);
  }

  return NextResponse.json({ data: agent });
}
