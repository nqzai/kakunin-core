/**
 * Plan Limits
 *
 * Single source of truth for all per-plan quota limits.
 * Used by every quota enforcement check in the API layer.
 *
 * Locked pricing (2026-05-19):
 *   Starter — $39/agent/mo, min 5 agents
 *   Pro     — $99/agent/mo, min 20 agents
 *   Enterprise — negotiated
 *
 * Trial: Starter-tier quotas, 5-agent cap, for 30 days.
 */

export type PlanTier = 'pending' | 'trial' | 'starter' | 'pro' | 'enterprise' | 'suspended' | 'cancelled';

export interface PlanLimits {
  /** Maximum certified agents per tenant */
  agents: number;
  /** Maximum behaviour events per agent per month */
  eventsPerAgent: number;
  /** Maximum compliance reports per agent per month */
  reportsPerAgent: number;
  /** Maximum active webhook endpoints per tenant */
  webhooks: number;
  /** Maximum API keys per tenant */
  apiKeys: number;
  /** API rate limit — requests per minute per tenant */
  apiRatePerMin: number;
  /** Maximum certificate operations per tenant per month */
  certOpsPerMonth: number;
  /** Audit log retention in days */
  auditRetentionDays: number;
  /** Maximum compliance report window in days */
  reportWindowDays: number;
  /** Included BYOA alert channels (above this = paid add-on) */
  byoaChannelsIncluded: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  pending: {
    agents:               0,
    eventsPerAgent:       0,
    reportsPerAgent:      0,
    webhooks:             0,
    apiKeys:              0,
    apiRatePerMin:        0,
    certOpsPerMonth:      0,
    auditRetentionDays:   0,
    reportWindowDays:     0,
    byoaChannelsIncluded: 0,
  },

  // Trial: Starter quotas, hard 5-agent cap regardless of chosen plan
  trial: {
    agents:               5,
    eventsPerAgent:       10_000,
    reportsPerAgent:      1,
    webhooks:             1,
    apiKeys:              2,
    apiRatePerMin:        60,
    certOpsPerMonth:      5,
    auditRetentionDays:   90,
    reportWindowDays:     30,
    byoaChannelsIncluded: 0,
  },

  starter: {
    agents:               5,
    eventsPerAgent:       10_000,
    reportsPerAgent:      1,
    webhooks:             1,
    apiKeys:              2,
    apiRatePerMin:        60,
    certOpsPerMonth:      5,
    auditRetentionDays:   90,
    reportWindowDays:     30,
    byoaChannelsIncluded: 0,
  },

  pro: {
    agents:               20,
    eventsPerAgent:       50_000,
    reportsPerAgent:      4,
    webhooks:             5,
    apiKeys:              10,
    apiRatePerMin:        300,
    certOpsPerMonth:      60,
    auditRetentionDays:   365,
    reportWindowDays:     90,
    byoaChannelsIncluded: 1,
  },

  enterprise: {
    agents:               Infinity,
    eventsPerAgent:       Infinity,
    reportsPerAgent:      Infinity,
    webhooks:             Infinity,
    apiKeys:              Infinity,
    apiRatePerMin:        Infinity,
    certOpsPerMonth:      Infinity,
    auditRetentionDays:   2555, // 7 years default; overridden per contract
    reportWindowDays:     Infinity,
    byoaChannelsIncluded: Infinity,
  },

  // Suspended / cancelled — no access
  suspended: {
    agents:               0,
    eventsPerAgent:       0,
    reportsPerAgent:      0,
    webhooks:             0,
    apiKeys:              0,
    apiRatePerMin:        0,
    certOpsPerMonth:      0,
    auditRetentionDays:   90, // retain existing data
    reportWindowDays:     0,
    byoaChannelsIncluded: 0,
  },

  cancelled: {
    agents:               0,
    eventsPerAgent:       0,
    reportsPerAgent:      0,
    webhooks:             0,
    apiKeys:              0,
    apiRatePerMin:        0,
    certOpsPerMonth:      0,
    auditRetentionDays:   90,
    reportWindowDays:     0,
    byoaChannelsIncluded: 0,
  },
};

/**
 * Returns the plan limits for a given tier.
 * Falls back to pending (zero access) for unknown values.
 */
export function getLimits(tier: string): PlanLimits {
  return PLAN_LIMITS[tier as PlanTier] ?? PLAN_LIMITS.pending;
}

/**
 * Returns true if the tenant's plan allows any API access at all.
 */
export function isActive(tier: string): boolean {
  return ['trial', 'starter', 'pro', 'enterprise'].includes(tier);
}
