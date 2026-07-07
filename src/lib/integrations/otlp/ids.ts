/**
 * Deterministic OTLP trace/span IDs (P1 — RA-180).
 *
 * OTLP export is at-least-once and QStash retries on failure, so random IDs
 * would duplicate spans/traces in the customer's backend on every retry.
 * Deriving IDs deterministically from the source UUIDs makes retries
 * idempotent — the same decision chain always maps to the same trace_id and
 * the same event always maps to the same span_id.
 *
 * OTLP/HTTP JSON encodes IDs as lowercase hex: 16 bytes (32 hex) for trace_id,
 * 8 bytes (16 hex) for span_id. We hash with a per-kind salt so a chain UUID
 * and an event UUID never collide, and guard the all-zero value (invalid per
 * the OTLP spec).
 */

import { createHash } from 'node:crypto';

function hashHex(salt: string, uuid: string, bytes: number): string {
  const digest = createHash('sha256').update(salt).update(uuid).digest('hex');
  let hex = digest.slice(0, bytes * 2);
  // All-zero IDs are invalid in OTLP; flip the last nibble if we hit it.
  if (/^0+$/.test(hex)) hex = hex.slice(0, -1) + '1';
  return hex;
}

/** 16-byte (32 hex) trace id derived from a decision-chain UUID. */
export function traceIdFromUuid(uuid: string): string {
  return hashHex('kakunin-otlp-trace:', uuid, 16);
}

/** 8-byte (16 hex) span id derived from an event/chain UUID. */
export function spanIdFromUuid(uuid: string): string {
  return hashHex('kakunin-otlp-span:', uuid, 8);
}
