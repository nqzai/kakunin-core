/**
 * Discord Bot Client
 *
 * Persistent discord.js client with message handlers.
 * Runs on Railway (not Vercel). Handles DMs and guild messages,
 * extracting chat payloads and routing to OpenRouter via QStash.
 */

import { Client, Events, GatewayIntentBits, type GuildMember } from 'discord.js';
import { log } from '@/lib/logging';
import { extractMessagePayload, shouldProcessMessage } from './message-handler';

let client: Client | null = null;

/**
 * Initialize and return the Discord bot client.
 * Lazy-loads on first call; subsequent calls return the cached instance.
 *
 * @returns Discord client authenticated and ready to listen for events
 * @throws {Error} If DISCORD_BOT_TOKEN is not set
 */
export async function initializeDiscordClient(): Promise<Client> {
  if (client) {
    return client;
  }

  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN not set in environment');
  }

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  // Ready event
  client.once(Events.ClientReady, (readyClient) => {
    log.info('[discord] bot ready', { userId: readyClient.user?.id, username: readyClient.user?.username });
  });

  // Message create event
  client.on(Events.MessageCreate, async (msg) => {
    try {
      // Skip if shouldn't process
      if (!shouldProcessMessage(msg, client!.user?.id || '')) {
        return;
      }

      // Extract payload
      const payload = extractMessagePayload(msg);
      if (!payload) {
        return;
      }

      // Add reaction to indicate processing
      try {
        await msg.react('🤔');
      } catch (_err) {
        log.warn('[discord] failed to add reaction', { messageId: msg.id });
      }

      // Call Vercel directly — bypasses QStash (Railway cannot reach qstash.upstash.io)
      // DISCORD_HANDLER_SECRET is a shared Bearer token set in both Railway and Vercel/Doppler
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      const handlerSecret = process.env.DISCORD_HANDLER_SECRET;
      if (!appUrl || !handlerSecret) {
        throw new Error('NEXT_PUBLIC_APP_URL or DISCORD_HANDLER_SECRET not configured');
      }
      const handlerRes = await fetch(`${appUrl}/api/discord/handle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${handlerSecret}`,
        },
        body: JSON.stringify(payload),
      });

      if (!handlerRes.ok) {
        const errBody = await handlerRes.text().catch(() => '');
        throw new Error(`Handler returned ${handlerRes.status}: ${errBody.slice(0, 200)}`);
      }

      log.info('[discord] message dispatched to handler', {
        messageId: msg.id,
        userId: payload.discord_user_id,
      });
    } catch (err) {
      const e = err as Error & { cause?: unknown };
      log.error('[discord] message handler error', {
        error: e.message,
        cause: e.cause instanceof Error ? e.cause.message : String(e.cause ?? ''),
        stack: e.stack?.split('\n')[1]?.trim() ?? '',
      });
      try {
        await msg.reply('❌ An error occurred. Support has been notified.');
      } catch (replyErr) {
        log.error('[discord] failed to send error reply', { error: (replyErr as Error).message });
      }
    }
  });

  // Error event
  client.on(Events.Error, (error) => {
    log.error('[discord] client error', { error: error.message });
  });

  // Warn event
  client.on('warn', (warn) => {
    log.warn('[discord] client warn', { warn });
  });

  // Welcome DM + role assignment on new member join
  client.on(Events.GuildMemberAdd, async (member: GuildMember) => {
    try {
      // Assign "Agent Builder" role
      const role = member.guild.roles.cache.find(r => r.name === '🔐 Agent Builder');
      if (role) {
        await member.roles.add(role);
        log.info('[discord] assigned Agent Builder role', { userId: member.user.id });
      }

      // Send welcome DM
      await member.send(
        `🔐 Hey ${member.user.username}, welcome to Kakunin!\n\n` +
        `We build cryptographic identity + compliance infrastructure for AI agents — ` +
        `X.509 certs, behavioral monitoring, MiCA + EU AI Act reports, all via API.\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🚀 **3 things to do right now:**\n\n` +
        `1️⃣ Read 🚀│start-here — understand the community\n` +
        `2️⃣ Drop an intro in 🙋│introductions — tell us what you're building\n` +
        `3️⃣ Try the live demo (no API key needed):\n` +
        `   → https://huggingface.co/spaces/kakunin-ai/compliance-demo\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📖 Docs → https://kakunin.ai/docs\n` +
        `🔑 Free API key → https://kakunin.ai\n` +
        `📊 Dashboard → https://kakunin.ai/dashboard\n` +
        `⚡ OpenAPI spec → https://kakunin.ai/api/v1/openapi.json\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Got a question? Drop it in ❓│questions — we respond fast.\n\n` +
        `See you inside 👋\n— Palash & the Kakunin team`
      );
      log.info('[discord] welcome DM sent', { userId: member.user.id, tag: member.user.tag });
    } catch (err) {
      // User may have DMs disabled — non-fatal
      log.warn('[discord] welcome DM failed (DMs likely disabled)', {
        userId: member.user.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  // Login
  await client.login(token);

  return client;
}

export function getDiscordClient(): Client | null {
  return client;
}
