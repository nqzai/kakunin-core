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
