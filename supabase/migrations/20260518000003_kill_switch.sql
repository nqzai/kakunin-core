-- Migration: add kill switch support to certificates and behavior_events
-- Week: V1.1
-- Reason: RA-74 — regulators require a cryptographically provable halt receipt (Audit Test #8).
--         halt_receipt stores the signed receipt so GET /v1/verify/:serial can return it
--         without needing a separate DB query. kill_switch.activated is a new behavior event
--         type that records the halt in the immutable audit trail.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE certificates ADD COLUMN halt_receipt JSONB;

COMMENT ON COLUMN certificates.halt_receipt IS
  'Signed halt receipt returned by POST /v1/agents/:id/halt. '
  'Contains: halt_event_id, halted_at, reason, receipt_signature (KMS CA key). '
  'Null when certificate was revoked via standard revocation, not kill switch.';

ALTER TABLE behavior_events DROP CONSTRAINT IF EXISTS behavior_events_action_type_check;

ALTER TABLE behavior_events ADD CONSTRAINT behavior_events_action_type_check CHECK (action_type IN (
  'api_call', 'authentication_attempt', 'authentication_failure',
  'data_access', 'data_mutation', 'transaction_initiated',
  'transaction_anomaly', 'unauthorized_access_attempt',
  'message_signed', 'message_verification_failed',
  'kill_switch_activated'
));
