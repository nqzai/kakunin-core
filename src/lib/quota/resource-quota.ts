/**
 * Resource Quota
 *
 * Quota checks for countable tenant resources:
 * agents, webhooks, compliance reports.
 *
 * Pattern: count existing rows → compare to plan limit → return result.
 * Called before any INSERT in the relevant API routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getLimits, PLAN_LIMITS } from './plan-limits';
import type { Json } from '@/types/database';

/**
 * tier -> max agents, passed to create_agent_with_quota so the RPC can resolve
 * the limit for the tenant's plan in the same roundtrip. Infinity (enterprise)
 * maps to -1, the RPC's "unlimited" sentinel. plan-limits.ts stays the single
 * source of truth — this is derived from it, not a second copy.
 */
const AGENT_LIMITS_BY_TIER: Record<string, number> = Object.fromEntries(
  Object.entries(PLAN_LIMITS).map(([tier, limits]) => [
    tier,
    isFinite(limits.agents) ? limits.agents : -1,
  ]),
);

export interface ResourceQuotaResult {
  allowed: boolean;
  current: number;
  limit: number;
  plan: string;
}

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Check whether tenant can register another agent.
 * Counts non-retired agents (pending + active + suspended).
 */
export async function checkAgentQuota(
  supabase: SupabaseClient,
  tenantId: string,
  planTier: string,
): Promise<ResourceQuotaResult> {
  const limit = getLimits(planTier).agents;

  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit, plan: planTier };
  }

  const { count } = await supabase
    .from('agents')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .neq('status', 'retired');

  const current = count ?? 0;
  return { allowed: current < limit, current, limit, plan: planTier };
}

export interface CreateAgentWithQuotaParams {
  tenantId: string;
  name: string;
  modelHash: string;
  model?: string | null;
  version?: string | null;
  description?: string | null;
  metadata: Json;
}

export interface CreateAgentWithQuotaResult extends ResourceQuotaResult {
  agent: Json | null;
}

/**
 * Create an agent under the tenant's plan quota in a single DB roundtrip.
 * The RPC resolves the tenant's plan_tier and the matching agent limit
 * (from AGENT_LIMITS_BY_TIER) itself, so no separate plan_tier fetch is needed.
 */
export async function createAgentWithQuota(
  supabase: SupabaseClient,
  params: CreateAgentWithQuotaParams,
): Promise<CreateAgentWithQuotaResult> {
  const { tenantId, name, modelHash, model, version, description, metadata } = params;

  const rpcSupabase = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: Array<{ allowed: boolean; current_count: number; plan_tier: string; agent: Json | null }> | null; error: { message: string } | null }>;
  };

  const { data, error } = await rpcSupabase.rpc('create_agent_with_quota', {
    p_tenant_id: tenantId,
    p_agent_limits: AGENT_LIMITS_BY_TIER,
    p_name: name,
    p_model_hash: modelHash,
    p_model: model ?? null,
    p_version: version ?? null,
    p_description: description ?? null,
    p_metadata: metadata,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0] ?? { allowed: false, current_count: 0, plan_tier: 'pending', agent: null };
  const plan = result.plan_tier;

  return {
    allowed: result.allowed,
    current: result.current_count,
    limit: getLimits(plan).agents,
    plan,
    agent: result.agent,
  };
}

/**
 * Check whether tenant can register another webhook endpoint.
 * Counts only active webhooks.
 */
export async function checkWebhookQuota(
  supabase: SupabaseClient,
  tenantId: string,
  planTier: string,
): Promise<ResourceQuotaResult> {
  const limit = getLimits(planTier).webhooks;

  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit, plan: planTier };
  }

  const { count } = await supabase
    .from('webhooks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('active', true);

  const current = count ?? 0;
  return { allowed: current < limit, current, limit, plan: planTier };
}

export interface CreateWebhookWithQuotaParams {
  tenantId: string;
  planTier: string;
  url: string;
  events: string[];
  secretHash: string;
  secretEnc: string;
}

export interface CreateWebhookWithQuotaResult extends ResourceQuotaResult {
  webhook: Json | null;
}

export async function createWebhookWithQuota(
  supabase: SupabaseClient,
  params: CreateWebhookWithQuotaParams,
): Promise<CreateWebhookWithQuotaResult> {
  const { tenantId, planTier, url, events, secretHash, secretEnc } = params;
  const limit = getLimits(planTier).webhooks;
  const rpcLimit = isFinite(limit) ? limit : 0;

  const rpcSupabase = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: Array<{ allowed: boolean; current_count: number; webhook: Json | null }> | null; error: { message: string } | null }>;
  };

  const { data, error } = await rpcSupabase.rpc('create_webhook_with_quota', {
    p_tenant_id: tenantId,
    p_limit: rpcLimit,
    p_url: url,
    p_events: events,
    p_secret_hash: secretHash,
    p_secret_enc: secretEnc,
  });

  if (error) {
    throw new Error(error.message);
  }

  const result = data?.[0] ?? { allowed: false, current_count: rpcLimit, webhook: null };

  return {
    allowed: result.allowed,
    current: result.current_count,
    limit,
    plan: planTier,
    webhook: result.webhook,
  };
}

/**
 * Check whether an agent can generate another compliance report this month.
 * Reads agent_report_counts counter table.
 */
export async function checkReportQuota(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
  planTier: string,
): Promise<ResourceQuotaResult> {
  const limit = getLimits(planTier).reportsPerAgent;

  if (!isFinite(limit)) {
    return { allowed: true, current: 0, limit, plan: planTier };
  }

  const monthKey = currentMonthKey();

  const { data } = await supabase
    .from('agent_report_counts')
    .select('report_count')
    .eq('tenant_id', tenantId)
    .eq('agent_id', agentId)
    .eq('month', monthKey)
    .maybeSingle();

  const current = (data as { report_count?: number } | null)?.report_count ?? 0;
  return { allowed: current < limit, current, limit, plan: planTier };
}

export async function incrementReportCount(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
): Promise<void> {
  await supabase.rpc('increment_report_count', {
    p_tenant_id: tenantId,
    p_agent_id: agentId,
    p_month: currentMonthKey(),
  });
}
