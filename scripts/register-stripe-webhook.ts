/**
 * One-time script: register Kakunin webhook endpoint with Stripe.
 *
 * Run once after deploying to production:
 *   npx tsx scripts/register-stripe-webhook.ts
 *
 * Requires STRIPE_SECRET_KEY in env (via Doppler or .env.local).
 * Outputs the webhook signing secret — add it to Doppler as STRIPE_WEBHOOK_SECRET.
 */

import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('STRIPE_SECRET_KEY not set. Run: doppler run -- npx tsx scripts/register-stripe-webhook.ts');
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: '2026-04-22.dahlia' });

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

async function main() {
  console.log(`Registering Stripe webhook → ${APP_URL}/api/webhooks/stripe`);

  const webhook = await stripe.webhookEndpoints.create({
    url: `${APP_URL}/api/webhooks/stripe`,
    enabled_events: [
      'customer.subscription.trial_will_end',
      'invoice.payment_failed',
      'customer.subscription.deleted',
      'invoice.paid',
    ],
    description: 'Kakunin billing webhook — transactional emails + feature flags',
  });

  console.log('\n✅ Webhook registered');
  console.log(`   ID:     ${webhook.id}`);
  console.log(`   URL:    ${webhook.url}`);
  console.log(`   Status: ${webhook.status}`);
  console.log('\n🔑 Signing secret (add to Doppler as STRIPE_WEBHOOK_SECRET):');
  console.log(`   ${webhook.secret}`);
  console.log('\nDoppler command:');
  console.log(`   doppler secrets set STRIPE_WEBHOOK_SECRET="${webhook.secret}" -p kyc-ai -c prd`);
}

main().catch((err) => {
  console.error('Registration failed:', err.message);
  process.exit(1);
});
