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
