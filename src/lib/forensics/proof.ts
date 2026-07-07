/**
 * Forensic export proof (P3a — RA-185).
 *
 * Produces a tamper-evident, signed proof over an ordered set of behavioral
 * events so an exported forensic record can later be shown to be unaltered.
 * Same trust primitive as the audit-log HMAC (control C-G1 / NCCoE
 * non-repudiation): SHA-256 content hash + HMAC-SHA256 signature keyed by
 * AUDIT_SIGNING_KEY.
 *
 * Returns a null signature (not a throw) when the key is unconfigured — the
 * forensic data is still returned, just not signed. Mirrors audit/hmac.ts.
 */

import { createHash, createHmac } from 'node:crypto';

export interface ForensicEvent {
  id: string;
  occurred_at: string;
  action_type: string;
  risk_score: number;
  risk_band: string;
}

export interface ForensicProof {
  algorithm: 'HMAC-SHA256';
  content_hash: string;
  signature: string | null;
  event_count: number;
  generated_at: string;
}

function getKey(): Buffer | null {
  const raw = process.env.AUDIT_SIGNING_KEY;
  if (!raw) return null;
  const buf = /^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'utf8');
  return buf.length >= 32 ? buf : null;
}

/** Canonical, order-sensitive digest of the event set. */
export function contentHash(events: ForensicEvent[]): string {
  const canonical = events
    .map((e) => `${e.id}|${e.occurred_at}|${e.action_type}|${e.risk_score}|${e.risk_band}`)
    .join('\n');
  return createHash('sha256').update(canonical).digest('hex');
}

/** Build a signed proof over the ordered events for (tenant, agent). */
export function computeForensicsProof(
  events: ForensicEvent[],
  ctx: { tenantId: string; agentId: string; generatedAt?: string },
): ForensicProof {
  const generated_at = ctx.generatedAt ?? new Date().toISOString();
  const hash = contentHash(events);
  const key = getKey();
  const signature = key
    ? createHmac('sha256', key).update(`${ctx.tenantId}|${ctx.agentId}|${hash}|${generated_at}`).digest('hex')
    : null;
  return { algorithm: 'HMAC-SHA256', content_hash: hash, signature, event_count: events.length, generated_at };
}

/** Verify a previously issued proof against a re-fetched event set. */
export function verifyForensicsProof(
  events: ForensicEvent[],
  ctx: { tenantId: string; agentId: string },
  proof: ForensicProof,
): boolean {
  if (!proof.signature) return false;
  const key = getKey();
  if (!key) return false;
  if (contentHash(events) !== proof.content_hash) return false;
  const expected = createHmac('sha256', key)
    .update(`${ctx.tenantId}|${ctx.agentId}|${proof.content_hash}|${proof.generated_at}`)
    .digest('hex');
  return expected === proof.signature;
}
