/**
 * GET  /api/v1/alert-channels — list active BYOA alert channels
 * POST /api/v1/alert-channels — provision a new alert channel
 *
 * BYOA (Bring Your Own Account): customers supply their own Slack bot token,
 * PagerDuty routing key, or Twilio credentials. Kakunin stores and uses them
 * but never operates a shared alert pool.
 *
 * Security rules (non-negotiable):
 *   - Credentials are NEVER returned in any response
 *   - Credentials are NEVER logged
 *   - Plan quota enforced: byoaChannelsIncluded from PLAN_LIMITS
 *
 * Credential shape per channel_type:
 *   slack:      { bot_token: string }          config: { channel_id: string }
 *   pagerduty:  { routing_key: string }        config: { severity?: string }
 *   sms:        { account_sid, auth_token, from_number }   config: { to_number: string }
 *   whatsapp:   { account_sid, auth_token, from_number }   config: { to_number: string }
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getLimits } from '@/lib/quota/plan-limits';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { encryptCredentials } from '@/lib/credentials/crypto';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';

// ─── Credential schemas per channel type ─────────────────────────────────────

const slackCredentialsSchema = z.object({
  bot_token: z.string().min(1),
});

const pagerdutyCredentialsSchema = z.object({
  routing_key: z.string().min(1),
});

const twilioCredentialsSchema = z.object({
  account_sid: z.string().min(1),
  auth_token:  z.string().min(1),
  from_number: z.string().min(1),
});

const configSchema = z.record(z.string(), z.unknown()).default({});

const postBodySchema = z.object({
  channel_type: z.enum(['slack', 'pagerduty', 'sms', 'whatsapp']),
  credentials:  z.record(z.string(), z.unknown()),
  config:       configSchema,
});

// ─── Credential validation helpers ───────────────────────────────────────────

async function validateCredentials(
  channelType: string,
  credentials: Record<string, unknown>,
): Promise<{ valid: boolean; reason?: string }> {
  switch (channelType) {
    case 'slack': {
      const parsed = slackCredentialsSchema.safeParse(credentials);
      if (!parsed.success) return { valid: false, reason: 'Missing bot_token' };

      // Test Slack bot token against auth.test
      try {
        const res = await fetch('https://slack.com/api/auth.test', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${parsed.data.bot_token}`,
            'Content-Type': 'application/json',
          },
        });
        const body = await res.json() as { ok: boolean; error?: string };
        if (!body.ok) return { valid: false, reason: `Slack auth failed: ${body.error ?? 'unknown'}` };
      } catch (err) {
        return { valid: false, reason: `Slack validation error: ${(err as Error).message}` };
      }
      return { valid: true };
    }

    case 'pagerduty': {
      const parsed = pagerdutyCredentialsSchema.safeParse(credentials);
      if (!parsed.success) return { valid: false, reason: 'Missing routing_key' };
      // Routing keys are 32-char hex — format-only validation (no dry-run test on PD)
      if (!/^[a-zA-Z0-9]{32}$/.test(parsed.data.routing_key)) {
        return { valid: false, reason: 'routing_key must be 32 alphanumeric characters' };
      }
      return { valid: true };
    }

    case 'sms':
    case 'whatsapp': {
      const parsed = twilioCredentialsSchema.safeParse(credentials);
      if (!parsed.success) return { valid: false, reason: 'Missing account_sid, auth_token, or from_number' };

      // Test Twilio credentials by fetching the account resource
      try {
        const { account_sid, auth_token } = parsed.data;
        const basicAuth = Buffer.from(`${account_sid}:${auth_token}`).toString('base64');
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${account_sid}.json`,
          { headers: { Authorization: `Basic ${basicAuth}` } },
        );
        if (!res.ok) return { valid: false, reason: `Twilio auth failed: ${res.status}` };
      } catch (err) {
        return { valid: false, reason: `Twilio validation error: ${(err as Error).message}` };
      }
      return { valid: true };
    }

    default:
      return { valid: false, reason: 'Unknown channel type' };
  }
}

// ─── GET — list active channels (credentials never returned) ─────────────────

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const supabase = createServiceClient();

  const { data: channels, error } = await supabase
    .from('tenant_alert_channels')
    .select('id, channel_type, config, is_active, created_at')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  if (error) {
    log.error('[alert-channels.list]', { error: error.message });
    return NextResponse.json({ error: 'Failed to fetch alert channels' }, { status: 500 });
  }

  return NextResponse.json({ data: channels });
}

// ─── POST — provision a new channel ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;

  const body = postBodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { channel_type, credentials, config } = body.data;
  const supabase = createServiceClient();

  // Fetch plan tier for quota check
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan_tier')
    .eq('id', tenantId)
    .single();

  const planTier = tenant?.plan_tier ?? 'pending';
  const limits = getLimits(planTier);

  // Plan quota: count currently active channels for this tenant
  const { count: activeCount, error: countErr } = await supabase
    .from('tenant_alert_channels')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_active', true);

  if (countErr) {
    log.error('[alert-channels.create] Count query failed', { error: countErr.message });
    return NextResponse.json({ error: 'Failed to check channel quota' }, { status: 500 });
  }

  if (isFinite(limits.byoaChannelsIncluded) && (activeCount ?? 0) >= limits.byoaChannelsIncluded) {
    return NextResponse.json(
      {
        error: 'Alert channel limit reached for your plan. Upgrade to Pro or Enterprise to add BYOA channels.',
        quota: { limit: limits.byoaChannelsIncluded, current: activeCount ?? 0, plan: planTier },
      },
      { status: 422 },
    );
  }

  // Validate credentials by test-calling the third-party API
  const validation = await validateCredentials(channel_type, credentials);
  if (!validation.valid) {
    return NextResponse.json(
      { error: `Credential validation failed: ${validation.reason}` },
      { status: 422 },
    );
  }

  // Encrypt credentials before storage — plaintext never written to DB
  const credentialsEnc = encryptCredentials(credentials);

  const { data: channel, error: insertErr } = await supabase
    .from('tenant_alert_channels')
    .insert({
      tenant_id:       tenantId,
      channel_type,
      credentials_enc: credentialsEnc,
      config:          config as Json,
      is_active:       true,
    })
    .select('id, channel_type, config, is_active, created_at')
    .single();

  if (insertErr || !channel) {
    log.error('[alert-channels.create] Insert failed', { error: insertErr?.message });
    return NextResponse.json({ error: 'Failed to create alert channel' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert_channel.created',
    actor_type:  'user',
    actor_id:    tenantId,
    description: `BYOA alert channel provisioned: ${channel_type}`,
    affected_id: channel.id,
    // Never log credential content
    metadata: { channel_type, channel_id: channel.id } as Json,
  });

  return NextResponse.json({ data: channel }, { status: 201 });
}
