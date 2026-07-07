import { NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { encryptCredentials } from '@/lib/credentials/crypto';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

// Service-role write only — client RLS blocks INSERT/UPDATE on tenant_alert_channels.
// Session-authenticated: dashboard use only, not API-key protected.

const CHANNEL_TYPES = ['slack', 'pagerduty', 'sms', 'whatsapp'] as const;
type ChannelType = typeof CHANNEL_TYPES[number];

const createSchema = z.object({
  channel_type: z.enum(CHANNEL_TYPES),
  credentials: z.record(z.string(), z.string()),
  config: z.object({
    events: z.array(z.string()).min(1).default(['risk.alert', 'certificate.revoked']),
    severity_filter: z.union([z.literal('all'), z.literal('high_only')]).default('all'),
  }).default({ events: ['risk.alert', 'certificate.revoked'], severity_filter: 'all' }),
});

/** Cast a plain object to the Supabase Json type for JSONB columns */
function toJson(val: unknown): Json {
  return val as Json;
}

/** Credential field required per channel type */
const REQUIRED_CRED: Record<ChannelType, string[]> = {
  slack:      ['webhook_url'],
  pagerduty:  ['integration_key'],
  sms:        ['phone_number'],
  whatsapp:   ['phone_number'],
};

/** Mask credentials for API response — never return raw values */
function maskCredentials(type: ChannelType, creds: Record<string, string>): string {
  if (type === 'slack') {
    const url = creds.webhook_url ?? '';
    return url.replace(/\/services\/.+/, '/services/***');
  }
  if (type === 'pagerduty') {
    const key = creds.integration_key ?? '';
    return key.slice(0, 6) + '***';
  }
  if (type === 'sms' || type === 'whatsapp') {
    const num = creds.phone_number ?? '';
    return num.slice(0, 4) + '****' + num.slice(-2);
  }
  return '***';
}

export async function GET(_: NextRequest) {
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();
  const { tenant } = appContext;
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const { data: channels } = await db
    .from('tenant_alert_channels')
    .select('id, channel_type, config, is_active, created_at')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true);

  return NextResponse.json({ data: channels ?? [] });
}

export async function POST(req: NextRequest) {
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();
  const { user, tenant } = appContext;
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // BYOA channels require Pro plan
  const planTier = tenant.plan_tier ?? tenant.plan;
  if (planTier !== 'pro') {
    return NextResponse.json({ error: 'BYOA alert channels require the Pro plan' }, { status: 403 });
  }

  const body = createSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { channel_type, credentials, config } = body.data;

  // Validate required credential fields
  const missing = REQUIRED_CRED[channel_type].filter((f) => !credentials[f]);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Missing credential fields: ${missing.join(', ')}` }, { status: 400 });
  }

  // Pro: max 1 active channel
  const { count } = await db
    .from('tenant_alert_channels')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)
    .eq('is_active', true);

  if ((count ?? 0) >= 1) {
    return NextResponse.json({
      error: 'Pro plan includes 1 BYOA channel. Remove the existing channel first.',
    }, { status: 409 });
  }

  // Encrypt credentials before storage — plaintext never written to DB
  const credentialsEnc = encryptCredentials(credentials);

  const { data: channel, error } = await db
    .from('tenant_alert_channels')
    .insert({
      tenant_id:       tenant.id,
      channel_type,
      credentials_enc: credentialsEnc,
      config:          toJson(config),
      is_active:       true,
    })
    .select('id, channel_type, config, is_active, created_at')
    .single();

  if (error) {
    log.error('[settings.channels] insert failed', error);
    return NextResponse.json({ error: 'Failed to save channel' }, { status: 500 });
  }

  // Zod infers credentials as Record<string, unknown> after parse — safe to cast since schema validates all values are strings
  const credentialHint = maskCredentials(channel_type, credentials as Record<string, string>);

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'channel.created',
    actor_type: 'user',
    actor_id: user.id,
    description: `BYOA alert channel configured: ${channel_type}`,
    affected_id: channel.id,
    metadata: toJson({ channel_type, credential_hint: credentialHint }),
  });

  return NextResponse.json({ data: { ...channel, credential_hint: credentialHint } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const channelId = searchParams.get('id');
  if (!channelId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();
  const { user, tenant } = appContext;
  if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  // Soft-delete: set is_active = false (preserves audit history)
  const { error } = await db
    .from('tenant_alert_channels')
    .update({ is_active: false })
    .eq('id', channelId)
    .eq('tenant_id', tenant.id);

  if (error) {
    log.error('[settings.channels] delete failed', error);
    return NextResponse.json({ error: 'Failed to remove channel' }, { status: 500 });
  }

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'channel.removed',
    actor_type: 'user',
    actor_id: user.id,
    description: 'BYOA alert channel removed',
    affected_id: channelId,
    metadata: {},
  });

  return NextResponse.json({ data: { removed: true } });
}
