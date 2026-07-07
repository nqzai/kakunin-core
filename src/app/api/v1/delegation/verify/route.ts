import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyDelegationToken } from '@/lib/delegation/token';
import { renderChain } from '@/lib/delegation/act-claim';

/**
 * POST /v1/delegation/verify (P3a — RA-184)
 *
 * Verify a delegation token's signature + expiry and return the resolved
 * human→agent→sub-agent authority chain. Stateless — no DB lookup.
 *
 * Body: { token: string }
 */

const bodySchema = z.object({ token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const result = verifyDelegationToken(parsed.data.token);
  if (!result.valid) {
    return NextResponse.json({ data: { valid: false, reason: result.reason } });
  }

  return NextResponse.json({
    data: {
      valid: true,
      principal: result.claims!.sub,
      chain: (result.chain ?? []).map((a) => ({ sub: a.sub, type: a.type ?? null })),
      chain_display: renderChain(result.chain ?? []),
      scope: result.claims!.scope ?? null,
      agent_id: result.claims!['kakunin.agent_id'],
      expires_at: new Date(result.claims!.exp * 1000).toISOString(),
    },
  });
}
