-- Migration: add entry_hash column + audit_log_access table
-- Reason: RA-125 — Article 50 tamper-proof audit trail hardening.
--         entry_hash stores HMAC-SHA256 of canonical row fields, computed at
--         write time in writeAuditLog(). Proves entries are unmodified even if
--         PostgreSQL WORM rules are bypassed by a superuser.
--         audit_log_access tracks every read of the audit_log for access audit.
-- Date: 2026-05-26

-- 1. HMAC signature column on audit_log
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS entry_hash TEXT;

COMMENT ON COLUMN public.audit_log.entry_hash IS
  'HMAC-SHA256 of canonical row fields (id|tenant_id|event_type|actor_type|actor_id|description|affected_id|metadata|created_at). '
  'Key: AUDIT_SIGNING_KEY env var. NULL on rows written before RA-125.';

-- 2. Access audit table — tracks who read audit_log entries
CREATE TABLE IF NOT EXISTS public.audit_log_access (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  accessed_by TEXT NOT NULL,          -- actor_id (user or system)
  actor_type  TEXT NOT NULL CHECK (actor_type IN ('user', 'system')),
  purpose     TEXT NOT NULL,          -- e.g. 'compliance_report', 'admin_export'
  row_count   INT NOT NULL DEFAULT 0, -- number of audit_log rows returned
  filters     JSONB NOT NULL DEFAULT '{}', -- query filters applied
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log_access ENABLE ROW LEVEL SECURITY;

-- Append-only — same WORM pattern as audit_log
CREATE RULE audit_log_access_no_update AS ON UPDATE TO audit_log_access DO INSTEAD NOTHING;
CREATE RULE audit_log_access_no_delete AS ON DELETE TO audit_log_access DO INSTEAD NOTHING;

-- Tenants may only read their own access records
CREATE POLICY "audit_log_access: tenant scope"
  ON public.audit_log_access FOR SELECT
  USING (tenant_id = (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

-- Index for tenant + time-range queries
CREATE INDEX IF NOT EXISTS audit_log_access_tenant_created_at_idx
  ON public.audit_log_access (tenant_id, created_at DESC);

-- Authenticated users can read; service_role gets full access
GRANT SELECT, INSERT ON public.audit_log_access TO authenticated;
GRANT ALL ON public.audit_log_access TO service_role;
