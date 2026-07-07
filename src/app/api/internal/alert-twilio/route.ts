/**
 * POST /api/internal/alert-twilio
 *
 * QStash worker — sends a high-risk alert via SMS or WhatsApp
 * using the tenant's BYOA Twilio credentials.
 *
 * Handles both channel_type=sms and channel_type=whatsapp.
 * WhatsApp: both from_number and to_number are auto-prefixed with "whatsapp:"
 *
 * Triggered by: lib/alerts/channel-dispatch.ts when risk_band === 'high'
 * Retries: 3 (QStash default)
 * Idempotent: checks audit_log for alert.channel.sent with eventId + channelId
 *
 * SECURITY: Twilio credentials fetched from DB at execution time, never logged.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';
import { parseQStashBody } from '@/lib/api/validation';
import { isAlertAlreadySent, fetchAlertChannel } from '@/lib/alerts/worker-utils';

const bodySchema = z.object({
  channelId:   z.string().uuid(),
  channelType: z.enum(['sms', 'whatsapp']),
  tenantId:    z.string().uuid(),
  agentId:     z.string().uuid(),
  eventId:     z.string().uuid(),
  riskScore:   z.number(),
  actionType:  z.string(),
  occurredAt:  z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { channelId, channelType, tenantId, agentId, eventId, riskScore, actionType, occurredAt } = parsed.data;
  const supabase = createServiceClient();

  if (await isAlertAlreadySent(supabase, tenantId, eventId, channelId)) {
    log.info('[alert-twilio] Already sent for event — skipping', { eventId, channelId });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const channel = await fetchAlertChannel(supabase, channelId, tenantId, 'alert-twilio');
  if (!channel.ok) return channel.response;

  const creds = channel.data.credentials as { account_sid?: string; auth_token?: string; from_number?: string };
  const cfg   = channel.data.config as { to_number?: string };

  if (!creds.account_sid || !creds.auth_token || !creds.from_number || !cfg.to_number) {
    log.error('[alert-twilio] Missing required credentials or config', { channelId });
    return NextResponse.json({ error: 'Channel misconfigured' }, { status: 422 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

  const fromNumber = channelType === 'whatsapp'
    ? (creds.from_number.startsWith('whatsapp:') ? creds.from_number : `whatsapp:${creds.from_number}`)
    : creds.from_number;

  const toNumber = channelType === 'whatsapp'
    ? (cfg.to_number.startsWith('whatsapp:') ? cfg.to_number : `whatsapp:${cfg.to_number}`)
    : cfg.to_number;

  const messageBody =
    `\u26a0\ufe0f Kakunin High-Risk Alert\n` +
    `Action: ${actionType}\n` +
    `Score: ${riskScore.toFixed(3)}\n` +
    `Agent: ${agentId.slice(0, 8)}...\n` +
    `Time: ${new Date(occurredAt).toUTCString()}\n` +
    `View: ${appUrl}/dashboard/agents/${agentId}/events/${eventId}`;

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${creds.account_sid}/Messages.json`;
  const basicAuth = Buffer.from(`${creds.account_sid}:${creds.auth_token}`).toString('base64');

  const formBody = new URLSearchParams({
    From: fromNumber,
    To:   toNumber,
    Body: messageBody,
  });

  let twilioSid: string | null = null;
  try {
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!res.ok) {
      const errData = await res.json() as { message?: string; code?: number };
      throw new Error(`Twilio API ${res.status}: ${errData.message ?? 'unknown'} (code: ${errData.code ?? 'n/a'})`);
    }

    const data = await res.json() as { sid?: string };
    twilioSid = data.sid ?? null;
  } catch (err) {
    log.error('[alert-twilio] Send failed', { error: (err as Error).message, channelId, channelType });
    return NextResponse.json({ error: `${channelType.toUpperCase()} send failed` }, { status: 502 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert.channel.sent',
    actor_type:  'system',
    actor_id:    'alert-twilio-worker',
    description: `High-risk alert sent via ${channelType.toUpperCase()} for event ${eventId}`,
    affected_id: agentId,
    metadata:    { channel_id: channelId, event_id: eventId, channel_type: channelType, twilio_sid: twilioSid, action_type: actionType } as Json,
  });

  return NextResponse.json({ ok: true, twilio_sid: twilioSid });
}
