import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { processChat } from '@/lib/chat/process';
import { formatChatResponse } from '@/lib/discord/formatter';
import { checkDiscordRateLimit } from '@/lib/discord/rate-limiter';
import { postMessage, addReaction, postEscalation } from '@/lib/discord/rest';
import { log } from '@/lib/logging';
import { isValidBearerSecret } from '@/lib/security/bearer-auth';
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
 * POST /api/discord/handle
 *
 * Direct-call handler for the Railway Discord bot.
 * Auth: Authorization: Bearer {DISCORD_HANDLER_SECRET}
 *
 * Calls processChat() directly — no HTTP self-call to /api/v1/chat.
 * This avoids auth header stripping on redirects (kakunin.ai → www.kakunin.ai)
 * and removes the dependency on KAKUNIN_API_KEY at runtime.
 */
export async function POST(req: NextRequest) {
  // Bearer token auth — shared secret between Railway bot and Vercel
  const secret = process.env.DISCORD_HANDLER_SECRET;

  if (!secret) {
    log.error('[discord-handle] DISCORD_HANDLER_SECRET not configured');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 503 });
  }

  // Constant-time comparison — avoids leaking the secret via response timing.
  if (!isValidBearerSecret(req.headers.get('authorization'), secret)) {
    log.warn('[discord-handle] unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse and validate payload
  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const body = payloadSchema.safeParse(parsedBody);
  if (!body.success) {
    log.warn('[discord-handle] validation error', { error: body.error.message });
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const payload = body.data as DiscordMessagePayload;
  const supabase = createServiceClient();
  const postChannelId = payload.discord_thread_id ?? payload.discord_channel_id;

  // ── Rate limit ─────────────────────────────────────────────────────────────
  const rl = await checkDiscordRateLimit(payload.discord_user_id);
  if (!rl.allowed) {
    const resetSecs = Math.ceil((rl.resetAt - Date.now()) / 1000);
    log.warn('[discord-handle] rate limit exceeded', { userId: payload.discord_user_id });
    try {
      await postMessage({
        channelId: postChannelId,
        content: `⏳ Slow down! You've hit the rate limit. Try again in ${resetSecs}s.`,
        replyToMessageId: payload.discord_message_id,
      });
    } catch (postErr) {
      log.warn('[discord-handle] failed to send rate limit message', {
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
      log.warn('[discord-handle] no tenant for guild', { guildId: payload.discord_guild_id });
      await postMessage({
        channelId: postChannelId,
        content: '❌ This Discord server is not linked to a Kakunin account. Visit kakunin.ai to sign up.',
        replyToMessageId: payload.discord_message_id,
      });
      return NextResponse.json({ error: 'Tenant not found for guild' }, { status: 404 });
    }

    const tenantId = tenantRow.id;
    const threadId = payload.discord_thread_id || payload.discord_channel_id;

    // ── Map Discord thread → conversation ──────────────────────────────────────
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
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
        .select('id')
        .single();

      if (createErr || !newConv) {
        log.error('[discord-handle] conversation create error', { error: createErr?.message });
        throw new Error('Failed to create conversation');
      }

      conversationId = newConv.id;
    }

    // ── Process chat — direct lib call, no HTTP self-call ─────────────────────
    const chatResult = await processChat({
      tenantId,
      conversationId,
      userMessage: payload.message_content,
      context: {
        source: 'discord',
        user_id: payload.discord_user_id,
        thread_id: threadId,
      },
    });

    log.info('[discord-handle] chat processed', {
      conversationId,
      contentLength: chatResult.content.length,
      tokensOut: chatResult.tokensOut,
    });

    // ── Post to Discord ───────────────────────────────────────────────────────
    const formatted = formatChatResponse(chatResult.content, chatResult.needsReview);

    const postedMsg = await postMessage({
      channelId: postChannelId,
      content: formatted.content,
      embeds: formatted.embeds,
      replyToMessageId: payload.discord_message_id,
    });

    log.info('[discord-handle] response posted to Discord', {
      conversationId,
      messageId: postedMsg?.id,
      needsReview: chatResult.needsReview,
    });

    // ── Reactions for feedback ────────────────────────────────────────────────
    if (postedMsg) {
      try {
        await addReaction(postChannelId, postedMsg.id, '👍');
        await addReaction(postChannelId, postedMsg.id, '❌');
      } catch (reactionErr) {
        log.warn('[discord-handle] reaction add failed', {
          error: (reactionErr as Error).message,
        });
      }
    }

    // ── Escalation: @ support role if needs human review ─────────────────────
    if (chatResult.needsReview) {
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

          await writeAuditLog(supabase, {
            tenant_id: tenantId,
            event_type: 'chat.escalated',
            actor_type: 'system',
            actor_id: 'discord-handler',
            description: 'Discord message escalated for human review',
            affected_id: conversationId,
            metadata: {
              source: 'discord',
              discord_user_id: payload.discord_user_id,
              thread_id: threadId,
              conversation_id: conversationId,
            },
          });
        } catch (escalateErr) {
          log.warn('[discord-handle] escalation failed', {
            error: (escalateErr as Error).message,
          });
        }
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
        tokens_out: chatResult.tokensOut,
        needs_review: chatResult.needsReview,
      },
    });

    return NextResponse.json({
      success: true,
      conversation_id: conversationId,
      message_id: payload.discord_message_id,
      bot_message_id: postedMsg?.id,
      needs_review: chatResult.needsReview,
    });
  } catch (err) {
    const errMsg = (err as Error).message;
    log.error('[discord-handle] processing error', { error: errMsg, stack: (err as Error).stack?.split('\n')[1]?.trim() });

    try {
      await postMessage({
        channelId: postChannelId,
        content: '❌ Something went wrong. Support has been notified.',
        replyToMessageId: payload.discord_message_id,
      });
    } catch (msgErr) {
      log.warn('[discord.handle] best-effort error reply failed', {
        channelId: postChannelId,
        error: msgErr instanceof Error ? msgErr.message : String(msgErr),
      });
    }

    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
