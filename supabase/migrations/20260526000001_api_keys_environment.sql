-- Migration: add environment column to api_keys
-- Reason: sandbox badge in dashboard reads api_keys.environment; was only stored
--         in audit_log.metadata — badge always null for new kak_test_ keys
-- Date: 2026-05-26

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS environment TEXT CHECK (environment IN ('live', 'sandbox')) DEFAULT 'live';

COMMENT ON COLUMN public.api_keys.environment IS
  'live = production key (kak_live_*), sandbox = test key (kak_test_*)';
