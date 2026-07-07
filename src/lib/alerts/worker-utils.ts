import { NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { decryptCredentials } from '@/lib/credentials/crypto';
import { log } from '@/lib/logging';

/**
 * Check whether an alert has already been sent for a given event + channel
 * combination. Returns true if a duplicate exists (caller should skip).
 */
export async function isAlertAlreadySent(
  supabase: SupabaseClient,
  tenantId: string,
  eventId: string,
  channelId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('event_type', 'alert.channel.sent')
    .contains('metadata', { event_id: eventId, channel_id: channelId });
  return (count ?? 0) > 0;
}

interface ChannelCredentials {
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
}

type ChannelResult =
  | { ok: true; data: ChannelCredentials }
  | { ok: false; response: NextResponse<{ error: string }> }
  | { ok: false; response: NextResponse<{ ok: boolean; skipped: boolean }> };

/**
 * Fetch, validate, and decrypt an alert channel's credentials.
 * Handles inactive channels, missing records, and missing encrypted data.
 */
export async function fetchAlertChannel(
  supabase: SupabaseClient,
  channelId: string,
  tenantId: string,
  workerTag: string,
): Promise<ChannelResult> {
  const { data: channel, error: fetchErr } = await supabase
    .from('tenant_alert_channels')
    .select('credentials_enc, config, is_active')
    .eq('id', channelId)
    .eq('tenant_id', tenantId)
    .single();

  if (fetchErr || !channel) {
    log.error(`[${workerTag}] Channel not found`, { channelId, tenantId });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Channel not found' }, { status: 404 }),
    };
  }

  if (!channel.is_active) {
    log.info(`[${workerTag}] Channel inactive \u2014 skipping`, { channelId });
    return {
      ok: false,
      response: NextResponse.json({ ok: true, skipped: true }),
    };
  }

  if (!channel.credentials_enc) {
    log.error(`[${workerTag}] Channel has no encrypted credentials \u2014 re-provision`, { channelId });
    return {
      ok: false,
      response: NextResponse.json({ error: 'Channel misconfigured' }, { status: 422 }),
    };
  }

  const credentials = decryptCredentials(channel.credentials_enc) as Record<string, unknown>;
  const config = (channel.config ?? {}) as Record<string, unknown>;

  return { ok: true, data: { credentials, config } };
}
