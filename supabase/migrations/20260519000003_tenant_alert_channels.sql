-- Migration: add tenant_alert_channels for BYOA alert integrations
-- Reason: Slack / PagerDuty / Twilio SMS / WhatsApp alert channels per tenant
-- Author: auto-generated
-- Date: 2026-05-19

CREATE TABLE public.tenant_alert_channels (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID        NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  channel_type TEXT        NOT NULL CHECK (channel_type IN ('slack', 'pagerduty', 'sms', 'whatsapp')),
  -- credentials stored as encrypted JSONB; never returned in API responses
  -- TODO(post-mvp): migrate to pgsodium vault secret per row for HSM-level encryption
  credentials  JSONB       NOT NULL,
  config       JSONB       NOT NULL DEFAULT '{}',
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Each tenant can have at most one channel of each type
CREATE UNIQUE INDEX tenant_alert_channels_tenant_type_idx
  ON public.tenant_alert_channels (tenant_id, channel_type)
  WHERE is_active = true;

ALTER TABLE public.tenant_alert_channels ENABLE ROW LEVEL SECURITY;

-- Tenants can read their own channels (credentials masked in application layer)
CREATE POLICY "tenant_alert_channels_select" ON public.tenant_alert_channels
  FOR SELECT USING (
    tenant_id = (
      SELECT id FROM public.tenants
      WHERE email = auth.email()
      LIMIT 1
    )
  );

-- No direct insert/update from client — service role only
CREATE POLICY "tenant_alert_channels_service_role" ON public.tenant_alert_channels
  FOR ALL USING (auth.role() = 'service_role');

GRANT SELECT ON public.tenant_alert_channels TO authenticated;
GRANT ALL ON public.tenant_alert_channels TO service_role;
