/**
 * QStash Signature Verification
 *
 * Validates the `upstash-signature` HMAC header on inbound QStash worker
 * requests. Must be called before processing any job payload.
 *
 * Returns the raw body string on success (stream already consumed — callers
 * must JSON.parse() instead of req.json()). Returns null if verification
 * fails; callers should respond 401 immediately.
 *
 * Fails closed: verification is skipped only when NODE_ENV === 'development'
 * and signing keys are absent. Outside local dev, missing keys cause the
 * request to be rejected (returns null) rather than accepted unverified.
 * In production (Vercel + Doppler), QSTASH_CURRENT_SIGNING_KEY and
 * QSTASH_NEXT_SIGNING_KEY are always set.
 */

import { Receiver } from '@upstash/qstash';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * Verifies the QStash HMAC signature and returns the request body as a
 * string. Returns null if verification fails.
 *
 * @example
 * ```ts
 * const body = await verifyQStashBody(req);
 * if (!body) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * const payload = JSON.parse(body) as JobPayload;
 * ```
 */
export async function verifyQStashBody(req: NextRequest): Promise<string | null> {
  const rawBody = await req.text();

  const currentKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  // Skip verification ONLY in explicit local development. Gating on missing
  // keys (the old behaviour) fails OPEN: a production env that lost its signing
  // keys would silently accept unverified bodies on every /api/internal/* route.
  // Fail CLOSED everywhere except local dev.
  if (!currentKey || !nextKey) {
    if (process.env.NODE_ENV === 'development') {
      return rawBody;
    }
    console.error(
      '[verify-qstash] QSTASH signing keys not configured outside local dev — rejecting request'
    );
    return null;
  }

  const receiver = new Receiver({
    currentSigningKey: currentKey,
    nextSigningKey: nextKey,
  });

  const isValid = await receiver
    .verify({
      signature: req.headers.get('upstash-signature') ?? '',
      body: rawBody,
    })
    .catch(() => false);

  return isValid ? rawBody : null;
}

/**
 * Canonical guard for QStash-backed internal workers.
 *
 * Call this as the first line of any `/api/internal/*` route that is invoked by
 * QStash. It makes the auth seam obvious in code review and keeps the
 * unauthorized response shape consistent across workers.
 */
export async function requireVerifiedQStashBody(
  req: NextRequest
): Promise<
  | { ok: true; body: string }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const body = await verifyQStashBody(req);
  if (!body) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  return { ok: true, body };
}
