/**
 * Chat Processing Service
 *
 * Core chat logic extracted from /api/v1/chat so it can be called directly
 * by internal handlers (e.g. Discord) without an HTTP self-call.
 *
 * Callers are responsible for creating/resolving the conversation beforehand.
 */

import { createServiceClient } from '@/lib/supabase/server';
import { streamComplete, getModel } from '@/lib/openrouter/client';
import type { ChatMessage as OpenRouterChatMessage } from '@/lib/openrouter/client';
import { validateGuardrails, maskCredentials, CHAT_SYSTEM_PROMPT } from '@/lib/chat/guardrails';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { enqueueContentRiskScoring } from '@/lib/content-risk/dispatch';
import { log } from '@/lib/logging';
import type { StoredMessage } from '@/types/chat';

export interface ProcessChatInput {
  tenantId: string;
  conversationId: string;
  userMessage: string;
  context?: {
    source?: 'discord' | 'web' | 'api' | 'email';
    user_id?: string;
    thread_id?: string;
  };
}

export interface ProcessChatResult {
  content: string;
  tokensOut: number;
  needsReview: boolean;
}

/**
 * Runs guardrails → fetch history → call OpenRouter → persist messages → audit log.
 * Returns the accumulated response content and metadata.
 *
 * @throws {Error} On guardrail violation, OpenRouter failure, or DB write error
 */
export async function processChat(input: ProcessChatInput): Promise<ProcessChatResult> {
  const { tenantId, conversationId, userMessage, context } = input;
  const supabase = createServiceClient();

  // ── Guardrails ────────────────────────────────────────────────────────────
  const guardCheck = validateGuardrails(userMessage);
  if (!guardCheck.valid) {
    // Return guardrail error as content — callers format it appropriately
    return {
      content: guardCheck.error ?? 'Message blocked by content policy.',
      tokensOut: 0,
      needsReview: false,
    };
  }

  // ── Fetch conversation history (last 10 turns) ─────────────────────────
  const { data: history, error: historyErr } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId) // rule #2: tenant-scope all service-role queries
    .order('created_at', { ascending: true })
    .limit(10);

  if (historyErr) {
    log.error('[chat/process] history fetch error', {
      conversationId,
      error: historyErr.message,
    });
    throw new Error('Failed to fetch conversation history');
  }

  const historyMessages: OpenRouterChatMessage[] = ((history as StoredMessage[]) ?? [])
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  const messages: OpenRouterChatMessage[] = [
    { role: 'system', content: CHAT_SYSTEM_PROMPT },
    ...historyMessages,
    { role: 'user', content: userMessage },
  ];

  // ── Stream response from OpenRouter ───────────────────────────────────────
  let accumulatedContent = '';
  let tokensOut = 0;

  const stream = await streamComplete(
    {
      model: getModel('discord_chat') || 'anthropic/claude-sonnet-4-5',
      messages,
      temperature: 0.3,
      maxTokens: 800,
    },
    getModel('debug_assistant_fallback') || 'deepseek/deepseek-v4-flash:free'
  );

  const reader = stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulatedContent += new TextDecoder().decode(value);
    tokensOut += Math.ceil(value.length / 4);
  }

  const needsReview =
    /secret|credential|private.*key|password|confidential|not.*authorized|permission.*denied|sensitive/i.test(
      accumulatedContent
    );

  const maskedContent = maskCredentials(accumulatedContent);

  // ── Persist messages ──────────────────────────────────────────────────────
  const tokensIn = Math.ceil(userMessage.length / 4);

  const { error: userMsgErr } = await supabase.from('chat_messages').insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    role: 'user',
    content: userMessage,
    tokens_in: tokensIn,
    model_used: 'user-input',
    created_at: new Date().toISOString(),
  });
  if (userMsgErr) {
    log.warn('[chat/process] user message write error', { conversationId, error: userMsgErr.message });
  }

  const { data: assistantMsg, error: assistantMsgErr } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      tenant_id: tenantId,
      role: 'assistant',
      content: maskedContent,
      tokens_out: tokensOut,
      model_used: getModel('discord_chat') || 'claude-sonnet-4-5',
      needs_human_review: needsReview,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();
  if (assistantMsgErr) {
    log.warn('[chat/process] assistant message write error', { conversationId, error: assistantMsgErr.message });
  }

  // ── Content-risk scoring (EU AI Act Art. 5) ────────────────────────────────
  // Score what the AGENT said for manipulation/deception, off the hot path via
  // QStash. Only when the conversation is bound to an agent (Discord/web agents
  // have one; ad-hoc API chats may not). Enqueue is fire-and-forget — a publish
  // failure must never break the chat response.
  const { data: convo } = await supabase
    .from('conversations')
    .select('agent_id')
    .eq('id', conversationId)
    .eq('tenant_id', tenantId) // rule #2
    .maybeSingle();
  if (convo?.agent_id && maskedContent.trim()) {
    try {
      await enqueueContentRiskScoring({
        tenantId,
        agentId: convo.agent_id,
        text: maskedContent,
        source: context?.source ?? 'chat',
        messageId: assistantMsg?.id,
      });
    } catch (err) {
      log.warn('[chat/process] content-risk enqueue failed', { conversationId, error: (err as Error).message });
    }
  }

  // ── Audit logs ────────────────────────────────────────────────────────────
  await Promise.all([
    writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'chat.message_sent',
      actor_type: 'user',
      actor_id: context?.user_id || 'anonymous',
      description: 'User sent chat message',
      affected_id: conversationId,
      metadata: {
        source: context?.source || 'api',
        thread_id: context?.thread_id,
        tokens_in: tokensIn,
      },
    }),
    writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'chat.response_generated',
      actor_type: 'agent',
      actor_id: 'system',
      description: 'Autonomous chat response generated',
      affected_id: conversationId,
      metadata: {
        model: getModel('discord_chat') || 'claude-sonnet-4-5',
        tokens_out: tokensOut,
        needs_human_review: needsReview,
      },
    }),
  ]);

  // Update conversation last_message_at
  const { error: convoUpdateError } = await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', conversationId)
    .eq('tenant_id', tenantId); // rule #2: tenant-scope all service-role queries
  if (convoUpdateError) {
    log.warn('[chat/process] conversation update failed', { conversationId, error: convoUpdateError.message });
  }

  log.info('[chat/process] response generated', { tenantId, conversationId, tokensOut });

  return { content: accumulatedContent, tokensOut, needsReview };
}
