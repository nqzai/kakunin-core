'use server';

import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { stripe, TIERS, type PlanKey } from '@/lib/stripe/client';
import { resolveSessionTenantContext } from '@/lib/tenant/session';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

// ── Auth helper ────────────────────────────────────────────────────────────

async function getSession() {
  const session = await resolveSessionTenantContext();
  if (!session) return { user: null, tenant: null };
  return session;
}

// ── Create Stripe Checkout session ─────────────────────────────────────────

/**
 * Redirect the operator to Stripe Checkout for the selected plan.
 * Creates a Stripe Customer if one doesn't exist yet.
 * 30-day free trial for all new subscriptions.
 * Uses server action redirect — no client JS needed.
 */
export async function createCheckoutSession(plan: PlanKey): Promise<never> {
  const { user, tenant } = await getSession();
  if (!user || !tenant) redirect('/login');

  const tier = TIERS[plan];
  if (!tier.priceId) {
    // Price ID not configured yet — redirect back with error
    redirect('/dashboard/billing?error=price_not_configured');
  }

  const db = createServiceClient();

  // Resolve or create Stripe customer
  let customerId = tenant.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant.email ?? undefined,
      name: tenant.name ?? undefined,
      metadata: { tenant_id: tenant.id, kakunin_plan: plan },
    });
    customerId = customer.id;

    // Persist customer ID immediately
    await db
      .from('tenants')
      .update({ stripe_customer_id: customerId })
      .eq('id', tenant.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: tier.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 30,
      metadata: { tenant_id: tenant.id, plan },
    },
    metadata: { tenant_id: tenant.id, plan },
    success_url: `${APP_URL}/dashboard/billing?success=1&plan=${plan}`,
    cancel_url: `${APP_URL}/dashboard/billing?cancelled=1`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  redirect(session.url!);
}

/**
 * Redirect to Stripe Billing Portal for self-serve plan management.
 * RA-34 will embed this properly; for now redirect to hosted portal.
 */
export async function createPortalSession(): Promise<never> {
  const { user, tenant } = await getSession();
  if (!user || !tenant?.stripe_customer_id) redirect('/dashboard/billing');

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${APP_URL}/dashboard/billing`,
  });

  redirect(session.url);
}
