import { APIEmbed } from 'discord.js';

export interface FormattedResponse {
  content?: string;
  embeds?: APIEmbed[];
  split?: boolean;
}

export function formatChatResponse(
  content: string,
  needsHumanReview: boolean,
  escalationReason?: string
): FormattedResponse {
  // High-risk response requiring escalation
  if (needsHumanReview) {
    return {
      content: '⚠️ This requires human review. Escalating to support...',
      embeds: [
        {
          title: '🔒 Requires Support Review',
          description: content.slice(0, 2000),
          color: 0xff6b6b,
          fields: escalationReason
            ? [{ name: 'Reason', value: escalationReason, inline: false }]
            : [],
        },
      ],
    };
  }

  // Response fits in single message (≤2000 chars)
  if (content.length <= 1900) {
    return { content };
  }

  // Long response — use embed
  return {
    embeds: [
      {
        title: '📋 Response',
        description: content.slice(0, 4000),
        color: 0x4a90e2,
        footer: content.length > 4000
          ? { text: `Truncated (${content.length} chars total)` }
          : undefined,
      },
    ],
  };
}

export function formatErrorResponse(error: string): FormattedResponse {
  return {
    content: `❌ **Error**: ${error}\n\nPlease try again or contact support at #support-channel.`,
  };
}

export function formatEscalationThread(botName: string, userId: string): { name: string; reason: string } {
  const now = new Date().toISOString().split('T')[0];
  return {
    name: `escalation-${now}-${userId.slice(0, 8)}`,
    reason: `User ${userId} asked a question that requires human review (e.g., credential-related, confidentiality concern)`,
  };
}
