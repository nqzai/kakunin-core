-- Migration: add RPC functions for atomic quota counter increments
-- Reason: RA-85 — upsert-based atomic increment avoids race conditions
--         under concurrent event ingestion from the same agent.
--         Using a stored procedure prevents the lost-update problem
--         that would occur with a read-then-write in application code.
-- Date: 2026-05-19

-- ── increment_event_count ──────────────────────────────────────────────────
-- Atomically increments agent_event_counts for (tenant, agent, month).
-- Inserts the row with count=1 if it doesn't exist yet (first event of month).

CREATE OR REPLACE FUNCTION public.increment_event_count(
  p_tenant_id UUID,
  p_agent_id  UUID,
  p_month     DATE
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.agent_event_counts (tenant_id, agent_id, month, event_count)
  VALUES (p_tenant_id, p_agent_id, p_month, 1)
  ON CONFLICT (tenant_id, agent_id, month)
  DO UPDATE SET event_count = public.agent_event_counts.event_count + 1;
$$;

-- Only service_role can call — not exposed to authenticated clients directly
REVOKE ALL ON FUNCTION public.increment_event_count(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_event_count(UUID, UUID, DATE) TO service_role;

-- ── increment_report_count ─────────────────────────────────────────────────
-- Same pattern for compliance report quota metering.

CREATE OR REPLACE FUNCTION public.increment_report_count(
  p_tenant_id UUID,
  p_agent_id  UUID,
  p_month     DATE
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.agent_report_counts (tenant_id, agent_id, month, report_count)
  VALUES (p_tenant_id, p_agent_id, p_month, 1)
  ON CONFLICT (tenant_id, agent_id, month)
  DO UPDATE SET report_count = public.agent_report_counts.report_count + 1;
$$;

REVOKE ALL ON FUNCTION public.increment_report_count(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_report_count(UUID, UUID, DATE) TO service_role;
