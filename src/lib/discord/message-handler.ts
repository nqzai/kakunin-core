import { Message } from 'discord.js';

export interface DiscordMessagePayload {
  discord_user_id: string;
  discord_message_id: string;
  discord_thread_id: string | null;
  discord_guild_id: string;
  discord_channel_id: string;
  message_content: string;
  author_name: string;
  is_reply_to_bot: boolean;
}

export function extractMessagePayload(msg: Message): DiscordMessagePayload | null {
  // Ignore bot messages
  if (msg.author.bot) {
    return null;
  }

  // Ignore reactions and non-text messages
  if (!msg.content || msg.content.trim().length === 0) {
    return null;
  }

  return {
    discord_user_id: msg.author.id,
    discord_message_id: msg.id,
    discord_thread_id: msg.channel.isThread() ? msg.channelId : null,
    discord_guild_id: msg.guildId || '',
    discord_channel_id: msg.channelId,
    message_content: msg.content,
    author_name: msg.author.username,
    is_reply_to_bot: msg.mentions.has(msg.client.user?.id || ''),
  };
}

export function shouldProcessMessage(msg: Message, botUserId: string): boolean {
  // Skip bot messages
  if (msg.author.bot) {
    return false;
  }

  // Skip empty messages
  if (!msg.content || msg.content.trim().length === 0) {
    return false;
  }

  // Skip system messages
  if (msg.system) {
    return false;
  }

  // Process if: in thread OR mentioned bot OR replying to bot
  const isInThread = msg.channel.isThread();
  const isMentioned = msg.mentions.has(botUserId);
  const isReplyToBot = msg.reference && msg.reference.messageId
    ? msg.channel.messages.cache.get(msg.reference.messageId)?.author.id === botUserId
    : false;

  return isInThread || isMentioned || isReplyToBot;
}
