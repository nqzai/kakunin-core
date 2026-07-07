import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { decryptSecret, buildHeaders } from '@/lib/webhooks/crypto';
import { log } from '@/lib/logging';
import type { TablesUpdate } from '@/types/database';
import type { Json } from '@/types/database';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard';

/**
 * POST /api/internal/webhook-delivery (QStash worker)
 *
 * Delivers a signed webhook payload to the tenant's registered endpoint.
 * Logs each attempt to webhook_deliveries for audit + dashboard.
 *
 * Returns 200 always — QStash retries on non-2xx.
 * QStash handles exponential backoff between retries (retries: 3).
 *
 * Worker auth is enforced first via verifyQStashBody().
 */

interface DeliveryPayload {
  webhookId: string;
  tenantId: string;
  url: string;
  secretEnc: string;
  eventType: string;
  payload: Record<string, unknown>;
}

// Delivery timeout — must be well under Vercel's 25s limit
const DELIVERY_TIMEOUT_MS = 10_000;

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;
  const job = JSON.parse(verified.body) as DeliveryPayload;
  const { webhookId, tenantId, url, secretEnc, eventType, payload } = job;

  const supabase = createServiceClient();
  const body = JSON.stringify({ event: eventType, data: payload });

  // Create delivery record (pending) to capture this attempt
  const { data: delivery, error: insertError } = await supabase
    .from('webhook_deliveries')
    .insert({
      webhook_id: webhookId,
      tenant_id: tenantId,
      event_type: eventType,
      payload: { event: eventType, data: payload } as Json,
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertError || !delivery) {
    log.error('[webhook-delivery] Failed to create delivery record', {
      webhookId,
      error: insertError?.message,
    });
    // Return 200 so QStash doesn't retry a DB write failure indefinitely
    return NextResponse.json({ ok: false, reason: 'db_insert_failed' });
  }

  const deliveryId = delivery.id;

  // SSRF guard: reject tenant URLs targeting private/loopback/link-local/cloud
  // metadata endpoints before any outbound request leaves the worker.
  try {
    await assertSafeUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      const reason = `Blocked unsafe webhook URL: ${err.message}`;
      log.warn('[webhook-delivery] Rejected unsafe URL', { deliveryId, webhookId, url, reason });
      await supabase
        .from('webhook_deliveries')
        .update({ status: 'failed', error_message: reason })
        .eq('id', deliveryId)
        .eq('tenant_id', tenantId); // rule #2: tenant-scope all service-role queries
      // rule #1: audit the blocked delivery
      await writeAuditLog(supabase, {
        tenant_id: tenantId,
        event_type: 'webhook.delivery_blocked',
        actor_type: 'system',
        actor_id: 'webhook-delivery-worker',
        description: `Webhook ${webhookId} delivery blocked — unsafe URL ${url}: ${err.message}`,
        affected_id: webhookId,
        metadata: { event_type: eventType, delivery_id: deliveryId, reason: 'ssrf_guard' },
      });
      // 200 so QStash does NOT retry a permanently-bad URL
      return NextResponse.json({ ok: false, reason: 'unsafe_url', delivery_id: deliveryId });
    }
    throw err;
  }

  // Decrypt secret and build signed headers
  let headers: ReturnType<typeof buildHeaders>;
  try {
    const rawSecret = decryptSecret(secretEnc);
    headers = buildHeaders({ secret: rawSecret, eventType, deliveryId, body });
  } catch (err) {
    log.error('[webhook-delivery] Secret decryption failed', {
      deliveryId,
      error: (err as Error).message,
    });
    await supabase
      .from('webhook_deliveries')
      .update({ status: 'failed', error_message: 'Secret decryption failed' })
      .eq('id', deliveryId)
      .eq('tenant_id', tenantId); // rule #2: tenant-scope all service-role queries
    return NextResponse.json({ ok: false, reason: 'decrypt_failed' });
  }

  // Deliver to tenant endpoint
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let deliveryError: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = res.status;
    // Cap stored response body at 512B — enough to debug a failure, small enough
    // to avoid persisting large/sensitive downstream payloads (RA-155)
    responseBody = (await res.text()).slice(0, 512);
  } catch (err) {
    deliveryError = (err as Error).message;
  }

  const succeeded = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

  const updatePayload: TablesUpdate<'webhook_deliveries'> = {
    status: succeeded ? 'delivered' : 'failed',
    response_status: responseStatus,
    response_body: responseBody,
    error_message: deliveryError,
    delivered_at: succeeded ? new Date().toISOString() : null,
  };

  await supabase
    .from('webhook_deliveries')
    .update(updatePayload)
    .eq('id', deliveryId)
    .eq('tenant_id', tenantId); // rule #2: tenant-scope all service-role queries

  // Audit the delivery outcome (rule #1: every state mutation is audited)
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: succeeded ? 'webhook.delivered' : 'webhook.delivery_failed',
    actor_type: 'system',
    actor_id: 'webhook-delivery-worker',
    description: `Webhook ${webhookId} delivery to ${url} ${succeeded ? 'succeeded' : 'failed'} (status ${responseStatus ?? 'none'})`,
    affected_id: webhookId,
    metadata: { event_type: eventType, response_status: responseStatus, delivery_id: deliveryId },
  });

  if (succeeded) {
    log.info('[webhook-delivery] Delivered', { deliveryId, webhookId, url, responseStatus });
    return NextResponse.json({ ok: true, delivery_id: deliveryId });
  }

  log.warn('[webhook-delivery] Delivery failed', {
    deliveryId,
    webhookId,
    url,
    responseStatus,
    error: deliveryError,
  });

  // Non-2xx triggers QStash retry (up to 3 attempts with exponential backoff)
  return NextResponse.json(
    { ok: false, delivery_id: deliveryId, responseStatus },
    { status: 500 }
  );
}
