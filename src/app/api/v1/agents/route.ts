import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createAgentWithQuota } from '@/lib/quota/resource-quota';
import { updateSubscriptionQuantity } from '@/lib/stripe/client';
import type { AgentStatus, Json } from '@/types/database';
import { log } from '@/lib/logging';

const VALID_STATUSES: AgentStatus[] = ['pending', 'active', 'suspended', 'retired'];

const financialScopeSchema = z.object({
  max_single_trade_usd: z.number().positive(),
  daily_limit_usd: z.number().positive(),
  permitted_instruments: z.array(z.string().min(1)).min(1),
  permitted_venues: z.array(z.string().min(1)).min(1),
  leverage_permitted: z.boolean().default(false),
  max_leverage_ratio: z.number().positive().optional(),
}).optional();

const createAgentSchema = z.object({
  name: z.string().min(1).max(255),
  model_hash: z.string().min(1).max(512),
  model: z.string().max(255).optional(),
  version: z.string().max(100).optional(),
  description: z.string().max(1000).optional(),
  financial_scope: financialScopeSchema,
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const body = createAgentSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const metadata: Json = {
    ...body.data.metadata,
    ...(body.data.financial_scope ? { financial_scope: body.data.financial_scope } : {}),
  };

  // Create the agent through one quota-aware DB transaction. The RPC resolves
  // the tenant's plan_tier and agent limit itself — no separate fetch.
  const agentQuota = await createAgentWithQuota(supabase, {
    tenantId,
    name: body.data.name,
    modelHash: body.data.model_hash,
    model: body.data.model ?? null,
    version: body.data.version ?? null,
    description: body.data.description ?? null,
    metadata,
  });

  if (!agentQuota.allowed) {
    return NextResponse.json(
      {
        error: `Agent limit reached for your plan. Upgrade to add more agents.`,
        quota: { limit: agentQuota.limit, current: agentQuota.current, plan: agentQuota.plan },
      },
      { status: 422 },
    );
  }

  const agent = agentQuota.agent as (Json & {
    id: string;
    name: string;
    model: string | null;
    version: string | null;
    model_hash: string;
  }) | null;

  if (!agent) {
    log.error('[agents.create]', new Error('create_agent_with_quota returned no agent row'));
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.created',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Agent "${agent.name}" registered`,
    affected_id: agent.id,
    metadata: { model: agent.model, version: agent.version, model_hash: agent.model_hash } as Json,
  });

  // Sync Stripe subscription quantity — fire-and-forget, never blocks response
  void updateSubscriptionQuantity(supabase, tenantId);

  return NextResponse.json({ data: agent }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { searchParams } = req.nextUrl;

  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const statusParam = searchParams.get('status');
  const status = VALID_STATUSES.includes(statusParam as AgentStatus)
    ? (statusParam as AgentStatus)
    : null;

  const supabase = createServiceClient();

  let query = supabase
    .from('agents')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: agents, error, count } = await query;

  if (error) {
    log.error('[agents.list]', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }

  return NextResponse.json({
    data: agents,
    meta: { total: count ?? 0, limit, offset },
  });
}
