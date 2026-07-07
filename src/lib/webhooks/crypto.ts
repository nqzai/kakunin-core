/**
 * Webhook Crypto Helpers
 *
 * AES-256-GCM encryption for raw webhook secrets stored in DB.
 * HMAC-SHA256 signing for outbound webhook payloads (Stripe-style).
 *
 * Key flows:
 *   encryptSecret()  → called at webhook registration; stored in webhooks.secret_enc
 *   decryptSecret()  → called by delivery worker to retrieve raw secret for signing
 *   signPayload()    → builds X-Kakunin-Signature header value
 *   buildHeaders()   → returns full set of signed headers for delivery
 */

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto';

function getEncKey(): Buffer {
  const raw = process.env.WEBHOOK_SECRET_KEY;
  if (!raw) throw new Error('WEBHOOK_SECRET_KEY not configured');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('WEBHOOK_SECRET_KEY must be 32 bytes (base64-encoded)');
  }
  return buf;
}

/**
 * AES-256-GCM encrypt a webhook secret for storage.
 * Format: <iv_hex>:<authtag_hex>:<ciphertext_hex>
 */
export function encryptSecret(raw: string): string {
  const key = getEncKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(raw, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decrypt a stored webhook secret for signing outbound payloads.
 */
export function decryptSecret(enc: string): string {
  const key = getEncKey();
  const parts = enc.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted secret format');
  const [ivHex, tagHex, ctHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ct).toString('utf8') + decipher.final('utf8');
}

/**
 * Build HMAC-SHA256 signature for a webhook payload.
 * Signed string: "<unix_ts_ms>.<json_body>"
 * Recipients verify using: HMAC-SHA256(secret, signed_string)
 */
export function signPayload(secret: string, timestampMs: number, body: string): string {
  const signed = `${timestampMs}.${body}`;
  return createHmac('sha256', secret).update(signed).digest('hex');
}

export interface WebhookHeaders extends Record<string, string> {
  'x-kakunin-event': string;
  'x-kakunin-timestamp': string;
  'x-kakunin-signature': string;
  'x-kakunin-delivery-id': string;
  'content-type': string;
}

/**
 * Build the full set of signed headers for an outbound webhook delivery.
 */
export function buildHeaders(opts: {
  secret: string;
  eventType: string;
  deliveryId: string;
  body: string;
}): WebhookHeaders {
  const ts = Date.now();
  const sig = signPayload(opts.secret, ts, opts.body);
  return {
    'x-kakunin-event': opts.eventType,
    'x-kakunin-timestamp': String(ts),
    'x-kakunin-signature': `sha256=${sig}`,
    'x-kakunin-delivery-id': opts.deliveryId,
    'content-type': 'application/json',
  };
}
