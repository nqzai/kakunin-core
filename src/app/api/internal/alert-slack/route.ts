/**
 * POST /api/internal/alert-slack
 *
 * QStash worker — sends a high-risk alert to a tenant's Slack channel
 * via their BYOA bot token.
 *
 * Triggered by: lib/alerts/channel-dispatch.ts when risk_band === 'high'
 * Retries: 3 (QStash default)
 * Idempotent: checks audit_log for alert.channel.sent with eventId + channelId
 *
 * SECURITY: credentials fetched from DB at execution time, never logged.
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
  channelId:  z.string().uuid(),
  channelType: z.literal('slack'),
  tenantId:   z.string().uuid(),
  agentId:    z.string().uuid(),
  eventId:    z.string().uuid(),
  riskScore:  z.number(),
  actionType: z.string(),
  occurredAt: z.string(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { channelId, tenantId, agentId, eventId, riskScore, actionType, occurredAt } = parsed.data;
  const supabase = createServiceClient();

  if (await isAlertAlreadySent(supabase, tenantId, eventId, channelId)) {
    log.info('[alert-slack] Already sent for event — skipping', { eventId, channelId });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const channel = await fetchAlertChannel(supabase, channelId, tenantId, 'alert-slack');
  if (!channel.ok) return channel.response;

  const creds = channel.data.credentials as { bot_token?: string };
  const cfg   = channel.data.config as { channel_id?: string };

  if (!creds.bot_token || !cfg.channel_id) {
    log.error('[alert-slack] Missing bot_token or channel_id', { channelId });
    return NextResponse.json({ error: 'Channel misconfigured' }, { status: 422 });
  }

  const riskEmoji = riskScore >= 0.85 ? '🔴' : '🟠';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

  const slackBody = {
    channel: cfg.channel_id,
    text: `${riskEmoji} High-risk agent behaviour detected`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${riskEmoji} High-Risk Alert — Kakunin` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Action Type*\n${actionType}` },
          { type: 'mrkdwn', text: `*Risk Score*\n${riskScore.toFixed(3)} (high)` },
          { type: 'mrkdwn', text: `*Agent ID*\n\`${agentId}\`` },
          { type: 'mrkdwn', text: `*Occurred*\n${new Date(occurredAt).toUTCString()}` },
        ],
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in Dashboard' },
            url: `${appUrl}/dashboard/agents/${agentId}/events/${eventId}`,
            style: 'danger',
          },
        ],
      },
    ],
  };

  let tsId: string | null = null;
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.bot_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackBody),
    });

    const data = await res.json() as { ok: boolean; ts?: string; error?: string };
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error ?? 'unknown'}`);
    }
    tsId = data.ts ?? null;
  } catch (err) {
    log.error('[alert-slack] Send failed', { error: (err as Error).message, channelId });
    return NextResponse.json({ error: 'Slack send failed' }, { status: 502 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert.channel.sent',
    actor_type:  'system',
    actor_id:    'alert-slack-worker',
    description: `High-risk alert sent via Slack for event ${eventId}`,
    affected_id: agentId,
    metadata:    { channel_id: channelId, event_id: eventId, slack_ts: tsId, action_type: actionType } as Json,
  });

  return NextResponse.json({ ok: true, slack_ts: tsId });
}
