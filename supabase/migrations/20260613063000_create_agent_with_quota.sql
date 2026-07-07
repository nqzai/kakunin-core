-- Migration: add atomic agent creation RPC with quota enforcement
-- Reason: prevent concurrent read-then-insert oversubscription in /api/v1/agents
--         by checking quota and inserting the row in one DB transaction.
-- Date: 2026-06-13

CREATE OR REPLACE FUNCTION public.create_agent_with_quota(
  p_tenant_id UUID,
  p_limit INTEGER,
  p_name TEXT,
  p_model_hash TEXT,
  p_model TEXT,
  p_version TEXT,
  p_description TEXT,
  p_metadata JSONB
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, agent JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_agent public.agents%ROWTYPE;
BEGIN
  IF p_limit > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text));

    SELECT COUNT(*)
      INTO v_count
      FROM public.agents
     WHERE tenant_id = p_tenant_id
       AND status <> 'retired';

    IF v_count >= p_limit THEN
      RETURN QUERY SELECT FALSE, v_count, NULL::JSONB;
      RETURN;
    END IF;
  ELSE
    v_count := 0;
  END IF;

  INSERT INTO public.agents (
    tenant_id,
    name,
    model_hash,
    model,
    version,
    description,
    metadata,
    status
  )
  VALUES (
    p_tenant_id,
    p_name,
    p_model_hash,
    p_model,
    p_version,
    p_description,
    COALESCE(p_metadata, '{}'::JSONB),
    'pending'
  )
  RETURNING *
    INTO v_agent;

  RETURN QUERY SELECT TRUE, CASE WHEN p_limit > 0 THEN v_count + 1 ELSE 0 END, to_jsonb(v_agent);
END;
$$;

REVOKE ALL ON FUNCTION public.create_agent_with_quota(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_agent_with_quota(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;
