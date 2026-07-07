import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { enqueue } from '@/lib/queue/qstash';
import { listEnabledByProvider } from '@/lib/integrations/connections';
import { log } from '@/lib/logging';

/**
 * POST /api/internal/cron/otlp-sweep (QStash scheduled — P1 RA-180)
 *
 * Periodic sweep: fans out one otlp-export job per enabled OTLP connection.
 * OTLP export is the observe/record layer (visibility + regulatory), not the
 * urgent path — urgency is owned by the risk engine (auto-revoke/kill switch)
 * and alert_channels. So a fixed cron cadence, NOT per-event push.
 *
 * Suggested schedule: every 5 minutes (QStash cron). Each export job reads
 * rows since that connection's last_sync, so cadence only affects latency.
 */

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  const supabase = createServiceClient();
  const connections = await listEnabledByProvider(supabase, 'otlp');

  let enqueued = 0;
  for (const c of connections) {
    try {
      await enqueue({ path: 'integrations/otlp-export', body: { connectionId: c.id, tenantId: c.tenant_id } });
      enqueued += 1;
    } catch (err) {
      log.error('[otlp-sweep] Failed to enqueue export', { connectionId: c.id, error: (err as Error).message });
    }
  }

  log.info('[otlp-sweep] Swept OTLP connections', { total: connections.length, enqueued });
  return NextResponse.json({ ok: true, total: connections.length, enqueued });
}
