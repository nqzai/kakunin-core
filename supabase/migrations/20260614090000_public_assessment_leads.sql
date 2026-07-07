-- Migration: public assessment leads
-- Week: lead-gen readiness
-- Reason: store free compliance readiness report submissions and scanned results
-- Author: Codex
-- Date: 2026-06-14

CREATE TABLE public.assessment_leads (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL,
  website_url          TEXT NOT NULL,
  website_domain       TEXT NOT NULL,
  final_url            TEXT,
  ecosystem            TEXT NOT NULL,
  ecosystem_confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  frameworks           TEXT[] NOT NULL DEFAULT '{}',
  recommendation       TEXT NOT NULL,
  summary              TEXT NOT NULL,
  certificate_risk     JSONB NOT NULL DEFAULT '{}',
  status               TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'limited')),
  scan_version         TEXT NOT NULL DEFAULT 'v1-static',
  page_title           TEXT,
  page_description     TEXT,
  evidence             JSONB NOT NULL DEFAULT '{}',
  source_ip            TEXT,
  consented_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessment_leads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.assessment_leads TO service_role;

CREATE INDEX idx_assessment_leads_email_created_at
  ON public.assessment_leads (email, created_at DESC);

CREATE INDEX idx_assessment_leads_domain_created_at
  ON public.assessment_leads (website_domain, created_at DESC);

COMMENT ON TABLE public.assessment_leads IS
  'Public free-compliance-report submissions captured from the marketing assessment flow.';
