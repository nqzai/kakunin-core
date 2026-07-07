import 'server-only';
import Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { log } from '@/lib/logging';

// Re-export plan metadata for server-side consumers — source of truth is plans.ts
export type { PlanKey, TierDef } from './plans';
export { TIER_ORDER } from './plans';
import { TIERS as BASE_TIERS } from './plans';
import type { PlanKey } from './plans';

/**
 * Stripe singleton — lazily initialized at first use.
 * During build, STRIPE_SECRET_KEY may not be available — that's OK.
 * Do NOT import this in client components — use @/lib/stripe/plans for tier data.
 */
let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    stripeInstance = new Stripe(key, {
      apiVersion: '2026-04-22.dahlia',
    });
  }
  return stripeInstance;
}

export const stripe = new Proxy({} as unknown as Stripe, {
  get(target, prop: string | symbol) {
    const instance = getStripe();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

// ── Server-side tier map with price IDs (env vars only available server-side) ─
// Merges plan data from plans.ts with Stripe price IDs from Doppler env vars
// Server-side tier map — adds Stripe price IDs (env vars, server-only)
export const TIERS = {
  starter: { ...BASE_TIERS.starter, priceId: process.env.STRIPE_STARTER_PRICE_ID as string | undefined },
  pro:     { ...BASE_TIERS.pro,     priceId: process.env.STRIPE_PRO_PRICE_ID     as string | undefined },
} as const;

/** Map Stripe price ID → plan key */
export function planFromPriceId(priceId: string): PlanKey | null {
  for (const tier of Object.values(TIERS)) {
    if (tier.priceId && tier.priceId === priceId) return tier.key;
  }
  return null;
}

/**
 * Syncs the tenant's Stripe subscription quantity to match their current
 * non-retired agent count. Enforces plan minimum (5 Starter, 20 Pro).
 *
 * Fire-and-forget safe — logs errors, never throws.
 * No-ops when: no subscription ID, plan is trial/suspended/cancelled.
 */
export async function updateSubscriptionQuantity(
  supabase: SupabaseClient<Database>,
  tenantId: string,
): Promise<void> {
  try {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_subscription_id, plan_tier')
      .eq('id', tenantId)
      .single();

    // Only sync for active paid plans
    if (!tenant?.stripe_subscription_id) return;
    if (!['starter', 'pro'].includes(tenant.plan_tier)) return;

    const { count } = await supabase
      .from('agents')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .neq('status', 'retired');

    const agentCount = count ?? 0;
    const planKey = tenant.plan_tier as PlanKey;
    // Never go below plan minimum — Stripe rejects it and invoice would undercharge
    const minAgents = TIERS[planKey]?.minAgents ?? 1;
    const quantity = Math.max(agentCount, minAgents);

    const subscription = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id);
    const itemId = subscription.items.data[0]?.id;
    if (!itemId) return;

    const currentQty = subscription.items.data[0]?.quantity ?? 0;
    if (currentQty === quantity) return; // no change — skip API call

    await stripe.subscriptionItems.update(itemId, { quantity });
    log.info('[stripe] subscription quantity synced', { tenantId, quantity, previous: currentQty });
  } catch (err) {
    // Never throw — quantity sync failure must not block agent CRUD response
    log.warn('[stripe] updateSubscriptionQuantity failed', { tenantId, error: (err as Error).message });
  }
}
