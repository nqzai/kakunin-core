import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { complete, getModel } from '@/lib/openrouter/client';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';
import { parseQStashBody } from '@/lib/api/validation';

/**
 * POST /api/internal/autonomous-reply
 *
 * QStash worker — generates and sends an autonomous compliance email reply.
 * Triggered by /api/webhooks/agentmail when autonomous_reply_enabled = true.
 *
 * Flow:
 *   1. Fetch message body from Supabase Storage
 *   2. Classify intent via OpenRouter claude-sonnet-4-5
 *   3. Generate compliant reply draft
 *   4. Send via AgentMail API
 *   5. Write audit_log: agent.inbox.reply_sent
 *
 * Feature-flagged: only runs when feature_flags.autonomous_reply_enabled = true.
 * All replies are logged — human can review or override in dashboard.
 *
 * Retries: 3 (QStash default). Idempotent via message_id check in audit_log.
 */

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  messageId: z.string(),
  threadId: z.string(),
  inboxId: z.string(),
  from: z.array(z.string()),
  subject: z.string(),
  storageKey: z.string(),
});

// Email intent classification for compliance context
const INTENT_LABELS = [
  'certificate_verification',
  'compliance_report_request',
  'agent_behaviour_inquiry',
  'revocation_inquiry',
  'general_inquiry',
  'out_of_scope',
] as const;

type Intent = (typeof INTENT_LABELS)[number];

const INTENT_DESCRIPTIONS: Record<Intent, string> = {
  certificate_verification: 'Sender is asking to verify an agent certificate',
  compliance_report_request: 'Sender wants a compliance report or audit export',
  agent_behaviour_inquiry: 'Sender is asking about an agent behaviour event or risk score',
  revocation_inquiry: 'Sender is asking about a certificate revocation',
  general_inquiry: 'General question about the platform or service',
  out_of_scope: 'Not a compliance or platform-related email',
};

