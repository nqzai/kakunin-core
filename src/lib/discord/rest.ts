/**
 * Discord REST API Client
 *
 * Thin wrapper for posting messages and adding reactions via Discord REST API.
 * Used by QStash worker — no persistent discord.js connection needed.
 *
 * Auth: Bot token from DISCORD_BOT_TOKEN env var.
 * Base URL: https://discord.com/api/v10
 */

const DISCORD_API = 'https://discord.com/api/v10';

function getBotToken(): string {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error('DISCORD_BOT_TOKEN not configured');
  return token;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  footer?: { text: string };
  timestamp?: string;
}

export interface PostMessageOptions {
  channelId: string;
  content?: string;
  embeds?: DiscordEmbed[];
  /** Reply to a specific message ID */
  replyToMessageId?: string;
}

export interface DiscordMessage {
  id: string;
  channel_id: string;
  content: string;
}

/**
 * Post a message to a Discord channel (or thread).
 * Returns the created message object including its ID (needed for reactions).
 */
export async function postMessage(opts: PostMessageOptions): Promise<DiscordMessage | null> {
  const token = getBotToken();
  const body: Record<string, unknown> = {};

  if (opts.content) body.content = opts.content;
  if (opts.embeds) body.embeds = opts.embeds;
  if (opts.replyToMessageId) {
    body.message_reference = { message_id: opts.replyToMessageId };
    body.allowed_mentions = { replied_user: false }; // avoid double ping
  }

  const res = await fetch(`${DISCORD_API}/channels/${opts.channelId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Discord post failed ${res.status}: ${err.slice(0, 200)}`);
  }

  return res.json() as Promise<DiscordMessage>;
}

/**
 * Add a reaction emoji to a message.
 * emoji should be the URL-encoded emoji string, e.g. encodeURIComponent('👍')
 */
export async function addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
  const token = getBotToken();
  const encoded = encodeURIComponent(emoji);

  const res = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    {
      method: 'PUT',
      headers: { Authorization: `Bot ${token}` },
    }
  );

  // 204 = success, 429 = rate limited (non-fatal)
  if (!res.ok && res.status !== 429) {
    const err = await res.text();
    throw new Error(`Discord reaction failed ${res.status}: ${err.slice(0, 100)}`);
  }
}

/**
 * Post an escalation notice to a channel, mentioning support role.
 * Used when bot response triggers needs_human_review flag.
 */
export async function postEscalation(opts: {
  channelId: string;
  supportRoleId: string;
  originalMessageId: string;
  reason: string;
  userDisplayName: string;
}): Promise<void> {
  const { channelId, supportRoleId, originalMessageId, reason, userDisplayName } = opts;

  await postMessage({
    channelId,
    content: `<@&${supportRoleId}> Human review needed`,
    embeds: [
      {
        title: '⚠️ Escalation Required',
        description: `**User:** ${userDisplayName}\n**Reason:** ${reason}\n\nReply in this thread to assist.`,
        color: 0xff6b6b, // red
        footer: { text: 'Kakunin Support Bot' },
        timestamp: new Date().toISOString(),
      },
    ],
    replyToMessageId: originalMessageId,
  });
}
