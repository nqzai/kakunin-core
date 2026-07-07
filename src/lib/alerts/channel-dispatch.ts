/**
 * Alert Channel Dispatch
 *
 * Queries active BYOA alert channels for the tenant and enqueues
 * per-channel QStash workers. Called from POST /api/v1/events when
 * risk_band === 'high'. Always fire-and-forget — never blocks event response.
 *
 * Key flows:
 *   dispatchAlertChannels() → fetch active channels → enqueue worker per channel
 *   Workers: alert-slack | alert-pagerduty | alert-twilio (handles sms + whatsapp)
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { enqueue } from '@/lib/queue/qstash';
import { log } from '@/lib/logging';

export interface AlertPayload {
  tenantId: string;
  agentId: string;
  eventId: string;
  riskScore: number;
  actionType: string;
  occurredAt: string;
}

// Maps channel_type to the internal QStash worker path under /api/internal/
const CHANNEL_WORKER: Record<string, string> = {
  slack:     'alert-slack',
  pagerduty: 'alert-pagerduty',
  sms:       'alert-twilio',
  whatsapp:  'alert-twilio',
};

/**
 * Dispatch high-risk alerts to all active BYOA channels for the tenant.
 *
 * Each channel dispatches as an independent QStash job (retries: 3).
 * Credentials are never read here — workers fetch from DB at execution time.
 * All errors are logged as warnings and swallowed — dispatch failure must
 * not affect the POST /events 200 response.
 */
export async function dispatchAlertChannels(
  supabase: SupabaseClient<Database>,
  payload: AlertPayload,
): Promise<void> {
  const { data: channels, error } = await supabase
    .from('tenant_alert_channels')
    .select('id, channel_type')
    .eq('tenant_id', payload.tenantId)
    .eq('is_active', true);

  if (error) {
    log.warn('[alert-dispatch] Failed to fetch channels', { error: error.message, tenantId: payload.tenantId });
    return;
  }

  if (!channels || channels.length === 0) return;

  await Promise.all(
    channels.map(async (channel) => {
      const workerPath = CHANNEL_WORKER[channel.channel_type];
      if (!workerPath) {
        log.warn('[alert-dispatch] Unknown channel type — skipping', { channelType: channel.channel_type });
        return;
      }

      try {
        await enqueue({
          path: workerPath,
          body: {
            channelId: channel.id,
            channelType: channel.channel_type,
            ...payload,
          },
        });
      } catch (err) {
        // QStash dispatch failure must not block event response
        log.warn('[alert-dispatch] Enqueue failed', {
          channelId: channel.id,
          channelType: channel.channel_type,
          error: (err as Error).message,
        });
      }
    }),
  );
}
