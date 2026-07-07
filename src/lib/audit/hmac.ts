/**
 * Audit Log Entry Signing
 *
 * HMAC-SHA256 per-row signing for audit_log entries.
 * Provides tamper evidence beyond PostgreSQL WORM rules — proves entries
 * have not been modified even if a superuser bypasses the DB rules.
 *
 * Key: AUDIT_SIGNING_KEY (hex or base64, min 32 bytes) — stored in Doppler.
 * Canonical form: pipe-delimited ordered fields, deterministic JSON for metadata.
 *
 * Article 50 (EU AI Act) — audit trail integrity requirement.
 */

import { createHmac, timingSafeEqual } from 'crypto';

function getSigningKey(): Buffer {
  const raw = process.env.AUDIT_SIGNING_KEY;
  if (!raw) throw new Error('[audit-hmac] AUDIT_SIGNING_KEY not configured');
  // Accept hex (64 chars) or base64 (44 chars for 32 bytes)
  const buf = raw.length === 64 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64');
  if (buf.length < 32) throw new Error('[audit-hmac] AUDIT_SIGNING_KEY must be at least 32 bytes');
  return buf;
}

export interface AuditRowFields {
  id: string;
  tenant_id: string | null;
  event_type: string;
  actor_type: string;
  actor_id: string;
  description: string;
  affected_id?: string | null;
  metadata?: unknown;
  created_at: string;
}

/**
 * Canonical string for HMAC computation.
 * Field order is fixed — never reorder without migrating existing hashes.
 * Format: id|tenant_id|event_type|actor_type|actor_id|description|affected_id|metadata_json|created_at
 */
function canonicalize(row: AuditRowFields): string {
  return [
    row.id,
    // System events have no tenant; hash an empty slot deterministically
    row.tenant_id ?? '',
    row.event_type,
    row.actor_type,
    row.actor_id,
    row.description,
    row.affected_id ?? '',
    // Sort keys for deterministic JSON regardless of insertion order
    JSON.stringify(
      row.metadata !== null && typeof row.metadata === 'object'
        ? Object.fromEntries(Object.entries(row.metadata as Record<string, unknown>).sort())
        : (row.metadata ?? {})
    ),
    row.created_at,
  ].join('|');
}

/**
 * Compute HMAC-SHA256 for an audit_log row.
 * Call before INSERT — pass pre-generated id and created_at.
 *
 * Returns null if AUDIT_SIGNING_KEY is not configured — allows graceful
 * degradation in local dev without the key set.
 */
export function computeEntryHash(row: AuditRowFields): string | null {
  try {
    const key = getSigningKey();
    return createHmac('sha256', key).update(canonicalize(row)).digest('hex');
  } catch {
    // Missing key in local dev — degrade gracefully, never throw
    return null;
  }
}

/**
 * Verify an audit_log entry's HMAC against stored entry_hash.
 *
 * @returns 'valid' | 'invalid' | 'unsigned' (no entry_hash stored)
 */
export function verifyEntryHash(
  row: AuditRowFields & { entry_hash?: string | null },
): 'valid' | 'invalid' | 'unsigned' {
  if (!row.entry_hash) return 'unsigned';
  try {
    const key = getSigningKey();
    const expected = createHmac('sha256', key).update(canonicalize(row)).digest('hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    const actualBuf = Buffer.from(row.entry_hash, 'hex');
    if (expectedBuf.length !== actualBuf.length) return 'invalid';
    // Constant-time comparison — prevents timing attacks
    return timingSafeEqual(expectedBuf, actualBuf) ? 'valid' : 'invalid';
  } catch {
    return 'unsigned';
  }
}
