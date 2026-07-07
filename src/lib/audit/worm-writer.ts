/**
 * WORM Audit Writer
 *
 * Publishes audit_log and behavior_events rows to S3 Object Lock storage
 * via QStash (retries: 3). This provides hardware-backed WORM immutability
 * that satisfies enterprise legal review and NCA due-diligence requirements
 * beyond PostgreSQL RULE-based immutability alone.
 *
 * Storage layout: s3://kakunin-audit-worm-{env}/{tenantId}/{YYYY-MM-DD}/{uuid}.json
 * Bucket configuration: Object Lock — Compliance mode, 7-year retention (2557 days)
 *
 * @see premortem FM4 (Security Breach) + FM7 (Architecture Debt)
 * @see EU AI Act Annex IV — audit trail requirements
 */

import { enqueue } from '@/lib/queue/qstash';
import { log } from '@/lib/logging';

export interface WormRecord {
  /** Kakunin tenant UUID */
  tenantId: string;
  /** Matches audit_log.event_type or 'behavior_event' */
  eventType: string;
  /** UUID of the audit_log or behavior_events row */
  rowId: string;
  actorType: string;
  actorId: string;
  description?: string;
  affectedId?: string | null;
  metadata?: Record<string, unknown>;
  /** ISO 8601 timestamp — from the DB row's created_at */
  timestamp: string;
}

/**
 * Enqueue an immutable WORM write to S3 Object Lock storage.
 *
 * Fire-and-forget — never throws. Called immediately after any audit_log
 * or behavior_events INSERT succeeds. QStash retries: 3 on 5xx.
 *
 * Usage:
 *   void writeAuditWorm({ tenantId, eventType, rowId, ... });
 */
export function writeAuditWorm(record: WormRecord): void {
  enqueue({
    path: 'worm-write',
    body: record as unknown as Record<string, unknown>,
  }).catch((err) => {
    // Non-blocking — log warning but never fail the caller
    log.error('[worm-writer] Failed to enqueue WORM write', {
      error: (err as Error).message,
      tenantId: record.tenantId,
      eventType: record.eventType,
      rowId: record.rowId,
    });
  });
}
