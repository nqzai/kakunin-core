import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { Webhook } from 'svix';
import { Client as QStashClient } from '@upstash/qstash';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';
import { getPublicAppUrl } from '@/lib/runtime/public-app-url';
import type { Json } from '@/types/database';

function getAutonomousReplyDispatchConfig(): { qstash: QStashClient; url: string } | null {
  const token = process.env.QSTASH_TOKEN;
  const appUrl = getPublicAppUrl();

  if (!token || !appUrl) {
    return null;
  }

  return {
    qstash: new QStashClient({ token }),
    url: `${appUrl}/api/internal/autonomous-reply`,
  };
}

/**
 * POST /api/webhooks/agentmail
 *
 * Receives inbound message events from AgentMail via Svix-signed webhooks.
 * Must return 200 synchronously — AgentMail retries on non-2xx.
 *
 * Verification: Svix HMAC using AGENTMAIL_WEBHOOK_SECRET.
 * Stores raw message metadata in audit_log, body in Supabase Storage.
 *
 * Event types handled:
 *   message.received — new inbound email to an agent inbox
 */

interface AgentMailMessage {
  from_: string[];
  inbox_id: string;
  thread_id: string;
  message_id: string;
  subject: string;
  preview: string;
  text: string | null;
  html: string | null;
  extracted_text: string | null;
  timestamp: string;
}

interface AgentMailWebhookPayload {
  event_type: string;
  event_id: string;
  message: AgentMailMessage;
}

export async function POST(req: NextRequest) {
  // Read raw body — Svix verifies against the raw bytes, not parsed JSON
  const rawBody = await req.text();

  const webhookSecret = process.env.AGENTMAIL_WEBHOOK_SECRET;
  if (!webhookSecret) {
    log.warn('[agentmail.webhook] AGENTMAIL_WEBHOOK_SECRET not set — skipping verification');
  } else {
    // Verify Svix signature
    const wh = new Webhook(webhookSecret);
    try {
      wh.verify(rawBody, {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
      });
    } catch {
      log.warn('[agentmail.webhook] Invalid Svix signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
  }

  let payload: AgentMailWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as AgentMailWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { event_type, event_id, message } = payload;

  // Only handle inbound messages
  if (event_type !== 'message.received') {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createServiceClient();

  // Look up agent by inbox_id to get tenant_id
  const { data: agent } = await supabase
    .from('agents')
    .select('id, tenant_id, name, inbox_address')
    .like('inbox_address', `%${message.inbox_id}%`)
    .maybeSingle();

  if (!agent) {
    // Inbox not mapped to any agent — log + ACK (don't retry)
    log.warn('[agentmail.webhook] No agent found for inbox', { inbox_id: message.inbox_id });
    return NextResponse.json({ ok: true });
  }

  // Write audit log — append-only record of every inbound message
  await writeAuditLog(supabase, {
    tenant_id: agent.tenant_id,
    event_type: 'agent.inbox.message_received',
    actor_type: 'agent',
    actor_id: agent.id,
    description: `Inbound email to "${agent.name}" from ${message.from_.join(', ')}: ${message.subject}`,
    affected_id: agent.id,
    metadata: {
      event_id,
      inbox_id: message.inbox_id,
      message_id: message.message_id,
      thread_id: message.thread_id,
      from: message.from_,
      subject: message.subject,
      preview: message.preview,
      timestamp: message.timestamp,
    } as Json,
  });

  // Store message body in Supabase Storage (encrypted at rest by Supabase)
  const storageKey = `${agent.tenant_id}/agent-mail/${agent.id}/${message.thread_id}/${message.message_id}.json`;
  const messageBody = JSON.stringify({
    event_id,
    message_id: message.message_id,
    thread_id: message.thread_id,
    from: message.from_,
    subject: message.subject,
    text: message.text,
    html: message.html,
    extracted_text: message.extracted_text,
    timestamp: message.timestamp,
  });

  const { error: storageError } = await supabase.storage
    .from('agent-messages')
    .upload(storageKey, messageBody, {
      contentType: 'application/json',
      upsert: false,
    });

  if (storageError) {
    // Storage failure is non-fatal — audit_log already written
    log.warn('[agentmail.webhook] Storage upload failed', {
      agentId: agent.id,
      error: storageError.message,
    });
  }

  log.info('[agentmail.webhook] Message received', {
    agentId: agent.id,
    tenantId: agent.tenant_id,
    messageId: message.message_id,
  });

  // Dispatch autonomous reply if feature flag is active — fire-and-forget via QStash
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('autonomous_reply_enabled')
    .eq('tenant_id', agent.tenant_id)
    .single();

  if (flags?.autonomous_reply_enabled) {
    const dispatchConfig = getAutonomousReplyDispatchConfig();

    if (!dispatchConfig) {
      log.warn('[agentmail.webhook] Autonomous reply dispatch is not configured', {
        agentId: agent.id,
        tenantId: agent.tenant_id,
        hasQstashToken: Boolean(process.env.QSTASH_TOKEN),
        hasAppUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      });
      return NextResponse.json({ ok: true });
    }

    try {
      await dispatchConfig.qstash.publishJSON({
        url: dispatchConfig.url,
        body: {
          tenantId: agent.tenant_id,
          agentId: agent.id,
          messageId: message.message_id,
          threadId: message.thread_id,
          inboxId: message.inbox_id,
          from: message.from_,
          subject: message.subject,
          storageKey: `${agent.tenant_id}/agent-mail/${agent.id}/${message.thread_id}/${message.message_id}.json`,
        },
        retries: 3,
      });
      log.info('[agentmail.webhook] Dispatched autonomous reply job', {
        agentId: agent.id,
        messageId: message.message_id,
      });
    } catch (err) {
      // Non-blocking — QStash failure must not fail the ACK
      log.warn('[agentmail.webhook] Failed to dispatch autonomous reply', {
        error: (err as Error).message,
      });
    }
  }

  // 200 ACK — must be synchronous
  return NextResponse.json({ ok: true });
}
