/**
 * POST /api/internal/alert-pagerduty
 *
 * QStash worker — triggers a PagerDuty incident via the Events API v2
 * using the tenant's BYOA routing key.
 *
 * Triggered by: lib/alerts/channel-dispatch.ts when risk_band === 'high'
 * Retries: 3 (QStash default)
 * Idempotent: dedup_key = eventId — PagerDuty deduplicates on its end too.
 *
 * SECURITY: routing_key fetched from DB at execution time, never logged.
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
  channelType: z.literal('pagerduty'),
  tenantId:    z.string().uuid(),
  agentId:     z.string().uuid(),
  eventId:     z.string().uuid(),
  riskScore:   z.number(),
  actionType:  z.string(),
  occurredAt:  z.string(),
});

const PD_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { channelId, tenantId, agentId, eventId, riskScore, actionType, occurredAt } = parsed.data;
  const supabase = createServiceClient();

  if (await isAlertAlreadySent(supabase, tenantId, eventId, channelId)) {
    log.info('[alert-pagerduty] Already sent for event — skipping', { eventId, channelId });
    return NextResponse.json({ ok: true, skipped: true });
  }

  const channel = await fetchAlertChannel(supabase, channelId, tenantId, 'alert-pagerduty');
  if (!channel.ok) return channel.response;

  const creds = channel.data.credentials as { routing_key?: string };
  const cfg   = channel.data.config as { severity?: string };

  if (!creds.routing_key) {
    log.error('[alert-pagerduty] Missing routing_key', { channelId });
    return NextResponse.json({ error: 'Channel misconfigured' }, { status: 422 });
  }

  const severity = cfg.severity ?? 'critical';
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

  const pdBody = {
    routing_key:  creds.routing_key,
    event_action: 'trigger',
    dedup_key: eventId,
    payload: {
      summary:   `High-risk agent behaviour: ${actionType} (score ${riskScore.toFixed(3)})`,
      severity,
      source:    `kakunin/agent/${agentId}`,
      timestamp: occurredAt,
      custom_details: {
        agent_id:    agentId,
        event_id:    eventId,
        action_type: actionType,
        risk_score:  riskScore,
        dashboard:   `${appUrl}/dashboard/agents/${agentId}/events/${eventId}`,
      },
    },
    links: [
      {
        href: `${appUrl}/dashboard/agents/${agentId}/events/${eventId}`,
        text: 'View in Kakunin Dashboard',
      },
    ],
  };

  let dedupeKey: string | null = null;
  try {
    const res = await fetch(PD_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pdBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`PagerDuty API ${res.status}: ${errText}`);
    }

    const data = await res.json() as { status?: string; dedup_key?: string };
    dedupeKey = data.dedup_key ?? eventId;
  } catch (err) {
    log.error('[alert-pagerduty] Send failed', { error: (err as Error).message, channelId });
    return NextResponse.json({ error: 'PagerDuty send failed' }, { status: 502 });
  }

  await writeAuditLog(supabase, {
    tenant_id:   tenantId,
    event_type:  'alert.channel.sent',
    actor_type:  'system',
    actor_id:    'alert-pagerduty-worker',
    description: `High-risk alert triggered PagerDuty incident for event ${eventId}`,
    affected_id: agentId,
    metadata:    { channel_id: channelId, event_id: eventId, dedup_key: dedupeKey, action_type: actionType } as Json,
  });

  return NextResponse.json({ ok: true, dedup_key: dedupeKey });
}
