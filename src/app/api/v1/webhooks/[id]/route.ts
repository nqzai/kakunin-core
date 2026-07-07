import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';

const updateWebhookSchema = z.object({
  active: z.boolean().optional(),
  events: z
    .array(
      z.enum([
        'certificate.issued',
        'certificate.revoked',
        'risk.alert',
      ] as const)
    )
    .min(1)
    .optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// ─── PATCH /v1/webhooks/:id — update active state or events ──────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const body = updateWebhookSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  if (Object.keys(body.data).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data: webhook, error } = await supabase
    .from('webhooks')
    .update({ ...body.data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('id, url, events, active, updated_at')
    .single();

  if (error || !webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'webhook.updated',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Webhook ${id} updated`,
    affected_id: id,
    metadata: { changes: body.data },
  });

  return NextResponse.json({ data: webhook });
}

// ─── DELETE /v1/webhooks/:id — deregister ────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const supabase = createServiceClient();

  // Fetch first to capture url/events for audit log
  const { data: webhook } = await supabase
    .from('webhooks')
    .select('id, url, events')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (error) {
    log.error('[webhooks.delete] DB delete failed', error);
    return NextResponse.json({ error: 'Failed to delete webhook' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'webhook.deregistered',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Webhook deregistered: ${webhook.url}`,
    affected_id: id,
    metadata: { webhook_id: id, url: webhook.url, events: webhook.events },
  });

  return new NextResponse(null, { status: 204 });
}
