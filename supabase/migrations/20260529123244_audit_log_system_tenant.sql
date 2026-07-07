-- Migration: allow system-level audit events without a tenant
-- Week: pilot-hardening (RA-147)
-- Reason: system events (CRL generation, sandbox retention cron, public verify
--         rate-limits) have no owning tenant. Code was writing null / 'system'
--         / a synthetic zero-UUID into audit_log.tenant_id, all of which fail
--         the UUID NOT NULL constraint (and FK), so system events were silently
--         NOT being audited. Make tenant_id nullable and add a CHECK that
--         tenant-scoped events (actor_type user|agent) still always carry a
--         tenant_id — only actor_type='system' may omit it.
-- Author: RA-147 Codex review remediation
-- Date: 2026-05-29

ALTER TABLE public.audit_log
  ALTER COLUMN tenant_id DROP NOT NULL;

-- A null tenant_id is permitted ONLY for system events. User/agent events must
-- remain tenant-scoped so the existing RLS read policy keeps working.
ALTER TABLE public.audit_log
  ADD CONSTRAINT audit_log_system_tenant_check
  CHECK (actor_type = 'system' OR tenant_id IS NOT NULL);

COMMENT ON COLUMN public.audit_log.tenant_id IS
  'Owning tenant. NULL only for system-level events (actor_type=''system''); '
  'enforced by audit_log_system_tenant_check. RLS read policy excludes NULL rows '
  'from tenant clients, so system events are visible to service_role only.';
