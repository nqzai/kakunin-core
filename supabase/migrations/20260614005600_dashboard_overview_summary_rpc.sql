-- Migration: add dashboard overview summary RPC
-- Issue: RA-195
-- Reason: collapse repeated dashboard summary counts and feature-flag lookups
--   into a single DB roundtrip so dashboard entry renders do materially fewer
--   queries per request.
-- Date: 2026-06-14

CREATE OR REPLACE FUNCTION public.get_dashboard_overview_summary(
  p_tenant_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  total_agents BIGINT,
  active_certs BIGINT,
  events_today BIGINT,
  high_risk_count BIGINT,
  debug_chat_enabled BOOLEAN
)
LANGUAGE SQL
STABLE
AS $$
  SELECT
    (
      SELECT COUNT(*)
      FROM public.agents a
      WHERE a.tenant_id = p_tenant_id
    ) AS total_agents,
    (
      SELECT COUNT(*)
      FROM public.certificates c
      WHERE c.tenant_id = p_tenant_id
        AND c.status = 'active'
    ) AS active_certs,
    (
      SELECT COUNT(*)
      FROM public.behavior_events e
      WHERE e.tenant_id = p_tenant_id
        AND e.occurred_at >= p_since
    ) AS events_today,
    (
      SELECT COUNT(*)
      FROM public.behavior_events e
      WHERE e.tenant_id = p_tenant_id
        AND e.risk_band = 'high'
        AND e.occurred_at >= p_since
    ) AS high_risk_count,
    COALESCE(
      (
        SELECT ff.debug_chat_enabled
        FROM public.feature_flags ff
        WHERE ff.tenant_id = p_tenant_id
        LIMIT 1
      ),
      FALSE
    ) AS debug_chat_enabled
$$;
