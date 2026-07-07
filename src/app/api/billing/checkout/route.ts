import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { stripe, TIERS, type PlanKey } from '@/lib/stripe/client';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

const bodySchema = z.object({
  plan: z.enum(['starter', 'pro']),
});

/**
 * POST /api/billing/checkout
 *
 * Creates a Stripe Checkout session for the authenticated user's tenant.
 * - trial_period_days: 30 (30-day free trial, CC collected upfront)
 * - quantity: plan minimum (5 for Starter, 20 for Pro)
 * - Metadata includes tenantId + planTier so the webhook can activate the tenant
 *
 * Returns { url } — client redirects to Stripe Checkout.
 * Requires active Supabase session (called from /signup/plan client page).
 */
export async function POST(req: NextRequest) {
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext?.tenant) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  const { user, tenant } = appContext;

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { plan } = body.data;
  const tier = TIERS[plan as PlanKey];

  if (!tier.priceId) {
    return NextResponse.json(
      { error: `Stripe price not configured for plan: ${plan}. Set STRIPE_${plan.toUpperCase()}_PRICE_ID.` },
      { status: 503 }
    );
  }

  const origin = req.headers.get('origin') ?? 'https://kakunin.ai';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: tenant.stripe_customer_id ?? undefined,
    customer_email: !tenant.stripe_customer_id ? (tenant.email ?? user.email) : undefined,
    line_items: [
      {
        price: tier.priceId,
        // Start at plan minimum — quantity auto-syncs via updateSubscriptionQuantity on agent CRUD
        quantity: tier.minAgents,
      },
    ],
    subscription_data: {
      // 30-day free trial — card collected upfront, charged on day 31
      trial_period_days: 30,
      trial_settings: {
        end_behavior: {
          // Cancel subscription (not pause) if payment fails at trial end
          missing_payment_method: 'cancel',
        },
      },
      metadata: {
        tenant_id: tenant.id,
        plan_tier: plan,
      },
    },
    metadata: {
      tenant_id: tenant.id,
      plan_tier: plan,
    },
    success_url: `${origin}/dashboard/get-started?checkout=success`,
    cancel_url: `${origin}/signup/plan`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
