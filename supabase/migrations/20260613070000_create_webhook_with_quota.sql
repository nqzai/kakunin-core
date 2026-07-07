-- Migration: add atomic webhook creation RPC with quota enforcement
-- Reason: prevent concurrent read-then-insert oversubscription in /api/v1/webhooks
--         by checking quota and inserting the row in one DB transaction.
-- Date: 2026-06-13

CREATE OR REPLACE FUNCTION public.create_webhook_with_quota(
  p_tenant_id UUID,
  p_limit INTEGER,
  p_url TEXT,
  p_events JSONB,
  p_secret_hash TEXT,
  p_secret_enc TEXT
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, webhook JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_webhook public.webhooks%ROWTYPE;
BEGIN
  IF p_limit > 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(p_tenant_id::text || ':webhooks'));

    SELECT COUNT(*)
      INTO v_count
      FROM public.webhooks
     WHERE tenant_id = p_tenant_id
       AND active = TRUE;

    IF v_count >= p_limit THEN
      RETURN QUERY SELECT FALSE, v_count, NULL::JSONB;
      RETURN;
    END IF;
  ELSE
    v_count := 0;
  END IF;

  INSERT INTO public.webhooks (
    tenant_id,
    url,
    events,
    secret_hash,
    secret_enc,
    active
  )
  VALUES (
    p_tenant_id,
    p_url,
    ARRAY(SELECT jsonb_array_elements_text(p_events)),
    p_secret_hash,
    p_secret_enc,
    TRUE
  )
  RETURNING *
    INTO v_webhook;

  RETURN QUERY SELECT TRUE, CASE WHEN p_limit > 0 THEN v_count + 1 ELSE 0 END, to_jsonb(v_webhook);
END;
$$;

REVOKE ALL ON FUNCTION public.create_webhook_with_quota(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_webhook_with_quota(UUID, INTEGER, TEXT, JSONB, TEXT, TEXT) TO service_role;
