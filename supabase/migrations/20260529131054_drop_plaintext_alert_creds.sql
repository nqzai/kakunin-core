-- Migration: drop deprecated plaintext credentials column on alert channels
-- Week: pilot-hardening (RA-152)
-- Reason: tenant_alert_channels.credentials stored third-party secrets (Slack
--         tokens, PagerDuty routing keys, Twilio auth) as plaintext JSONB.
--         All credentials are now AES-256-GCM encrypted in credentials_enc and
--         the worker plaintext fallback has been removed. Drop the deprecated
--         column, its CHECK, and require credentials_enc. Table is empty in prod
--         so this is non-destructive.
-- Author: RA-152 Codex review remediation
-- Date: 2026-05-29

ALTER TABLE public.tenant_alert_channels
  DROP CONSTRAINT IF EXISTS credentials_or_enc_required;

ALTER TABLE public.tenant_alert_channels
  DROP COLUMN IF EXISTS credentials;

ALTER TABLE public.tenant_alert_channels
  ALTER COLUMN credentials_enc SET NOT NULL;

COMMENT ON COLUMN public.tenant_alert_channels.credentials_enc IS
  'AES-256-GCM encrypted JSON of BYOA credentials. Format: <iv_hex>:<authtag_hex>:<ciphertext_hex>. Encrypted with CREDENTIAL_ENCRYPTION_KEY. Required — plaintext credentials column removed in RA-152.';
