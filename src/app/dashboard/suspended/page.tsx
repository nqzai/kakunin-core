import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { stripe } from '@/lib/stripe/client';

/**
 * /dashboard/suspended
 *
 * Shown when plan_tier = 'suspended' or 'cancelled'.
 * Provides a Stripe Billing Portal link so the customer can update
 * their payment method and reactivate automatically.
 *
 * Middleware allows access here even in suspended state (skip-list).
 */
async function getBillingPortalUrl(): Promise<string | null> {
  try {
    const context = await getDashboardRequestContext();
    if (!context) return null;
    if (!context.stripeCustomerId) return null;

    const session = await stripe.billingPortal.sessions.create({
      customer: context.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai'}/dashboard`,
    });

    return session.url;
  } catch {
    return null;
  }
}

export default async function SuspendedPage() {
  const portalUrl = await getBillingPortalUrl();

  return (
    <div className="suspended-root">
      <div className="suspended-card">
        <div className="suspended-icon" aria-hidden="true">⚠</div>
        <h1>Account suspended</h1>
        <p>
          Your payment failed and your account has been temporarily suspended.
          Update your payment method to reactivate — your data is intact.
        </p>

        {portalUrl ? (
          <a href={portalUrl} className="suspended-btn">
            Update payment method →
          </a>
        ) : (
          <a href="mailto:ai@kakunin.ai?subject=Account%20reactivation" className="suspended-btn">
            Contact support →
          </a>
        )}

        <div className="suspended-sub">
          Questions?{' '}
          <a href="mailto:ai@kakunin.ai">ai@kakunin.ai</a>
          {' '}— we respond within 4 hours.
        </div>
      </div>
    </div>
  );
}
