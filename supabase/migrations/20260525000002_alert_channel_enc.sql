-- Migration: encrypt BYOA alert channel credentials at rest
-- Week: post-MVP
-- Reason: RA-101 — third-party secrets (Slack tokens, PagerDuty keys, Twilio auth)
--         must not live as plaintext JSONB. AES-256-GCM ciphertext stored instead.
-- Author: auto-generated
-- Date: 2026-05-25

-- Add encrypted credentials column (TEXT stores <iv_hex>:<authtag_hex>:<ciphertext_hex>)
ALTER TABLE public.tenant_alert_channels
  ADD COLUMN credentials_enc TEXT;

-- Make existing plaintext column nullable (rows provisioned after this migration
-- will have credentials = NULL; old rows retain plaintext until re-provisioned)
ALTER TABLE public.tenant_alert_channels
  ALTER COLUMN credentials DROP NOT NULL;

-- Add check: at least one of credentials or credentials_enc must be set
-- (allows gradual migration without orphaning existing rows)
ALTER TABLE public.tenant_alert_channels
  ADD CONSTRAINT credentials_or_enc_required
  CHECK (credentials IS NOT NULL OR credentials_enc IS NOT NULL);

COMMENT ON COLUMN public.tenant_alert_channels.credentials_enc IS
  'AES-256-GCM encrypted JSON of BYOA credentials. Format: <iv_hex>:<authtag_hex>:<ciphertext_hex>. Encrypted with CREDENTIAL_ENCRYPTION_KEY. Supersedes plaintext credentials column.';

COMMENT ON COLUMN public.tenant_alert_channels.credentials IS
  'DEPRECATED: plaintext credentials. Kept nullable for rows provisioned before RA-101. Re-provision channels to migrate to credentials_enc.';
