-- Migration: add crl_cache table for CRL storage
-- Week: V1.2
-- Reason: RA-69 — offline revocation checking via standard X.509 CRL.
--         Singleton table (id=1) stores the latest CA-signed CRL DER.
--         Regenerated on every revocation and every 24h via QStash cron.
-- Author: auto-generated
-- Date: 2026-05-18

CREATE TABLE public.crl_cache (
  id            INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton
  der_hex       TEXT        NOT NULL,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_update_at TIMESTAMPTZ NOT NULL,
  revoked_count INTEGER     NOT NULL DEFAULT 0
);

-- Public read (CRL is unauthenticated by design — standard X.509 convention)
GRANT SELECT ON public.crl_cache TO authenticated;
GRANT ALL    ON public.crl_cache TO service_role;

COMMENT ON TABLE public.crl_cache IS
  'Singleton cache for the Kakunin CA Certificate Revocation List (CRL). '
  'One row (id=1). Upserted by the /v1/crl/generate QStash worker.';
