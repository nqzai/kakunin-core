-- Migration: add atomic event quota reservation RPCs
-- Reason: prevent concurrent read-then-insert oversubscription in /api/v1/events
--         by reserving quota through a single DB-side mutation.
-- Date: 2026-06-13

CREATE OR REPLACE FUNCTION public.consume_event_quota(
  p_tenant_id UUID,
  p_agent_id UUID,
  p_month DATE,
  p_limit INTEGER
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF p_limit <= 0 THEN
    SELECT COALESCE(event_count, 0)
      INTO v_count
      FROM public.agent_event_counts
     WHERE tenant_id = p_tenant_id
       AND agent_id = p_agent_id
       AND month = p_month;

    RETURN QUERY SELECT FALSE, COALESCE(v_count, 0);
    RETURN;
  END IF;

  INSERT INTO public.agent_event_counts (tenant_id, agent_id, month, event_count)
  VALUES (p_tenant_id, p_agent_id, p_month, 1)
  ON CONFLICT (tenant_id, agent_id, month)
  DO UPDATE SET event_count =
    CASE
      WHEN public.agent_event_counts.event_count < p_limit
        THEN public.agent_event_counts.event_count + 1
      ELSE public.agent_event_counts.event_count
    END
  RETURNING event_count INTO v_count;

  RETURN QUERY SELECT v_count <= p_limit, v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_event_quota(UUID, UUID, DATE, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_event_quota(UUID, UUID, DATE, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.release_event_quota(
  p_tenant_id UUID,
  p_agent_id UUID,
  p_month DATE
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.agent_event_counts
     SET event_count = GREATEST(event_count - 1, 0)
   WHERE tenant_id = p_tenant_id
     AND agent_id = p_agent_id
     AND month = p_month;
$$;

REVOKE ALL ON FUNCTION public.release_event_quota(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_event_quota(UUID, UUID, DATE) TO service_role;
