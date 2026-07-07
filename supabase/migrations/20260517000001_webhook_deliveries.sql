-- Migration: add secret_enc to webhooks + create webhook_deliveries table
-- Week: 6
-- Reason: outbound HMAC signing requires raw secret (AES-256-GCM encrypted);
--         webhook_deliveries tracks every delivery attempt for audit + dashboard
-- Author: auto-generated
-- Date: 2026-05-17

-- ─── webhooks: add encrypted secret column ────────────────────────────────────
-- secret_hash (existing) = SHA-256 of raw secret — kept for tamper detection
-- secret_enc  (new)      = AES-256-GCM(raw_secret, WEBHOOK_SECRET_KEY)
--                          iv:authtag:ciphertext all hex, set server-side
--                          Required to sign outbound payloads with HMAC-SHA256

ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS secret_enc TEXT NOT NULL DEFAULT '';

-- ─── webhook_deliveries ───────────────────────────────────────────────────────

CREATE TABLE webhook_deliveries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'delivered', 'failed')),
  attempt         INTEGER NOT NULL DEFAULT 1,
  response_status INTEGER,
  response_body   TEXT,
  error_message   TEXT,
  delivered_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_deliveries: tenant scope"
  ON webhook_deliveries FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

-- append-only — no UPDATE/DELETE for authenticated (delivery worker uses service role)
GRANT SELECT, INSERT ON public.webhook_deliveries TO authenticated;
GRANT ALL ON public.webhook_deliveries TO service_role;

-- fast lookup by webhook_id (dashboard) and tenant+status (failed deliveries)
CREATE INDEX idx_webhook_deliveries_webhook_id ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX idx_webhook_deliveries_tenant_status ON webhook_deliveries (tenant_id, status, created_at DESC);
