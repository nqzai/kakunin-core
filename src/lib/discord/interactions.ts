/**
 * Discord Interactions Helpers
 *
 * Ed25519 signature verification + interaction response builders.
 * Used by the /api/integrations/discord/interactions webhook endpoint.
 */

export const INTERACTION_TYPE = {
  PING: 1,
  APPLICATION_COMMAND: 2,
} as const;

export const INTERACTION_CALLBACK_TYPE = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
} as const;

export const COMMAND_OPTION_TYPE = {
  STRING: 3,
} as const;

export interface InteractionOption {
  name: string;
  type: number;
  value: string;
}

export interface Interaction {
  id: string;
  type: number;
  data?: {
    name: string;
    options?: InteractionOption[];
  };
  guild_id?: string;
  channel_id?: string;
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
  token: string;
}

export type InteractionResponse =
  | { type: 1 }  // PONG
  | { type: 4; data: { content: string; flags?: number; embeds?: unknown[] } };

/**
 * Verify Ed25519 signature from Discord.
 * Discord sends X-Signature-Ed25519 and X-Signature-Timestamp headers.
 * Fails if DISCORD_PUBLIC_KEY is not set.
 */
export async function verifyDiscordRequest(
  rawBody: string,
  signature: string,
  timestamp: string,
): Promise<boolean> {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) {
    console.error('[discord-interactions] DISCORD_PUBLIC_KEY not set');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const message = encoder.encode(timestamp + rawBody);

    const sigBytes = hexToUint8Array(signature);
    const keyBytes = hexToUint8Array(publicKey);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'Ed25519' },
      false,
      ['verify'],
    );

    return await crypto.subtle.verify({ name: 'Ed25519' }, cryptoKey, sigBytes, message);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

/** Return ephemeral message (only visible to invoking user). */
export function ephemeralReply(content: string): InteractionResponse {
  return {
    type: INTERACTION_CALLBACK_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: { content, flags: 64 },
  };
}

/** Return ephemeral message with an embed. */
export function ephemeralEmbedReply(
  content: string,
  embed: { title: string; description: string; color?: number },
): InteractionResponse {
  return {
    type: INTERACTION_CALLBACK_TYPE.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      content,
      flags: 64,
      embeds: [{ ...embed, color: embed.color ?? 0x22c55e }],
    },
  };
}

/** Extract a named option value from interaction options array. */
export function getOptionValue(
  options: InteractionOption[] | undefined,
  name: string,
): string | undefined {
  return options?.find((o) => o.name === name)?.value;
}
