import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLogStrict } from '@/lib/audit/audit-log';
import { issueDelegationToken } from '@/lib/delegation/token';
import { renderChain, DelegationError, type Actor } from '@/lib/delegation/act-claim';

/**
 * POST /v1/agents/:id/delegation (P3a — RA-184)
 *
 * Mint an RFC 8693 delegation token making the human→agent→sub-agent authority
 * chain explicit. The token is stateless (verifiable by signature); issuance is
 * recorded in audit_log for non-repudiation (NCCoE pillar 4 / control C-A3).
 *
 * Body: { chain: [{ sub, type }], scope?, audience?, ttl_seconds? }
 *   chain is ordered root→current, e.g.
 *   [{sub:"user@acme.com",type:"human"}, {sub:"agent:abc",type:"agent"},
 *    {sub:"agent:abc/researcher",type:"sub_agent"}]
 */

const actorSchema = z.object({
  sub: z.string().min(1).max(256),
  type: z.enum(['human', 'agent', 'sub_agent', 'service']).optional(),
});
const bodySchema = z.object({
  chain: z.array(actorSchema).min(1).max(8),
  scope: z.string().max(500).optional(),
  audience: z.string().max(256).optional(),
  ttl_seconds: z.number().int().min(60).max(86_400).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id: agentId } = await params;

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .eq('tenant_id', tenantId) // rule #2
    .single();
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const chain = parsed.data.chain as Actor[];
  let token: string;
  let claims;
  try {
    ({ token, claims } = issueDelegationToken({
      tenantId,
      agentId,
      chain,
      scope: parsed.data.scope,
      audience: parsed.data.audience,
      ttlSeconds: parsed.data.ttl_seconds,
    }));
  } catch (err) {
    if (err instanceof DelegationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to issue delegation token' }, { status: 500 });
  }

  // Non-repudiation: who authorized whom, and when (control C-A3).
  // Fail closed: an unaudited delegation token must not be handed out.
  try {
    await writeAuditLogStrict(supabase, {
    tenant_id: tenantId,
    event_type: 'delegation.issued',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Delegation issued for agent ${agent.name}: ${renderChain(chain)}`,
    affected_id: agentId,
    metadata: {
      principal: claims.sub,
      chain: chain.map((a) => ({ sub: a.sub, type: a.type ?? null })),
      scope: parsed.data.scope ?? null,
      expires_at: new Date(claims.exp * 1000).toISOString(),
    },
    });
  } catch {
    return NextResponse.json(
      { error: 'Delegation issuance failed: audit log unavailable' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      token,
      chain: chain.map((a) => ({ sub: a.sub, type: a.type ?? null })),
      principal: claims.sub,
      scope: claims.scope ?? null,
      issued_at: new Date(claims.iat * 1000).toISOString(),
      expires_at: new Date(claims.exp * 1000).toISOString(),
    },
  });
}
