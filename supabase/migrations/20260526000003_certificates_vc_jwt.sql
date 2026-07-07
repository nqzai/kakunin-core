-- Migration: add vc_jwt column to certificates
-- Reason: RA-97 — OID4VC Agent Passport. W3C Verifiable Credential (JWT format)
--         issued alongside X.509 cert on certify. NULL for certs issued before RA-97.
-- Date: 2026-05-26

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS vc_jwt TEXT;

COMMENT ON COLUMN public.certificates.vc_jwt IS
  'W3C Verifiable Credential (vc+jwt format, RFC 7519). Signed by Kakunin CA via KMS. '
  'NULL for certs issued before RA-97. Non-qualified — explicitly not QES.';
