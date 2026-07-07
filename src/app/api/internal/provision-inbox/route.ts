import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { getInboxProvider } from '@/lib/inbox';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { parseQStashBody } from '@/lib/api/validation';
import { log } from '@/lib/logging';

/**
 * POST /api/internal/provision-inbox (QStash worker)
 *
 * Provisions an email inbox for an agent via the active IInboxProvider.
 * Provider is controlled by INBOX_PROVIDER env var (default: agentmail).
 *
 * Flow:
 *   1. Set inbox_status = 'provisioning' on the agents row
 *   2. Call provider.provision() — throws on failure → QStash retries
 *   3. On success: store address, set inbox_status = 'active', audit_log
 *   4. On terminal failure (QStash sets X-Qstash-Retries header at max):
 *      set inbox_status = 'failed', audit_log(agent.inbox_provision_failed)
 *
 * Returns 500 on provider failure → QStash exponential backoff.
 * Returns 200 on success or non-retryable errors (agent not found).
 */

const payloadSchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  agentName: z.string().trim().min(1).max(200),
});

// QStash sends this header when it has exhausted all retry attempts
const QSTASH_RETRIES_HEADER = 'x-qstash-retries';
const MAX_RETRIES = 3;

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, payloadSchema);
  if (!parsed.ok) return parsed.response;

  const { tenantId, agentId, agentName } = parsed.data;

  // Detect QStash retry count — header value is the attempt number (0-indexed)
  const retryHeader = req.headers.get(QSTASH_RETRIES_HEADER);
  const attemptNumber = retryHeader ? parseInt(retryHeader, 10) : 0;
  const isLastAttempt = attemptNumber >= MAX_RETRIES;

  const supabase = createServiceClient();

  // Idempotency guard — skip if already active
  const { data: agent } = await supabase
    .from('agents')
    .select('id, inbox_address, inbox_status')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (!agent) {
    log.error('[provision-inbox] Agent not found', { agentId, tenantId });
    return NextResponse.json({ ok: false });
  }

  if (agent.inbox_status === 'active' && agent.inbox_address) {
    log.info('[provision-inbox] Already active — idempotent skip', { agentId });
    return NextResponse.json({ ok: true, inbox_address: agent.inbox_address });
  }

  // Mark as provisioning (visible in dashboard immediately)
  await supabase
    .from('agents')
    .update({ inbox_status: 'provisioning', updated_at: new Date().toISOString() })
    .eq('id', agentId)
    .eq('tenant_id', tenantId);

  // Provision via active provider
  const provider = getInboxProvider();

  let result;
  try {
    result = await provider.provision(agentId, agentName);
  } catch (err) {
    log.error('[provision-inbox] Provider failed', {
      agentId,
      provider: process.env.INBOX_PROVIDER ?? 'agentmail',
      attempt: attemptNumber,
      error: (err as Error).message,
    });

    if (isLastAttempt) {
      // All retries exhausted — mark as failed, write dead-letter audit event
      await supabase
        .from('agents')
        .update({ inbox_status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .eq('tenant_id', tenantId);

      await writeAuditLog(supabase, {
        tenant_id: tenantId,
        event_type: 'agent.inbox_provision_failed',
        actor_type: 'system',
        actor_id: 'provision-inbox-worker',
        description: `Inbox provisioning failed after ${MAX_RETRIES + 1} attempts for agent "${agentName}"`,
        affected_id: agentId,
        metadata: {
          provider: process.env.INBOX_PROVIDER ?? 'agentmail',
          error: (err as Error).message,
          attempts: attemptNumber + 1,
        },
      });

      log.error('[provision-inbox] Dead-letter: inbox_status set to failed', { agentId });
      // Return 200 on last attempt — QStash won't retry further anyway
      return NextResponse.json({ ok: false, failed: true });
    }

    // Return 500 to trigger QStash retry with exponential backoff
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Store address + mark active
  const { error: updateError } = await supabase
    .from('agents')
    .update({
      inbox_address: result.address,
      inbox_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', agentId)
    .eq('tenant_id', tenantId);

  if (updateError) {
    log.error('[provision-inbox] DB update failed', { agentId, error: updateError.message });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.inbox.provisioned',
    actor_type: 'system',
    actor_id: 'provision-inbox-worker',
    description: `Inbox provisioned for agent "${agentName}" via ${result.provider}: ${result.address}`,
    affected_id: agentId,
    metadata: {
      inbox_address: result.address,
      inbox_id: result.inboxId ?? null,
      provider: result.provider,
    },
  });

  log.info('[provision-inbox] Inbox provisioned', {
    agentId,
    address: result.address,
    provider: result.provider,
  });
  return NextResponse.json({ ok: true, inbox_address: result.address });
}
