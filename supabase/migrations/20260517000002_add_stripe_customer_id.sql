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
