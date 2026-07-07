/**
 * POST /v1/chains — create a named decision chain.
 *
 * A decision chain links a sequence of behavioral events from multiple agents
 * into one causal unit (e.g. one autonomous trade). Used by trading AI operators
 * to make Audit Test #1 (trade reconstruction) answerable in a single API call.
 *
 * GET /v1/chains — list chains for the tenant.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';
import { parseBody } from '@/lib/api/validation';
import { serverError } from '@/lib/api/responses';

const createChainSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;

  const parsed = await parseBody(req, createChainSchema);
  if (!parsed.ok) return parsed.response;

  const supabase = createServiceClient();

  const { data: chain, error } = await supabase
    .from('decision_chains')
    .insert({
      tenant_id: tenantId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      metadata: parsed.data.metadata as Json,
      status: 'open',
    })
    .select()
    .single();

  if (error || !chain) {
    log.error('[chains.create]', error);
    return serverError('Failed to create chain');
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'chain.created',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Decision chain "${chain.name}" created`,
    affected_id: chain.id,
    metadata: { name: chain.name } as Json,
  });

  return NextResponse.json({ data: chain }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { searchParams } = req.nextUrl;
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);
  const status = searchParams.get('status');

  const supabase = createServiceClient();

  let query = supabase
    .from('decision_chains')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status === 'open' || status === 'closed') {
    query = query.eq('status', status);
  }

  const { data: chains, error, count } = await query;

  if (error) {
    return serverError('Failed to fetch chains');
  }

  return NextResponse.json({ data: chains, meta: { total: count ?? 0, limit, offset } });
}
