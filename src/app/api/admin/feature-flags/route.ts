import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';
import { isValidBearerSecret } from '@/lib/security/bearer-auth';

/**
 * POST /api/admin/feature-flags
 *
 * Retool admin endpoint — toggle feature flags per tenant.
 * Used by the Retool admin panel to enable/disable autonomous reply
 * and other feature flags without a code deploy.
 *
 * Auth: RETOOL_ADMIN_SECRET in Authorization header (Bearer token).
 * Never exposed to the public API — not in /api/v1/* namespace.
 *
 * GET /api/admin/feature-flags?tenant_id=xxx — read current flags
 * POST /api/admin/feature-flags — update one or more flags
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const FLAG_FIELDS = [
  'autonomous_reply_enabled',
  'agentmail_enabled',
  'webhooks_enabled',
  'reports_enabled',
  'debug_chat_enabled',
] as const;

type FlagField = (typeof FLAG_FIELDS)[number];

const postSchema = z.object({
  tenant_id: z.string().uuid(),
  flags: z.object({
    autonomous_reply_enabled: z.boolean().optional(),
    agentmail_enabled: z.boolean().optional(),
    webhooks_enabled: z.boolean().optional(),
    reports_enabled: z.boolean().optional(),
    debug_chat_enabled: z.boolean().optional(),
  }).refine((f) => Object.keys(f).length > 0, { message: 'At least one flag required' }),
});

function requireAdminAuth(req: NextRequest): boolean {
  return isValidBearerSecret(req.headers.get('authorization'), process.env.RETOOL_ADMIN_SECRET);
}

export async function GET(req: NextRequest) {
  if (!requireAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('feature_flags')
    .select('*')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Tenant feature flags not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  if (!requireAdminAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = postSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { tenant_id, flags } = body.data;
  const supabase = createServiceClient();

  // Verify tenant exists
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, email')
    .eq('id', tenant_id)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  // Apply flag updates
  const { data: updated, error: updateErr } = await supabase
    .from('feature_flags')
    .update(flags)
    .eq('tenant_id', tenant_id)
    .select()
    .single();

  if (updateErr) {
    log.error('[admin.feature-flags] Update failed', { tenant_id, error: updateErr.message });
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  // Audit every flag change
  const flagSummary = (Object.entries(flags) as [FlagField, boolean][])
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  await writeAuditLog(supabase, {
    tenant_id,
    event_type: 'admin.feature_flags.updated',
    actor_type: 'system',
    actor_id: 'retool-admin',
    description: `Feature flags updated by admin: ${flagSummary}`,
    affected_id: tenant_id,
    metadata: { flags, tenant_email: tenant.email },
  });

  log.info('[admin.feature-flags] Updated', { tenant_id, flags });

  return NextResponse.json({ data: updated });
}
