/**
 * BYOA Alert Channel Credential Encryption
 *
 * AES-256-GCM encryption for third-party credentials (Slack bot tokens,
 * PagerDuty routing keys, Twilio auth tokens) stored in tenant_alert_channels.
 *
 * Key: CREDENTIAL_ENCRYPTION_KEY (32 bytes, base64-encoded) — stored in Doppler.
 * Format: <iv_hex>:<authtag_hex>:<ciphertext_hex> (same as WEBHOOK_SECRET_KEY pattern)
 *
 * Never store or log plaintext credentials. Always encrypt at write time,
 * decrypt at the last possible moment (inside the QStash worker, not before).
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

function getEncKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!raw) throw new Error('CREDENTIAL_ENCRYPTION_KEY not configured');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY must be 32 bytes (base64-encoded). Generate with: openssl rand -base64 32');
  }
  return buf;
}

/**
 * Encrypt BYOA credentials (as JSON) for storage in tenant_alert_channels.credentials_enc.
 * Unique IV per call — never reuse IVs with AES-GCM.
 */
export function encryptCredentials(credentials: Record<string, unknown>): string {
  const key = getEncKey();
  const iv = randomBytes(12); // 96-bit IV recommended for GCM
  const plain = JSON.stringify(credentials);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
}

/**
 * Decrypt stored credentials. Returns parsed object.
 * @throws if key is missing, format is invalid, or authentication fails.
 */
export function decryptCredentials(enc: string): Record<string, unknown> {
  const key = getEncKey();
  const parts = enc.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted credentials format');
  const [ivHex, tagHex, ctHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = decipher.update(ct).toString('utf8') + decipher.final('utf8');
  return JSON.parse(plain) as Record<string, unknown>;
}
