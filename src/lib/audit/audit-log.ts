/**
 * Centralized audit log writer.
 *
 * Combines Supabase audit_log INSERT with fire-and-forget S3 WORM write.
 * Use this instead of calling supabase.from('audit_log').insert() directly
 * to ensure every audit event is backed by S3 Object Lock storage.
 *
 * Pre-generates id + created_at so HMAC can be computed before INSERT —
 * WORM rules (audit_log_no_update) block any post-insert UPDATE.
 *
 * @example
 * await writeAuditLog(supabase, {
 *   tenant_id,
 *   event_type: 'certificate.issued',
 *   actor_type: 'user',
 *   actor_id,
 *   description: `Certificate issued for agent ${agentId}`,
 *   affected_id: agentId,
 *   metadata: { serial },
 * });
 */

import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { writeAuditWorm } from './worm-writer';
import { computeEntryHash } from './hmac';
import { log } from '@/lib/logging';

type AuditLogInsert = Database['public']['Tables']['audit_log']['Insert'];

/**
 * Insert one row into audit_log and fire-and-forget an S3 WORM copy.
 *
 * Pre-generates id + created_at before INSERT so HMAC-SHA256 (entry_hash)
 * can be computed and stored atomically. WORM rules block post-insert UPDATE,
 * so hash must be included in the INSERT payload.
 *
 * Returns the inserted row's { id, created_at } on success, null on DB error.
 * Never throws — callers are not responsible for audit infrastructure failures.
 */
export async function writeAuditLog(
  supabase: SupabaseClient<Database>,
  payload: Omit<AuditLogInsert, 'id' | 'created_at'>,
): Promise<{ id: string; created_at: string } | null> {
  // Pre-generate id + timestamp so HMAC can include them before INSERT
  const id = randomUUID();
  const createdAt = new Date().toISOString();

  // Article 50 (EU AI Act) — HMAC-SHA256 tamper evidence per row
  const entryHash = computeEntryHash({
    id,
    tenant_id: payload.tenant_id ?? null,
    event_type: payload.event_type,
    actor_type: payload.actor_type,
    actor_id: payload.actor_id,
    description: payload.description,
    affected_id: payload.affected_id ?? null,
    metadata: payload.metadata ?? {},
    created_at: createdAt,
  });

  const { data, error } = await supabase
    .from('audit_log')
    .insert({ id, created_at: createdAt, ...payload, entry_hash: entryHash })
    .select('id, created_at')
    .single();

  if (error || !data) {
    // Log identifying fields only — never the full payload (metadata may carry secrets/PII)
    log.error('[audit-log] Insert failed', {
      error: error?.message,
      event_type: payload.event_type,
      tenant_id: payload.tenant_id,
      actor_id: payload.actor_id,
    });
    return null;
  }

  // Fire-and-forget WORM backup — never blocks the caller
  void writeAuditWorm({
    // System events have no tenant; bucket them under a "system" prefix in S3
    tenantId: payload.tenant_id ?? 'system',
    eventType: payload.event_type,
    rowId: data.id,
    actorType: payload.actor_type,
    actorId: payload.actor_id,
    description: payload.description ?? undefined,
    affectedId: payload.affected_id ?? null,
    metadata: (payload.metadata as Record<string, unknown>) ?? {},
    timestamp: data.created_at,
  });

  return { id: data.id, created_at: data.created_at };
}

/** Thrown by writeAuditLogStrict when the audit row cannot be persisted. */
export class AuditWriteError extends Error {
  constructor(eventType: string) {
    super(`Audit log write failed for event ${eventType}`);
    this.name = 'AuditWriteError';
  }
}

/**
 * Fail-closed variant of writeAuditLog for compliance-critical mutations
 * (certificate issuance/revocation). Throws AuditWriteError on DB failure
 * so the caller can compensate or surface a 500 instead of silently
 * completing an unaudited state change.
 */
export async function writeAuditLogStrict(
  supabase: SupabaseClient<Database>,
  payload: Omit<AuditLogInsert, 'id' | 'created_at'>,
): Promise<{ id: string; created_at: string }> {
  const result = await writeAuditLog(supabase, payload);
  if (!result) {
    throw new AuditWriteError(payload.event_type);
  }
  return result;
}
