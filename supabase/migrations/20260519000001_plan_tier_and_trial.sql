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
