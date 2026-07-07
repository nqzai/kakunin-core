/**
 * Discord User Rate Limiter
 *
 * Enforces 5 messages/minute per Discord user via Upstash Redis sliding window.
 * Checked in /api/internal/discord-handler before calling chat API.
 * Protects against spam and runaway cost on QStash + OpenRouter.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

function getRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  if (!ratelimit) {
    ratelimit = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(5, '60 s'),
      prefix: 'discord:rl',
    });
  }
  return ratelimit;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // unix ms
}

/**
 * Check rate limit for a Discord user.
 * Returns allowed=true if under limit, allowed=false if exceeded.
 * Falls back to allowed=true if Redis is not configured (dev mode).
 */
export async function checkDiscordRateLimit(discordUserId: string): Promise<RateLimitResult> {
  const rl = getRatelimit();
  if (!rl) {
    return { allowed: true, remaining: 5, resetAt: Date.now() + 60_000 };
  }

  const { success, remaining, reset } = await rl.limit(`user:${discordUserId}`);
  return { allowed: success, remaining, resetAt: reset };
}
