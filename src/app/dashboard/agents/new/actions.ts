'use server';

import { redirect } from 'next/navigation';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { checkAgentQuota } from '@/lib/quota/resource-quota';
import { updateSubscriptionQuantity } from '@/lib/stripe/client';
import type { Json } from '@/types/database';
import { resolveSessionTenantContext } from '@/lib/tenant/session';

const registerSchema = z.object({
  name:        z.string().min(1).max(255),
  model:       z.string().max(255).optional(),
  version:     z.string().max(100).optional(),
  model_hash:  z.string().min(1).max(512),
  description: z.string().max(1000).optional(),
});

export async function registerAgent(formData: FormData): Promise<{ error?: string }> {
  const session = await resolveSessionTenantContext();
  if (!session) redirect('/login');
  const { user, tenant } = session;

  const parsed = registerSchema.safeParse({
    name:        formData.get('name'),
    model:       formData.get('model') || undefined,
    version:     formData.get('version') || undefined,
    model_hash:  formData.get('model_hash'),
    description: formData.get('description') || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const db = createServiceClient();

  if (!tenant) return { error: 'Tenant not found' };

  const planTier = tenant.plan_tier ?? tenant.plan ?? 'pending';
  const quota = await checkAgentQuota(db, tenant.id, planTier);

  if (!quota.allowed) {
    return { error: `Agent limit reached (${quota.current}/${quota.limit}). Upgrade your plan.` };
  }

  const { data: agent, error } = await db
    .from('agents')
    .insert({
      tenant_id:   tenant.id,
      name:        parsed.data.name,
      model_hash:  parsed.data.model_hash,
      model:       parsed.data.model ?? null,
      version:     parsed.data.version ?? null,
      description: parsed.data.description ?? null,
      metadata:    {} as Json,
      status:      'pending',
    })
    .select('id')
    .single();

  if (error || !agent) {
    return { error: 'Failed to register agent. Try again.' };
  }

  await writeAuditLog(db, {
    tenant_id:   tenant.id,
    event_type:  'agent.created',
    actor_type:  'user',
    actor_id:    user.id,
    description: `Agent "${parsed.data.name}" registered via dashboard`,
    affected_id: agent.id,
    metadata:    { model: parsed.data.model, version: parsed.data.version } as Json,
  });

  // Fire-and-forget — sync Stripe seat quantity
  void updateSubscriptionQuantity(db, tenant.id);

  redirect(`/dashboard/agents/${agent.id}`);
}
