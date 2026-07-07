import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import Stripe from 'stripe';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { log } from '@/lib/logging';
import { planFromPriceId } from '@/lib/stripe/client';

/**
 * POST /api/webhooks/stripe
 *
 * Receives Stripe webhook events, updates plan + feature_flags, and sends emails.
 * Verifies signature with STRIPE_WEBHOOK_SECRET before processing.
 * Always returns 200 to Stripe — email dispatch is async via QStash.
 *
 * Handled events:
 *   customer.subscription.created        → activate plan + feature_flags
 *   customer.subscription.updated        → update plan + feature_flags + audit_log
 *   customer.subscription.deleted        → downgrade to free + feature_flags + email
 *   customer.subscription.trial_will_end → billing.trial_ending_7d email
 *   invoice.payment_failed               → billing.payment_failed email + suspend
 *   invoice.payment_succeeded            → restore suspended tenant to active plan
 */

export const dynamic = 'force-dynamic';

const stripeKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeKey ? new Stripe(stripeKey, {
  apiVersion: '2026-04-22.dahlia',
}) : null;

export async function POST(req: NextRequest) {
  if (!stripe || !webhookSecret) {
    log.error('[stripe.webhook] Stripe not configured');
    return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
  }

  const rawBody = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Verify webhook signature — reject tampered payloads
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    log.error('[stripe.webhook] Signature verification failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    // ── Checkout completed → activate trial ──────────────────────────────────
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== 'subscription') break;

      const tenantId = session.metadata?.tenant_id;
      const planTier = session.metadata?.plan_tier ?? 'starter';
      const subscriptionId = String(session.subscription ?? '');
      const customerId = String(session.customer ?? '');

      if (!tenantId) {
        log.error('[stripe.webhook] checkout.session.completed missing tenant_id metadata');
        break;
      }

      // Fetch subscription to get trial_end timestamp
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const trialEndsAt = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null;

      await supabase
        .from('tenants')
        .update({
          plan_tier: planTier,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: customerId,
          trial_ends_at: trialEndsAt,
          trial_agent_limit: 5, // always 5 regardless of plan during trial
        })
        .eq('id', tenantId);

      await writeAuditLog(supabase, {
        tenant_id: tenantId,
        event_type: 'tenant.trial_started',
        actor_type: 'system',
        actor_id: 'stripe',
        description: `Trial started: plan=${planTier}, trial_ends=${trialEndsAt}`,
        affected_id: subscriptionId,
        metadata: { stripe_subscription_id: subscriptionId, plan_tier: planTier, trial_ends_at: trialEndsAt },
      });

      // Send trial confirmation email
      const { data: tenant } = await supabase
        .from('tenants')
        .select('email')
        .eq('id', tenantId)
        .single();

      if (tenant?.email) {
        const trialEndsFormatted = trialEndsAt
          ? new Date(trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
          : 'day 31';
        const planName = planTier === 'pro' ? 'Professional' : 'Starter';

        await dispatchEmail({
          template: 'billing.trial_started',
          to: tenant.email,
          data: { planName, trialEnds: trialEndsFormatted },
        });
      }

      log.info('[stripe.webhook] trial activated', { tenantId, planTier, trialEndsAt });
      break;
    }

    // ── Subscription updated (post-trial activation, plan changes) ───────────
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);

      const priceId = subscription.items.data[0]?.price?.id ?? '';
      const planTier = planFromPriceId(priceId) ?? 'starter';

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email, plan_tier')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!tenant) {
        log.error('[stripe.webhook] Tenant not found for customer', { customerId });
        break;
      }

      const previousPlan = tenant.plan_tier;

      // On trial conversion (status changes from trialing → active), clear trial_agent_limit
      const isConversion = subscription.status === 'active' && subscription.trial_end !== null;
      const baseUpdates = {
        plan_tier: planTier,
        stripe_subscription_id: subscription.id,
      };
      const updates = isConversion
        // Trial over — full plan quota unlocks via PLAN_LIMITS (no DB cap needed)
        ? { ...baseUpdates, trial_agent_limit: null as unknown as number, trial_ends_at: null }
        : baseUpdates;

      await supabase.from('tenants').update(updates).eq('id', tenant.id);

      await writeAuditLog(supabase, {
        tenant_id: tenant.id,
        event_type: isConversion ? 'tenant.converted' : 'billing.subscription.updated',
        actor_type: 'system',
        actor_id: 'stripe',
        description: `Subscription ${isConversion ? 'trial converted' : 'updated'}: ${previousPlan} → ${planTier}`,
        affected_id: subscription.id,
        metadata: { stripe_subscription_id: subscription.id, previous_plan: previousPlan, plan_tier: planTier, status: subscription.status },
      });

      log.info('[stripe.webhook] subscription synced', { tenantId: tenant.id, planTier, event: event.type });
      break;
    }

    // ── Subscription cancelled ───────────────────────────────────────────────
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email, plan_tier')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!tenant) {
        log.error('[stripe.webhook] Tenant not found for customer', { customerId });
        break;
      }

      const previousPlan = tenant.plan_tier;

      await supabase
        .from('tenants')
        .update({ plan_tier: 'cancelled' })
        .eq('id', tenant.id);

      await writeAuditLog(supabase, {
        tenant_id: tenant.id,
        event_type: 'billing.subscription.cancelled',
        actor_type: 'system',
        actor_id: 'stripe',
        description: `Subscription cancelled: ${previousPlan} → cancelled`,
        affected_id: subscription.id,
        metadata: { stripe_subscription_id: subscription.id, previous_plan: previousPlan },
      });

      if (tenant.email) {
        await dispatchEmail({
          template: 'billing.subscription_cancelled',
          to: tenant.email,
          data: { tenantId: tenant.id, previousPlan },
        });
      }

      log.info('[stripe.webhook] subscription cancelled', { tenantId: tenant.id });
      break;
    }

    // ── Trial ending in 7 days ───────────────────────────────────────────────
    case 'customer.subscription.trial_will_end': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);
      const trialEnd = subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
        : 'soon';

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email')
        .eq('stripe_customer_id', customerId)
        .single();

      if (tenant?.email) {
        await dispatchEmail({
          template: 'billing.trial_ending_7d',
          to: tenant.email,
          data: { tenantId: tenant.id, endDate: trialEnd },
        });
      }

      log.info('[stripe.webhook] trial_will_end processed', { customerId });
      break;
    }

    // ── Payment failed → suspend tenant ─────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer);
      const amount = invoice.amount_due != null
        ? `$${(invoice.amount_due / 100).toFixed(2)}`
        : '';

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email, plan_tier')
        .eq('stripe_customer_id', customerId)
        .single();

      if (!tenant) break;

      const previousPlan = tenant.plan_tier;

      // Suspend — dashboard middleware will redirect to /dashboard/suspended
      await supabase
        .from('tenants')
        .update({ plan_tier: 'suspended' })
        .eq('id', tenant.id);

      await writeAuditLog(supabase, {
        tenant_id: tenant.id,
        event_type: 'tenant.suspended',
        actor_type: 'system',
        actor_id: 'stripe',
        description: `Payment failed — tenant suspended. Previous plan: ${previousPlan}, amount: ${amount}`,
        affected_id: String(invoice.id),
        metadata: { previous_plan: previousPlan, amount_due: invoice.amount_due },
      });

      if (tenant.email) {
        await dispatchEmail({
          template: 'billing.payment_failed',
          to: tenant.email,
          data: { tenantId: tenant.id, amount },
        });
      }

      log.info('[stripe.webhook] payment_failed → suspended', { tenantId: tenant.id, amount });
      break;
    }

    // ── Payment succeeded → restore suspended tenant ─────────────────────────
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = String(invoice.customer);

      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, email, plan_tier, stripe_subscription_id')
        .eq('stripe_customer_id', customerId)
        .single();

      // Only act if tenant is currently suspended (payment retry succeeded)
      if (!tenant || tenant.plan_tier !== 'suspended') break;

      const subscriptionId = String(
        (invoice as unknown as { subscription?: string }).subscription
          ?? tenant.stripe_subscription_id
          ?? ''
      );

      // Look up current plan from subscription
      let restoredPlan = 'starter';
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id ?? '';
        restoredPlan = planFromPriceId(priceId) ?? 'starter';
      } catch {
        log.warn('[stripe.webhook] Could not retrieve subscription for plan restore', { subscriptionId });
      }

      await supabase
        .from('tenants')
        .update({ plan_tier: restoredPlan })
        .eq('id', tenant.id);

      await writeAuditLog(supabase, {
        tenant_id: tenant.id,
        event_type: 'billing.payment_recovered',
        actor_type: 'system',
        actor_id: 'stripe',
        description: `Payment succeeded — tenant restored to ${restoredPlan}`,
        affected_id: String(invoice.id),
        metadata: { restored_plan: restoredPlan, stripe_subscription_id: subscriptionId },
      });

      if (tenant.email) {
        const planName = restoredPlan === 'pro' ? 'Professional' : restoredPlan === 'enterprise' ? 'Enterprise' : 'Starter';
        await dispatchEmail({
          template: 'billing.payment_recovered',
          to: tenant.email,
          data: { tenantId: tenant.id, planName },
        });
      }

      log.info('[stripe.webhook] payment_succeeded → restored', { tenantId: tenant.id, restoredPlan });
      break;
    }

    default:
      log.info('[stripe.webhook] Unhandled event type', { type: event.type });
  }

  return NextResponse.json({ received: true });
}
