/**
 * Shared-secret Bearer auth for server-to-server endpoints (Vercel Cron,
 * Retool admin, the Railway Discord bot).
 *
 * Two properties every caller relies on:
 *
 *  1. Fail closed — if the expected secret is not configured, the request is
 *     rejected. A plain `header === \`Bearer ${process.env.SECRET}\`` check
 *     fails OPEN when the env var is unset: the comparison becomes
 *     `header === 'Bearer undefined'`, which an attacker can satisfy by sending
 *     exactly that value.
 *
 *  2. Constant-time comparison — avoids leaking the secret through response
 *     timing. `===` on strings short-circuits at the first differing byte.
 */

import { timingSafeEqual } from 'crypto';

/**
 * Constant-time string equality. Returns false (without throwing) when either
 * side is missing or lengths differ.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate an `Authorization: Bearer <secret>` header against a configured
 * secret. Fails closed when `expectedSecret` is empty/undefined.
 *
 * @param authHeader   The raw `Authorization` header value (may be null).
 * @param expectedSecret The secret to match (e.g. `process.env.CRON_SECRET`).
 */
export function isValidBearerSecret(
  authHeader: string | null | undefined,
  expectedSecret: string | undefined | null,
): boolean {
  if (!expectedSecret) return false;
  if (!authHeader?.startsWith('Bearer ')) return false;
  const presented = authHeader.slice('Bearer '.length);
  return safeEqual(presented, expectedSecret);
}
