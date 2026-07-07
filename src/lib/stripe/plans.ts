/**
 * Stripe plan definitions — client-safe.
 *
 * Pure data: no Stripe SDK import, safe to use in client components.
 * Server-only Stripe instance and functions live in stripe/client.ts.
 */

// ── Tier definitions ────────────────────────────────────────────────────────
// Pricing locked 2026-05-19 (INTERNAL — do not expose in client bundles)
//   Starter: $39/agent/mo, minimum 5 agents ($195/mo)
//   Pro:     $99/agent/mo, minimum 20 agents ($1,980/mo)
//   Enterprise: negotiated — not available via self-serve Stripe checkout

export type PlanKey = 'starter' | 'pro';

export interface TierDef {
  key: PlanKey;
  name: string;
  /** Display price per agent per month in USD cents */
  pricePerAgent: number;
  priceLabel: string;
  /** Minimum agents required (enforced at checkout quantity) */
  minAgents: number;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const TIERS: Record<PlanKey, TierDef> = {
  starter: {
    key: 'starter',
    name: 'Starter',
    pricePerAgent: 3900,
    priceLabel: '$39',
    minAgents: 5,
    description: 'Per agent / month. Up to 5 agents. 30-day free trial.',
    features: [
      'Up to 5 certified agents',
      'X.509 certificate issuance (AWS KMS)',
      'Behaviour monitoring & risk scoring',
      'MiCA & EU AI Act compliance reports',
      'Webhook delivery + daily email digest',
      'Audit log — append-only, 90-day retention',
      'Email support (48h SLA)',
    ],
  },
  pro: {
    key: 'pro',
    name: 'Professional',
    pricePerAgent: 9900,
    priceLabel: '$99',
    minAgents: 20,
    description: 'Per agent / month. Up to 20 agents. 30-day free trial.',
    highlighted: true,
    features: [
      'Up to 20 certified agents',
      'Everything in Starter',
      'Priority support (8h SLA)',
      'Audit export API (JSON / CSV)',
      'Compliance report scheduling',
      '1 BYOA alert channel included',
      'Dedicated onboarding session',
    ],
  },
};

export const TIER_ORDER: PlanKey[] = ['starter', 'pro'];
