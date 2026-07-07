-- Migration: add factors column to behavior_events
-- Week: RA-166 (risk engine multi-factor refactor)
-- Reason: per-event risk scores must carry a machine-readable explanation of WHY
--   the score landed where it did (e.g. 'scope_violation'). Required for audit_log
--   + revocation explainability per docs/RISK_ENGINE_DESIGN.md §4-5.
-- Author: /plan-eng-review → implementation
-- Date: 2026-05-29

-- ALTER ADD COLUMN inherits existing table grants (append-only pattern:
-- SELECT, INSERT for authenticated; ALL for service_role) — no new GRANT needed.
ALTER TABLE behavior_events
  ADD COLUMN IF NOT EXISTS factors TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN behavior_events.factors IS
  'Risk-score reasons emitted by scoreEvent() (e.g. scope_violation). Empty when only the base action lookup applied.';