export async function POST(req: NextRequest) {
  const result = await parseQStashBody(req, bodySchema);
  if (!result.ok) return result.response;

  const { tenantId, agentId, messageId, threadId, inboxId, from, subject, storageKey } = result.data;
  const supabase = createServiceClient();

  // Idempotency: skip if reply already sent for this message
  const { count } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('event_type', 'agent.inbox.reply_sent')
    .contains('metadata', { message_id: messageId });

  if ((count ?? 0) > 0) {
    log.info('[autonomous-reply] Already replied to message — skipping', { messageId });
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Confirm feature flag still active (could have been disabled since dispatch)
  const { data: flags } = await supabase
    .from('feature_flags')
    .select('autonomous_reply_enabled')
    .eq('tenant_id', tenantId)
    .single();

  if (!flags?.autonomous_reply_enabled) {
    log.info('[autonomous-reply] Feature flag disabled — skipping', { tenantId });
    return NextResponse.json({ ok: true, skipped: true });
  }

  // Fetch message body from Storage
  let messageText = '';
  const { data: storageData, error: storageErr } = await supabase.storage
    .from('agent-messages')
    .download(storageKey);

  if (!storageErr && storageData) {
    try {
      const text = await storageData.text();
      const parsed = JSON.parse(text) as { extracted_text?: string; text?: string };
      messageText = parsed.extracted_text ?? parsed.text ?? '';
    } catch {
      log.warn('[autonomous-reply] Failed to parse storage message', { storageKey });
    }
  }

  const messageBody = messageText || `Subject: ${subject}\n(Full message body unavailable)`;

  // Step 1: Classify intent
  let intent: Intent = 'general_inquiry';
  try {
    const classifyResult = await complete({
      model: getModel('compliance_report'),
      messages: [
        {
          role: 'system',
          content: `You are a compliance email classifier for Kakunin, an AI agent identity and compliance platform.
Classify the intent of inbound emails into exactly one of these categories:
${INTENT_LABELS.map((l) => `- ${l}: ${INTENT_DESCRIPTIONS[l]}`).join('\n')}

Respond with ONLY the category name, nothing else.`,
        },
        {
          role: 'user',
          content: `Subject: ${subject}\n\n${messageBody}`,
        },
      ],
      temperature: 0,
      maxTokens: 30,
    });
    const classified = classifyResult.content.trim().toLowerCase() as Intent;
    if (INTENT_LABELS.includes(classified as Intent)) {
      intent = classified as Intent;
    }
  } catch (err) {
    log.warn('[autonomous-reply] Classification failed — defaulting to general_inquiry', {
      error: (err as Error).message,
    });
  }

  // Out-of-scope: do not reply
  if (intent === 'out_of_scope') {
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'agent.inbox.reply_skipped',
      actor_type: 'system',
      actor_id: 'autonomous-reply-worker',
      description: `Inbound email classified as out_of_scope — no reply sent`,
      affected_id: agentId,
      metadata: { message_id: messageId, thread_id: threadId, intent } as Json,
    });
    return NextResponse.json({ ok: true, intent, reply_sent: false });
  }

  // Step 2: Generate compliant reply
  let replyBody = '';
  try {
    const replyResult = await complete({
      model: getModel('compliance_report'),
      messages: [
        {
          role: 'system',
          content: `You are a compliance communications assistant for Kakunin — an AI agent identity and compliance platform (kakunin.ai).

You are replying to an inbound email classified as: "${intent}" (${INTENT_DESCRIPTIONS[intent]}).

Write a professional, concise reply that:
1. Acknowledges the inquiry
2. Provides factual information based on the classification — do not fabricate specifics you don't have
3. Directs the sender to the appropriate resource (dashboard, documentation, or support email)
4. Is written in formal business English
5. Ends with: "For urgent matters, contact ai@kakunin.ai directly."

Keep the reply under 200 words. No greetings or sign-offs — those are added by the system.`,
        },
        {
          role: 'user',
          content: `Original email:\nSubject: ${subject}\n\n${messageBody}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 400,
    });
    replyBody = replyResult.content.trim();
  } catch (err) {
    log.error('[autonomous-reply] Reply generation failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'LLM generation failed' }, { status: 500 });
  }

  // Step 3: Send reply via AgentMail API
  const agentMailApiKey = process.env.AGENTMAIL_API_KEY;
  if (!agentMailApiKey) {
    log.error('[autonomous-reply] AGENTMAIL_API_KEY not set');
    return NextResponse.json({ error: 'AgentMail not configured' }, { status: 503 });
  }

  const replySubject = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
  const replyHtml = `<p>${replyBody.replace(/\n/g, '<br/>')}</p>
<p style="color:#888;font-size:12px;">— Kakunin Compliance Team &lt;ai@kakunin.ai&gt;</p>`;

  let replyMessageId: string | null = null;
  try {
    const sendRes = await fetch('https://api.agentmail.to/v0/inboxes/' + inboxId + '/threads/' + threadId + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${agentMailApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: from,
        subject: replySubject,
        text: replyBody + '\n\n— Kakunin Compliance Team',
        html: replyHtml,
      }),
    });

    if (!sendRes.ok) {
      const errText = await sendRes.text();
      throw new Error(`AgentMail send failed: ${sendRes.status} ${errText}`);
    }

    const sendData = await sendRes.json() as { message_id?: string };
    replyMessageId = sendData.message_id ?? null;
  } catch (err) {
    log.error('[autonomous-reply] AgentMail send failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Failed to send reply' }, { status: 502 });
  }

  // Step 4: Audit log — every reply written for human review
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.inbox.reply_sent',
    actor_type: 'system',
    actor_id: 'autonomous-reply-worker',
    description: `Autonomous compliance reply sent to ${from.join(', ')} — intent: ${intent}`,
    affected_id: agentId,
    metadata: {
      message_id: messageId,
      reply_message_id: replyMessageId,
      thread_id: threadId,
      inbox_id: inboxId,
      intent,
      subject: replySubject,
      reply_preview: replyBody.slice(0, 200),
    } as Json,
  });

  log.info('[autonomous-reply] Reply sent', {
    tenantId,
    agentId,
    messageId,
    intent,
    replyMessageId,
  });

  return NextResponse.json({ ok: true, intent, reply_sent: true, reply_message_id: replyMessageId });
}
