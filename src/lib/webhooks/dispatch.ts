/**
 * Webhook Dispatch
 *
 * Fans out a platform event to all active, subscribed webhook registrations
 * for a tenant. Each target gets its own QStash job (independent retries).
 *
 * Fire-and-forget — never awaited in the request path.
 * QStash retries: 3 per CLAUDE.md rule #6.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { enqueue } from '@/lib/queue/qstash';
import { log } from '@/lib/logging';

export type DispatchableEvent =
  | 'certificate.issued'
  | 'certificate.revoked'
  | 'risk.alert'
  | 'agent.halted'
  | 'report.completed';

export interface DispatchOptions {
  tenantId: string;
  eventType: DispatchableEvent;
  payload: Record<string, unknown>;
}

/**
 * Finds all active webhook registrations subscribed to this event,
 * then enqueues one QStash delivery job per matching webhook.
 *
 * Safe to call fire-and-forget — errors are logged but never thrown.
 */
export async function dispatchWebhookEvent(opts: DispatchOptions): Promise<void> {
  const { tenantId, eventType, payload } = opts;
  const supabase = createServiceClient();

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, secret_enc')
    .eq('tenant_id', tenantId)
    .eq('active', true)
    .contains('events', [eventType]);

  if (error) {
    log.warn('[webhooks.dispatch] Failed to fetch webhooks', { tenantId, eventType, error: error.message });
    return;
  }

  if (!webhooks || webhooks.length === 0) return;

  const jobs = webhooks.map((wh) =>
    enqueue({
      path: 'webhook-delivery',
      body: {
        webhookId: wh.id,
        tenantId,
        url: wh.url,
        secretEnc: wh.secret_enc,
        eventType,
        payload,
      },
    }).catch((err: unknown) => {
      log.warn('[webhooks.dispatch] QStash enqueue failed', {
        webhookId: wh.id,
        error: (err as Error).message,
      });
    })
  );

  await Promise.all(jobs);
}
