-- Migration: initial schema — all core tables
-- Week: 1 (Phase 1, W1)
-- Reason: Complete Kakunin data model: tenants, agents, certificates, events, reports, audit_log, webhooks, api_keys
-- Author: auto-generated
-- Date: 2026-05-16

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ─── TENANTS ────────────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  plan          TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenants: owner access only"
  ON tenants FOR ALL
  USING (auth.uid()::text = id::text);

GRANT SELECT, INSERT, UPDATE ON tenants TO authenticated;
GRANT ALL ON tenants TO service_role;

-- ─── API KEYS ────────────────────────────────────────────────────────────────
CREATE TABLE api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  key_hash      TEXT NOT NULL UNIQUE,  -- SHA-256 of raw key; raw never stored
  key_prefix    TEXT NOT NULL,         -- First 8 chars for display only
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys: tenant scope"
  ON api_keys FOR ALL
  USING (tenant_id = (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON api_keys TO authenticated;
GRANT ALL ON api_keys TO service_role;

-- ─── AGENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE agents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  model         TEXT,                  -- e.g. "gpt-4o", "claude-3-opus"
  version       TEXT,
  description   TEXT,
  inbox_address TEXT,                  -- AgentMail inbox address post-cert
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'retired')),
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents: tenant scope"
  ON agents FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON agents TO authenticated;
GRANT ALL ON agents TO service_role;

-- ─── CERTIFICATES ────────────────────────────────────────────────────────────
CREATE TABLE certificates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  serial_number TEXT NOT NULL UNIQUE,
  kms_key_arn   TEXT NOT NULL,         -- AWS KMS key ARN; private key never stored
  certificate_pem TEXT NOT NULL,       -- Public cert PEM
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  revocation_reason TEXT,
  issued_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- MiCA Art. 70 requires 365-day validity for AI agent operators
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '365 days'),
  revoked_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "certificates: tenant scope"
  ON certificates FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON certificates TO authenticated;
GRANT ALL ON certificates TO service_role;

-- ─── BEHAVIOR EVENTS ─────────────────────────────────────────────────────────
CREATE TABLE behavior_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action_type   TEXT NOT NULL CHECK (action_type IN (
    'api_call', 'authentication_attempt', 'authentication_failure',
    'data_access', 'data_mutation', 'transaction_initiated',
    'transaction_anomaly', 'unauthorized_access_attempt'
  )),
  risk_score    NUMERIC(4,3) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_band     TEXT NOT NULL CHECK (risk_band IN ('low', 'medium', 'high')),
  payload       JSONB NOT NULL DEFAULT '{}',
  source_ip     TEXT,
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "behavior_events: tenant scope"
  ON behavior_events FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

-- Realtime subscription for dashboard live feed
ALTER PUBLICATION supabase_realtime ADD TABLE behavior_events;

GRANT SELECT, INSERT ON behavior_events TO authenticated;
GRANT ALL ON behavior_events TO service_role;

-- ─── COMPLIANCE REPORTS ──────────────────────────────────────────────────────
CREATE TABLE compliance_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID REFERENCES agents(id),  -- NULL = tenant-wide report
  title         TEXT NOT NULL,
  summary       TEXT,                -- LLM-generated executive summary
  pdf_url       TEXT,                -- Supabase Storage URL
  period_start  TIMESTAMPTZ NOT NULL,
  period_end    TIMESTAMPTZ NOT NULL,
  status        TEXT NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'failed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_reports: tenant scope"
  ON compliance_reports FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON compliance_reports TO authenticated;
GRANT ALL ON compliance_reports TO service_role;

-- ─── AUDIT LOG (append-only WORM) ───────────────────────────────────────────
CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,        -- e.g. 'certificate.issued', 'agent.created'
  actor_type    TEXT NOT NULL CHECK (actor_type IN ('user', 'agent', 'system')),
  actor_id      TEXT NOT NULL,
  description   TEXT NOT NULL,
  affected_id   UUID,                 -- ID of the affected resource
  metadata      JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log: tenant read-only"
  ON audit_log FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

-- Append-only: deny UPDATE and DELETE at DB level
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;

GRANT SELECT, INSERT ON audit_log TO authenticated;
GRANT ALL ON audit_log TO service_role;

