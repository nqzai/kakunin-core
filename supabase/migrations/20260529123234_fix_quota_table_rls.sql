-- Migration: fix tenant isolation on quota counter tables
-- Week: pilot-hardening (RA-145)
-- Reason: the original policies in 20260519000001_plan_tier_and_trial.sql used
--         USING (tenant_id = (SELECT id FROM tenants WHERE id = tenant_id LIMIT 1))
--         which is a tautology — it always resolves true for any existing tenant
--         and provides ZERO cross-tenant isolation. Replace with the same
--         auth.uid()-bound pattern used by agents/behavior_events/etc. in
--         20260516000001_initial_schema.sql so an authenticated client can only
--         see its own tenant's quota rows.
-- Author: RA-145 Codex review remediation
-- Date: 2026-05-29

-- ── agent_event_counts ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_agent_event_counts"
  ON public.agent_event_counts;

CREATE POLICY "tenant_isolation_agent_event_counts"
  ON public.agent_event_counts
  FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth.uid()::text = id::text));

-- ── agent_report_counts ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenant_isolation_agent_report_counts"
  ON public.agent_report_counts;

CREATE POLICY "tenant_isolation_agent_report_counts"
  ON public.agent_report_counts
  FOR ALL
  USING (tenant_id IN (SELECT id FROM public.tenants WHERE auth.uid()::text = id::text));
