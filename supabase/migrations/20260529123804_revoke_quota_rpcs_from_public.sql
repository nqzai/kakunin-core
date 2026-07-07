-- Migration: revoke quota increment RPCs from anon/authenticated
-- Week: pilot-hardening (RA-162)
-- Reason: increment_event_count / increment_report_count are SECURITY DEFINER
--         and were EXECUTE-able by anon/authenticated via /rest/v1/rpc/, letting
--         a caller bump ANY tenant's counters with an arbitrary p_tenant_id —
--         bypassing the RA-145 RLS fix. They are only ever called server-side
--         via the service-role client (lib/quota/event-quota.ts). Restrict
--         EXECUTE to service_role.
-- Author: RA-162 Codex review remediation (advisor follow-up)
-- Date: 2026-05-29

REVOKE EXECUTE ON FUNCTION public.increment_event_count(p_tenant_id uuid, p_agent_id uuid, p_month date) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_report_count(p_tenant_id uuid, p_agent_id uuid, p_month date) FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.increment_event_count(p_tenant_id uuid, p_agent_id uuid, p_month date) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_report_count(p_tenant_id uuid, p_agent_id uuid, p_month date) TO service_role;
