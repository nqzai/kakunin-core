-- Migration: add inbox_status column to agents
-- Week: 9
-- Reason: RA-62 — surface AgentMail provisioning failures to tenant dashboard.
--         Silent QStash retry exhaustion is invisible to operators; inbox_status
--         allows the dashboard to show a warning badge when provisioning fails.
-- Author: auto-generated
-- Date: 2026-05-17

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS inbox_status TEXT
    CHECK (inbox_status IN ('provisioning', 'active', 'failed', 'unavailable'))
    DEFAULT NULL;

COMMENT ON COLUMN agents.inbox_status IS
  'Inbox provisioning state: provisioning | active | failed | unavailable. NULL = not yet attempted.';
