-- Migration: fold agent-create plan_tier lookup into the quota RPC
-- Reason: POST /api/v1/agents did two DB roundtrips — SELECT plan_tier, then
--         create_agent_with_quota(p_limit). Resolve plan_tier inside the RPC
--         and pass the tier->agent-limit map as JSONB so plan-limits.ts stays
--         the single source of truth. One roundtrip instead of two.
-- Date: 2026-07-07

-- Old signature took a pre-computed p_limit INTEGER; drop it explicitly since
-- the argument list changes (CREATE OR REPLACE would create an overload).
DROP FUNCTION IF EXISTS public.create_agent_with_quota(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB
);

CREATE OR REPLACE FUNCTION public.create_agent_with_quota(
  p_tenant_id   UUID,
  -- tier -> max agents, e.g. {"starter":5,"pro":20,"enterprise":-1,"pending":0}.
  -- A negative value means unlimited; a missing tier means 0 (no access).
  p_agent_limits JSONB,
  p_name        TEXT,
  p_model_hash  TEXT,
  p_model       TEXT,
  p_version     TEXT,
  p_description TEXT,
  p_metadata    JSONB
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, plan_tier TEXT, agent JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_tier  TEXT;
  v_limit INTEGER;
  v_agent public.agents%ROWTYPE;
BEGIN
  SELECT t.plan_tier INTO v_tier
    FROM public.tenants t
   WHERE t.id = p_tenant_id;

  IF v_tier IS NULL THEN
    v_tier := 'pending';
  END IF;

  v_limit := COALESCE((p_agent_limits ->> v_tier)::INTEGER, 0);

  IF v_limit >= 0 THEN
    -- Serialize concurrent creates for this tenant so the count-then-insert
    -- cannot oversubscribe the limit.
    PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

    SELECT COUNT(*)
      INTO v_count
      FROM public.agents
     WHERE tenant_id = p_tenant_id
       AND status <> 'retired';

    IF v_count >= v_limit THEN
      RETURN QUERY SELECT FALSE, v_count, v_tier, NULL::JSONB;
      RETURN;
    END IF;
  ELSE
    v_count := 0;  -- unlimited tier
  END IF;

  INSERT INTO public.agents (
    tenant_id, name, model_hash, model, version, description, metadata, status
  )
  VALUES (
    p_tenant_id, p_name, p_model_hash, p_model, p_version, p_description,
    COALESCE(p_metadata, '{}'::JSONB), 'pending'
  )
  RETURNING * INTO v_agent;

  RETURN QUERY SELECT
    TRUE,
    CASE WHEN v_limit >= 0 THEN v_count + 1 ELSE 0 END,
    v_tier,
    to_jsonb(v_agent);
END;
$$;

REVOKE ALL ON FUNCTION public.create_agent_with_quota(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agent_with_quota(UUID, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
