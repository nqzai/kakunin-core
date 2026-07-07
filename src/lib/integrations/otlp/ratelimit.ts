/**
 * Per-connection OTLP export rate limit (P1 — RA-181).
 *
 * Bounds outbound export frequency per integration_connection so a
 * misconfigured cron cadence or a retry storm can't hammer a customer's
 * collector (or run up QStash/egress cost). Sliding window via Upstash Redis,
 * same pattern as the Discord limiter. Fails open when Redis is unconfigured
 * (local/dev) so the pilot still runs.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  if (!limiter) {
    limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      // 12 exports / 5 min per connection — generous for a cron sweep, tight
      // enough to contain a retry storm.
      limiter: Ratelimit.slidingWindow(12, '300 s'),
      prefix: 'otlp:rl',
    });
  }
  return limiter;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/** Check the per-connection export limit. Fails open if Redis is unconfigured. */
export async function checkOtlpExportLimit(connectionId: string): Promise<RateLimitResult> {
  const rl = getLimiter();
  if (!rl) return { allowed: true, remaining: -1 };
  const { success, remaining } = await rl.limit(connectionId);
  return { allowed: success, remaining };
}
