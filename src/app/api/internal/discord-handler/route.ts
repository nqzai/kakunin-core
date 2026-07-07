import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseQStashBody } from '@/lib/api/validation';
import { createServiceClient } from '@/lib/supabase/server';
import { formatChatResponse } from '@/lib/discord/formatter';
import { checkDiscordRateLimit } from '@/lib/discord/rate-limiter';
import { postMessage, addReaction, postEscalation } from '@/lib/discord/rest';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import type { DiscordMessagePayload } from '@/lib/discord/message-handler';

export const maxDuration = 30;

const payloadSchema = z.object({
  discord_user_id: z.string(),
  discord_message_id: z.string(),
  discord_thread_id: z.string().nullable(),
  discord_guild_id: z.string(),
  discord_channel_id: z.string(),
  message_content: z.string(),
  author_name: z.string(),
  is_reply_to_bot: z.boolean().optional(),
});

/**
 * POST /api/internal/discord-handler
 *
 * QStash async worker for processing Discord messages.
 *
 * Flow:
 * 1. Verify QStash signature
 * 2. Rate limit check (5 req/min per Discord user, Upstash Redis)
 * 3. Map Discord thread → conversation ID
 * 4. Call POST /api/v1/chat with message + history
 * 5. Stream and accumulate response
 * 6. Post response to Discord via REST API
 * 7. Add 👍 ❌ reactions for feedback
 * 8. Escalate if needs_human_review (@ support role)
 * 9. Audit log
 */

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, payloadSchema);
  if (!parsed.ok) {
    log.warn('[discord-handler] QStash verification or validation failed');
    return parsed.response;
  }

  const payload = parsed.data as DiscordMessagePayload;
  const supabase = createServiceClient();
  // Post channel: thread if in thread, otherwise the channel itself
  const postChannelId = payload.discord_thread_id ?? payload.discord_channel_id;

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const rl = await checkDiscordRateLimit(payload.discord_user_id);
  if (!rl.allowed) {
    const resetSecs = Math.ceil((rl.resetAt - Date.now()) / 1000);
    log.warn('[discord-handler] rate limit exceeded', { userId: payload.discord_user_id });

    // Notify user in Discord
    try {
      await postMessage({
        channelId: postChannelId,
        content: `⏳ Slow down! You've hit the rate limit. Try again in ${resetSecs}s.`,
        replyToMessageId: payload.discord_message_id,
      });
    } catch (postErr) {
      log.warn('[discord-handler] failed to send rate limit message', {
        error: (postErr as Error).message,
      });
    }

    return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
  }

  try {
    // ── Resolve tenant from Discord guild ID ───────────────────────────────────
    const { data: tenantRow } = await supabase
      .from('tenants')
      .select('id')
      .eq('discord_guild_id', payload.discord_guild_id)
      .maybeSingle();

    if (!tenantRow) {
      log.warn('[discord-handler] no tenant for guild', { guildId: payload.discord_guild_id });
      return NextResponse.json({ error: 'Tenant not found for guild' }, { status: 404 });
    }

    const tenantId = tenantRow.id;

    // ── Map Discord thread → conversation ──────────────────────────────────────
    const threadId = payload.discord_thread_id || payload.discord_channel_id;

    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id, tenant_id')
      .eq('external_thread_id', threadId)
      .single();

    let conversationId: string;

    if (existingConv) {
      conversationId = existingConv.id;
    } else {
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({
          tenant_id: tenantId,
          source: 'discord',
          external_thread_id: threadId,
          external_message_id: payload.discord_message_id,
          user_id: payload.discord_user_id,
          status: 'active',
        })
        .select('id, tenant_id')
        .single();

      if (createErr || !newConv) {
        log.error('[discord-handler] conversation create error', { error: createErr?.message });
        throw new Error('Failed to create conversation');
      }

      conversationId = newConv.id;

      // Log conversation creation from Discord
      await writeAuditLog(supabase, {
        tenant_id: tenantId,
        event_type: 'conversation.created',
        actor_type: 'user',
        actor_id: payload.discord_user_id,
        description: 'Conversation initiated from Discord',
        affected_id: conversationId,
        metadata: {
          source: 'discord',
          discord_user_id: payload.discord_user_id,
          discord_guild_id: payload.discord_guild_id,
          discord_channel_id: payload.discord_channel_id,
          discord_thread_id: threadId,
        },
      });
    }

    // ── Call chat API ─────────────────────────────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const chatApiUrl = `${appUrl}/api/v1/chat`;
    const apiKey = process.env.KAKUNIN_API_KEY;

    if (!apiKey) {
      log.error('[discord-handler] KAKUNIN_API_KEY not set');
      throw new Error('API key not configured');
    }

    const chatResponse = await fetch(chatApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-tenant-id': tenantId,
      },
      body: JSON.stringify({
        conversation_id: conversationId,
        messages: [{ role: 'user', content: payload.message_content }],
        context: {
          source: 'discord',
          user_id: payload.discord_user_id,
          thread_id: threadId,
        },
      }),
    });

    if (!chatResponse.ok) {
      const errText = await chatResponse.text();
      log.error('[discord-handler] chat API error', {
        status: chatResponse.status,
        error: errText.slice(0, 200),
      });
      throw new Error(`Chat API returned ${chatResponse.status}`);
    }

    // Accumulate streamed response
    const reader = chatResponse.body?.getReader();
    if (!reader) throw new Error('No response body from chat API');

    let responseContent = '';
    let tokensOut = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = new TextDecoder().decode(value);
      responseContent += chunk;
      tokensOut += Math.ceil(chunk.length / 4);
    }

    log.info('[discord-handler] chat response received', {
      conversationId,
      contentLength: responseContent.length,
      tokensOut,
    });

    // ── Escalation detection ──────────────────────────────────────────────────
    const needsReview = /secret|credential|private.*key|password|confidential|not.*authorized|permission.*denied|sensitive/i.test(
      responseContent
    );

    // ── Post to Discord ───────────────────────────────────────────────────────
    const formatted = formatChatResponse(responseContent, needsReview);

    const postedMsg = await postMessage({
      channelId: postChannelId,
      content: formatted.content,
      embeds: formatted.embeds,
      replyToMessageId: payload.discord_message_id,
    });

    log.info('[discord-handler] response posted to Discord', {
      conversationId,
      messageId: postedMsg?.id,
      needsReview,
    });

    // ── Reactions for feedback ────────────────────────────────────────────────
    if (postedMsg) {
      try {
        await addReaction(postChannelId, postedMsg.id, '👍');
        await addReaction(postChannelId, postedMsg.id, '❌');
      } catch (reactionErr) {
        // Non-fatal — log and continue
        log.warn('[discord-handler] reaction add failed', {
          error: (reactionErr as Error).message,
        });
      }
    }

    // ── Escalation: @ support role if needs human review ──────────────────────
    if (needsReview) {
      const supportRoleId = process.env.DISCORD_SUPPORT_ROLE_ID;
      if (supportRoleId) {
        try {
          await postEscalation({
            channelId: postChannelId,
            supportRoleId,
            originalMessageId: payload.discord_message_id,
            reason: 'Bot response flagged for human review (sensitive content detected)',
            userDisplayName: payload.author_name,
          });

          // Audit log the escalation
          await writeAuditLog(supabase, {
            tenant_id: tenantId,
            event_type: 'chat.escalated',
            actor_type: 'system',
            actor_id: 'discord-handler',
            description: `Discord message escalated for human review`,
            affected_id: conversationId,
            metadata: {
              source: 'discord',
              discord_user_id: payload.discord_user_id,
              thread_id: threadId,
              conversation_id: conversationId,
            },
          });
        } catch (escalateErr) {
          log.warn('[discord-handler] escalation failed', {
            error: (escalateErr as Error).message,
          });
        }
      } else {
        log.warn('[discord-handler] DISCORD_SUPPORT_ROLE_ID not set — skipping escalation');
      }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'chat.discord_response_sent',
      actor_type: 'system',
      actor_id: 'discord-handler',
      description: `Discord bot response sent to user ${payload.discord_user_id}`,
      affected_id: conversationId,
      metadata: {
        source: 'discord',
        discord_user_id: payload.discord_user_id,
        discord_message_id: payload.discord_message_id,
        thread_id: threadId,
        tokens_out: tokensOut,
        needs_review: needsReview,
      },
    });

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message_id: payload.discord_message_id,
      bot_message_id: postedMsg?.id,
      needs_review: needsReview,
      response_preview: responseContent.slice(0, 100),
    });
  } catch (err) {
    log.error('[discord-handler] processing error', { error: (err as Error).message });

    // Try to notify user in Discord that something went wrong
    try {
      await postMessage({
        channelId: postChannelId,
        content: '❌ Something went wrong. Support has been notified.',
        replyToMessageId: payload.discord_message_id,
      });
    } catch {
      // Best-effort — don't throw
    }

    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