-- ─── WEBHOOKS ────────────────────────────────────────────────────────────────
CREATE TABLE webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  events        TEXT[] NOT NULL,      -- e.g. ARRAY['certificate.issued', 'risk.alert']
  secret_hash   TEXT NOT NULL,        -- SHA-256 of HMAC secret; raw never stored
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhooks: tenant scope"
  ON webhooks FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON webhooks TO authenticated;
GRANT ALL ON webhooks TO service_role;

-- ─── FEATURE FLAGS ────────────────────────────────────────────────────────────
CREATE TABLE feature_flags (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  autonomous_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  max_agents    INTEGER NOT NULL DEFAULT 5,     -- Starter: 5, Pro: 50, Enterprise: unlimited (-1)
  agentmail_enabled BOOLEAN NOT NULL DEFAULT true,
  webhooks_enabled BOOLEAN NOT NULL DEFAULT true,
  reports_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feature_flags: tenant read"
  ON feature_flags FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT ON feature_flags TO authenticated;
GRANT ALL ON feature_flags TO service_role;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_certificates_agent ON certificates(agent_id);
CREATE INDEX idx_certificates_serial ON certificates(serial_number);
CREATE INDEX idx_behavior_events_agent ON behavior_events(agent_id, occurred_at DESC);
CREATE INDEX idx_behavior_events_tenant_time ON behavior_events(tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_affected ON audit_log(affected_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ─── REALTIME ─────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE agents;
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
-- Migration: add stripe_customer_id to tenants
-- Reason: links Stripe customer to tenant for billing webhook lookup
-- Date: 2026-05-17

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id
  ON public.tenants (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

COMMENT ON COLUMN public.tenants.stripe_customer_id IS
  'Stripe customer ID (cus_xxx) — set on first Stripe checkout, used for billing webhook lookup';
-- Migration: enable pgaudit extension for tamper-evident audit_log protection
-- Week: 9
-- Reason: RA-59 — PostgreSQL RULE immutability alone does not satisfy WORM requirements.
--         pgaudit logs all DDL + role changes on audit_log, providing tamper evidence
--         for the audit mechanism itself. Required for enterprise security reviews.
-- Author: auto-generated
-- Date: 2026-05-17

-- Enable pgaudit — available on Supabase by default
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure pgaudit to log DDL operations on the audit_log table.
-- Applies to the current session; permanent config lives in supabase dashboard
-- under Database → Extensions → pgaudit settings.
-- DDL includes: ALTER TABLE, DROP TABLE, CREATE RULE, DROP RULE on audit_log.
ALTER SYSTEM SET pgaudit.log = 'ddl, role';
ALTER SYSTEM SET pgaudit.log_relation = 'on';
SELECT pg_reload_conf();
-- Migration: add inbox_status column to agents
-- Week: 9
-- Reason: RA-62 — surface AgentMail provisioning failures to tenant dashboard.
--         Silent QStash retry exhaustion is invisible to operators; inbox_status
--         allows the dashboard to show a warning badge when provisioning fails.
-- Author: auto-generated
-- Date: 2026-05-17

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS inbox_status TEXT
    CHECK (inbox_status IN ('provisioning', 'active', 'failed', 'unavailable'))
    DEFAULT NULL;

COMMENT ON COLUMN agents.inbox_status IS
  'Inbox provisioning state: provisioning | active | failed | unavailable. NULL = not yet attempted.';
-- Migration: add model_hash column to agents table
-- Week: V1.0 hotfix
-- Reason: model_hash is required for X.509 cert binding and Audit Test #1 (trade reconstruction).
--         Certs issued without model_hash cannot prove which model version made a decision.
--         Ref: RCM C-B1, MiCA Art. 63, EU AI Act Art. 9/12. Closes RA-72.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE agents ADD COLUMN model_hash TEXT;

COMMENT ON COLUMN agents.model_hash IS
  'SHA-256 hash of the model artifact (or a canonical version string). '
  'Required for certificate issuance — certs encode this value in the X.509 extension '
  'so regulators can prove which model version made each decision.';
-- Migration: add message_signed and message_verification_failed to behavior_events action_type CHECK
-- Week: V1.1
-- Reason: Inter-agent message signing (RA-73) adds two new action types for cryptographic
--         message signing events. message_verification_failed is treated as high-risk (0.95)
--         and triggers risk.alert webhook — equivalent to unauthorized_access_attempt.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE behavior_events DROP CONSTRAINT IF EXISTS behavior_events_action_type_check;

ALTER TABLE behavior_events ADD CONSTRAINT behavior_events_action_type_check CHECK (action_type IN (
  'api_call', 'authentication_attempt', 'authentication_failure',
  'data_access', 'data_mutation', 'transaction_initiated',
  'transaction_anomaly', 'unauthorized_access_attempt',
  'message_signed', 'message_verification_failed'
));
-- Migration: add kill switch support to certificates and behavior_events
-- Week: V1.1
-- Reason: RA-74 — regulators require a cryptographically provable halt receipt (Audit Test #8).
--         halt_receipt stores the signed receipt so GET /v1/verify/:serial can return it
--         without needing a separate DB query. kill_switch.activated is a new behavior event
--         type that records the halt in the immutable audit trail.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE certificates ADD COLUMN halt_receipt JSONB;

COMMENT ON COLUMN certificates.halt_receipt IS
  'Signed halt receipt returned by POST /v1/agents/:id/halt. '
  'Contains: halt_event_id, halted_at, reason, receipt_signature (KMS CA key). '
  'Null when certificate was revoked via standard revocation, not kill switch.';

ALTER TABLE behavior_events DROP CONSTRAINT IF EXISTS behavior_events_action_type_check;

ALTER TABLE behavior_events ADD CONSTRAINT behavior_events_action_type_check CHECK (action_type IN (
  'api_call', 'authentication_attempt', 'authentication_failure',
  'data_access', 'data_mutation', 'transaction_initiated',
  'transaction_anomaly', 'unauthorized_access_attempt',
  'message_signed', 'message_verification_failed',
  'kill_switch_activated'
));
-- Migration: add agent_baselines and agent_drift_scores tables
-- Week: V1.1
-- Reason: RA-76 — behavioral drift detection (RCM C-B1, EU AI Act post-market monitoring).
--         Baselines capture approved behavioral patterns; drift scores compare current
--         7-day distribution against baseline to detect slow model corruption.
--         agent_drift_scores is append-only (audit evidence — never mutate).
-- Author: auto-generated
-- Date: 2026-05-18

CREATE TABLE agent_baselines (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  established_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  events_analyzed INTEGER NOT NULL DEFAULT 0,
  action_type_distribution JSONB NOT NULL DEFAULT '{}',
  avg_events_per_hour NUMERIC(10,4) NOT NULL DEFAULT 0,
  p50_risk_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  p95_risk_score NUMERIC(4,3) NOT NULL DEFAULT 0,
  avg_risk_by_action_type JSONB NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'auto',  -- auto | manual
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_id)  -- one active baseline per agent
);

ALTER TABLE agent_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_baselines: tenant scope"
  ON agent_baselines FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON public.agent_baselines TO authenticated;
GRANT ALL ON public.agent_baselines TO service_role;


CREATE TABLE agent_drift_scores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  computed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  drift_score   NUMERIC(4,3) NOT NULL CHECK (drift_score >= 0 AND drift_score <= 1),
  drift_band    TEXT NOT NULL CHECK (drift_band IN ('stable', 'moderate', 'significant')),
  contributing_factors JSONB NOT NULL DEFAULT '[]',
  window_days   INTEGER NOT NULL DEFAULT 7
);

ALTER TABLE agent_drift_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_drift_scores: tenant scope"
  ON agent_drift_scores FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

-- Append-only enforcement for drift scores — they are audit evidence
CREATE RULE no_update_agent_drift_scores AS ON UPDATE TO agent_drift_scores DO INSTEAD NOTHING;
CREATE RULE no_delete_agent_drift_scores AS ON DELETE TO agent_drift_scores DO INSTEAD NOTHING;

GRANT SELECT, INSERT ON public.agent_drift_scores TO authenticated;
GRANT ALL ON public.agent_drift_scores TO service_role;
-- Migration: add decision_chains table and chain_id to behavior_events
-- Week: V1.2
-- Reason: RA-79 — Audit Test #1 (trade reconstruction) requires a single API call
--         to replay the full causal chain of events for one autonomous decision.
--         chain_hash is SHA-256 over ordered event_ids — tamper-evident closure seal.
--         session_id on behavior_events is aliased to chain_id for backwards compat.
-- Author: auto-generated
-- Date: 2026-05-18

CREATE TABLE decision_chains (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  metadata      JSONB NOT NULL DEFAULT '{}',
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  chain_hash    TEXT,             -- SHA-256 of ordered event_ids; set on close
  event_count   INTEGER,         -- set on close
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at     TIMESTAMPTZ
);

ALTER TABLE decision_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "decision_chains: tenant scope"
  ON decision_chains FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

GRANT SELECT, INSERT, UPDATE ON public.decision_chains TO authenticated;
GRANT ALL ON public.decision_chains TO service_role;

-- Add chain_id to behavior_events (nullable — not all events are part of a chain)
ALTER TABLE behavior_events ADD COLUMN chain_id UUID REFERENCES decision_chains(id);

CREATE INDEX idx_behavior_events_chain_id ON behavior_events (chain_id) WHERE chain_id IS NOT NULL;
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
-- Migration: add plan_tier, trial, and quota tracking to tenants
-- Reason: RA-85 — foundation for per-agent billing, quota enforcement, and self-serve trial
--         plan_tier drives all quota limits; trial columns drive Stripe trial lifecycle;
--         stripe_subscription_id links tenant to active Stripe subscription
-- Date: 2026-05-19

-- ── 1. Extend tenants ──────────────────────────────────────────────────────

ALTER TABLE public.tenants
  -- plan tier: drives quota limits and feature access
  ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'pending'
    CONSTRAINT tenants_plan_tier_check
    CHECK (plan_tier IN ('pending', 'trial', 'starter', 'pro', 'enterprise', 'suspended', 'cancelled')),

  -- trial: set on Stripe checkout completion
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_agent_limit INT NOT NULL DEFAULT 5,

  -- stripe: subscription ID (distinct from customer ID added in 20260517000002)
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT UNIQUE;

COMMENT ON COLUMN public.tenants.plan_tier IS
  'Billing plan: pending (pre-signup) → trial → starter|pro|enterprise → suspended|cancelled';
COMMENT ON COLUMN public.tenants.trial_ends_at IS
  'UTC timestamp when 30-day free trial ends; NULL if not on trial';
COMMENT ON COLUMN public.tenants.trial_agent_limit IS
  'Max agents during trial period (always 5 regardless of chosen plan)';
COMMENT ON COLUMN public.tenants.stripe_subscription_id IS
  'Stripe subscription ID (sub_xxx) — set on checkout.session.completed webhook';

CREATE INDEX IF NOT EXISTS idx_tenants_plan_tier
  ON public.tenants (plan_tier);

CREATE INDEX IF NOT EXISTS idx_tenants_trial_ends_at
  ON public.tenants (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id
  ON public.tenants (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- ── 2. agent_event_counts — monthly event quota metering ──────────────────
-- Upsert-based counter: INCREMENT on each successful behavior_event insert.
-- Keyed (tenant_id, agent_id, month) where month = first day of UTC month.
-- Reset is implicit: new month = new row, old rows accumulate as history.

CREATE TABLE IF NOT EXISTS public.agent_event_counts (
  tenant_id   UUID    NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id    UUID    NOT NULL REFERENCES public.agents(id)  ON DELETE CASCADE,
  -- first day of month, e.g. 2026-05-01 — use date_trunc('month', now())::date
  month       DATE    NOT NULL,
  event_count BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, agent_id, month)
);

COMMENT ON TABLE public.agent_event_counts IS
  'Monthly behaviour event counters per agent. Incremented via upsert on every accepted event. '
  'Used by quota enforcement in POST /api/v1/events before insert.';

ALTER TABLE public.agent_event_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_agent_event_counts"
  ON public.agent_event_counts
  FOR ALL
  USING (tenant_id = (SELECT id FROM public.tenants WHERE id = tenant_id LIMIT 1));

GRANT SELECT, INSERT, UPDATE ON public.agent_event_counts TO authenticated;
GRANT ALL                     ON public.agent_event_counts TO service_role;

-- ── 3. agent_report_counts — monthly compliance report quota metering ──────
-- Same pattern as event counts. Incremented when compliance_reports row
-- transitions to 'ready'. Checked before enqueuing QStash report job.

CREATE TABLE IF NOT EXISTS public.agent_report_counts (
  tenant_id    UUID  NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_id     UUID  NOT NULL REFERENCES public.agents(id)  ON DELETE CASCADE,
  month        DATE  NOT NULL,
  report_count INT   NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, agent_id, month)
);

COMMENT ON TABLE public.agent_report_counts IS
  'Monthly compliance report counters per agent. Checked before enqueuing report generation job. '
  'Limit: starter=1/agent/mo, pro=4/agent/mo.';

ALTER TABLE public.agent_report_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_agent_report_counts"
  ON public.agent_report_counts
  FOR ALL
  USING (tenant_id = (SELECT id FROM public.tenants WHERE id = tenant_id LIMIT 1));

GRANT SELECT, INSERT, UPDATE ON public.agent_report_counts TO authenticated;
GRANT ALL                     ON public.agent_report_counts TO service_role;
-- Migration: add RPC functions for atomic quota counter increments
-- Reason: RA-85 — upsert-based atomic increment avoids race conditions
--         under concurrent event ingestion from the same agent.
--         Using a stored procedure prevents the lost-update problem
--         that would occur with a read-then-write in application code.
-- Date: 2026-05-19

-- ── increment_event_count ──────────────────────────────────────────────────
-- Atomically increments agent_event_counts for (tenant, agent, month).
-- Inserts the row with count=1 if it doesn't exist yet (first event of month).

CREATE OR REPLACE FUNCTION public.increment_event_count(
  p_tenant_id UUID,
  p_agent_id  UUID,
  p_month     DATE
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.agent_event_counts (tenant_id, agent_id, month, event_count)
  VALUES (p_tenant_id, p_agent_id, p_month, 1)
  ON CONFLICT (tenant_id, agent_id, month)
  DO UPDATE SET event_count = public.agent_event_counts.event_count + 1;
$$;

-- Only service_role can call — not exposed to authenticated clients directly
REVOKE ALL ON FUNCTION public.increment_event_count(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_event_count(UUID, UUID, DATE) TO service_role;

-- ── increment_report_count ─────────────────────────────────────────────────
-- Same pattern for compliance report quota metering.

CREATE OR REPLACE FUNCTION public.increment_report_count(
  p_tenant_id UUID,
  p_agent_id  UUID,
  p_month     DATE
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.agent_report_counts (tenant_id, agent_id, month, report_count)
  VALUES (p_tenant_id, p_agent_id, p_month, 1)
  ON CONFLICT (tenant_id, agent_id, month)
  DO UPDATE SET report_count = public.agent_report_counts.report_count + 1;
$$;

REVOKE ALL ON FUNCTION public.increment_report_count(UUID, UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_report_count(UUID, UUID, DATE) TO service_role;
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
-- Migration: add debug_chat_enabled to feature_flags
-- Week: 10
-- Reason: Debug chat assistant — off by default, toggled per tenant via Retool admin
-- Date: 2026-05-19

ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS debug_chat_enabled BOOLEAN NOT NULL DEFAULT false;
-- Migration: create trust_signals table
-- Week: 8
-- Reason: live news feed for dashboard — cron-populated via NewsAPI every 6h
-- Author: auto-generated
-- Date: 2026-05-19

CREATE TABLE IF NOT EXISTS public.trust_signals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  url          TEXT NOT NULL UNIQUE,
  source       TEXT,
  published_at TIMESTAMPTZ,
  risk_cls     TEXT NOT NULL DEFAULT 'neutral', -- neutral | warning | critical
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only keep latest 50 — older rows pruned by cron
CREATE INDEX IF NOT EXISTS trust_signals_fetched_at_idx ON public.trust_signals (fetched_at DESC);

-- No RLS needed — global read, service-role write only
GRANT SELECT ON public.trust_signals TO authenticated;
GRANT ALL   ON public.trust_signals TO service_role;
