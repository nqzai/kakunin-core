/**
 * PATCH  /api/v1/alert-channels/:id — update event filters or severity config
 * DELETE /api/v1/alert-channels/:id — deprovision a BYOA alert channel
 *
 * PATCH: updates `config` (events, severity_filter). Credentials cannot
 * be updated via PATCH — remove and re-create the channel instead.
 *
 * DELETE: soft-deletes by setting is_active = false. The row is retained for
 * audit purposes (credentials remain in DB until pgsodium vault migration).
 * Hard deletes are not exposed — service-role only via Retool admin.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';

const patchSchema = z.object({
  config: z.object({
    events: z.array(z.string()).min(1).optional(),
    severity_filter: z.union([z.literal('all'), z.literal('high_only')]).optional(),
  }).optional(),
}).refine((d) => d.config !== undefined, { message: 'At least one field required' });

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const body = patchSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch existing to verify ownership and get current config for merge
  const { data: channel, error: fetchErr } = await supabase
    .from('tenant_alert_channels')
    .select('id, channel_type, config, is_active')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !channel) {
    return NextResponse.json({ error: 'Alert channel not found' }, { status: 404 });
  }

  if (!channel.is_active) {
    return NextResponse.json({ error: 'Cannot update an inactive channel' }, { status: 409 });
  }

  // Merge config — only update fields provided
  const existingConfig = (channel.config ?? {}) as Record<string, unknown>;
  const mergedConfig = { ...existingConfig, ...(body.data.config ?? {}) };

  const { data: updated, error: updateErr } = await supabase
    .from('tenant_alert_channels')
    .update({ config: mergedConfig as Json })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('id, channel_type, config, is_active, created_at')
    .single();

  if (updateErr || !updated) {
    log.error('[alert-channels.patch] Update failed', { error: updateErr?.message });
    return NextResponse.json({ error: 'Failed to update alert channel' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert_channel.updated',
    actor_type:  'user',
    actor_id:    tenantId,
    description: `BYOA alert channel config updated: ${channel.channel_type}`,
    affected_id: id,
    metadata:    { channel_id: id, channel_type: channel.channel_type, changes: body.data.config } as Json,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const supabase = createServiceClient();

  // Verify channel belongs to this tenant before update
  const { data: channel, error: fetchErr } = await supabase
    .from('tenant_alert_channels')
    .select('id, channel_type, is_active')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !channel) {
    return NextResponse.json({ error: 'Alert channel not found' }, { status: 404 });
  }

  if (!channel.is_active) {
    // Already inactive — idempotent, return 200
    return NextResponse.json({ data: { id, deprovisioned: true } });
  }

  const { error: updateErr } = await supabase
    .from('tenant_alert_channels')
    .update({ is_active: false })
    .eq('id', id)
    .eq('tenant_id', tenantId);

  if (updateErr) {
    log.error('[alert-channels.delete] Update failed', { error: updateErr.message });
    return NextResponse.json({ error: 'Failed to deprovision alert channel' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert_channel.deleted',
    actor_type:  'user',
    actor_id:    tenantId,
    description: `BYOA alert channel deprovisioned: ${channel.channel_type}`,
    affected_id: id,
    metadata:    { channel_type: channel.channel_type, channel_id: id } as Json,
  });

  return NextResponse.json({ data: { id, deprovisioned: true } });
}
