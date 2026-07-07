/**
 * Event Quota
 *
 * Helpers for reading, reserving, and releasing the monthly behaviour
 * event quota for an agent.
 *
 * Counter table: agent_event_counts (tenant_id, agent_id, month, event_count)
 * Month key: first day of current UTC month (date_trunc equivalent in JS).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getLimits } from './plan-limits';

export interface QuotaCheckResult {
  allowed: boolean;
  /** Current count this month (before this event) */
  current: number;
  /** Plan limit for this agent */
  limit: number;
  /** Seconds until quota resets (midnight UTC on 1st of next month) */
  retryAfterSeconds: number;
}

/**
 * Returns the first day of the current UTC month as a DATE string (YYYY-MM-DD).
 */
function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Seconds until UTC midnight on the 1st of next month.
 */
function secondsUntilMonthReset(): number {
  const now = new Date();
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return Math.ceil((nextMonth.getTime() - now.getTime()) / 1000);
}

/**
 * Check whether an agent has remaining event quota this month.
 * Read-only helper retained for non-mutating quota inspection paths.
 */
export async function checkEventQuota(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
  planTier: string,
): Promise<QuotaCheckResult> {
  const limit = getLimits(planTier).eventsPerAgent;
  const retryAfterSeconds = secondsUntilMonthReset();

  // Infinity = enterprise — always allowed, skip DB read
  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit, retryAfterSeconds };
  }

  const month = currentMonthKey();

  const { data } = await supabase
    .from('agent_event_counts')
    .select('event_count')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .eq('month', month)
    .maybeSingle();

  const current = data?.event_count ?? 0;

  return {
    allowed: current < limit,
    current,
    limit,
    retryAfterSeconds,
  };
}

/**
 * Increment the event counter for an agent after a successful insert.
 * Uses upsert to handle the first event of a new month gracefully.
 * Fire-and-forget — caller should not await if latency is critical.
 */
export async function incrementEventCount(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
): Promise<void> {
  const month = currentMonthKey();

  await supabase.rpc('increment_event_count', {
    p_tenant_id: tenantId,
    p_agent_id:  agentId,
    p_month:     month,
  });
}

/**
 * Atomically reserves one event slot for the current month.
 * Prevents concurrent callers from oversubscribing the same monthly quota.
 */
export async function consumeEventQuota(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
  planTier: string,
): Promise<QuotaCheckResult> {
  const limit = getLimits(planTier).eventsPerAgent;
  const retryAfterSeconds = secondsUntilMonthReset();

  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit, retryAfterSeconds };
  }

  const month = currentMonthKey();
  const rpcSupabase = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: Array<{ allowed: boolean; current_count: number }> | null; error: { message: string } | null }>;
  };

  const { data, error } = await rpcSupabase.rpc('consume_event_quota', {
    p_tenant_id: tenantId,
    p_agent_id: agentId,
    p_month: month,
    p_limit: limit,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0] ?? { allowed: false, current_count: limit };

  return {
    allowed: result.allowed,
    current: result.current_count,
    limit,
    retryAfterSeconds,
  };
}

/**
 * Releases a previously reserved event slot for the current month.
 * Used only when the subsequent behavior_events insert fails.
 */
export async function releaseEventQuotaReservation(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
): Promise<void> {
  const month = currentMonthKey();
  const rpcSupabase = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ error: { message: string } | null }>;
  };

  const { error } = await rpcSupabase.rpc('release_event_quota', {
    p_tenant_id: tenantId,
    p_agent_id: agentId,
    p_month: month,
  });

  if (error) {
    throw new Error(error.message);
  }
}
