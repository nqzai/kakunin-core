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
