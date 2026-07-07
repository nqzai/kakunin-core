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
