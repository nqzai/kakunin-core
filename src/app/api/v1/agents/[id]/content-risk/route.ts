import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { enqueueContentRiskScoring } from '@/lib/content-risk/dispatch';
import { log } from '@/lib/logging';

/**
 * POST /v1/agents/:id/content-risk (P3b — RA-186)
 *
 * Submit an agent's output text for content-risk scoring (manipulation /
 * deception, EU AI Act Art. 5). Scoring runs ASYNC via QStash — this returns
 * 202 immediately and never blocks on the ~2–5s LLM call. Material results land
 * as `output_content_risk` behavioral events + audit rows.
 *
 * Body: { text, source?, message_id? }
 */

const bodySchema = z.object({
  text: z.string().min(1).max(20_000),
  source: z.string().max(64).optional(),
  message_id: z.string().max(128).optional(),
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
    .select('id')
    .eq('id', agentId)
    .eq('tenant_id', tenantId) // rule #2
    .single();
  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  try {
    await enqueueContentRiskScoring({
      tenantId,
      agentId,
      text: parsed.data.text,
      source: parsed.data.source ?? 'api',
      messageId: parsed.data.message_id,
    });
  } catch (err) {
    log.error('[content-risk] Failed to enqueue scoring', { agentId, error: (err as Error).message });
    return NextResponse.json({ error: 'Failed to enqueue content-risk scoring' }, { status: 500 });
  }

  // 202 Accepted — scoring is async; poll the agent's events for the result.
  return NextResponse.json({ data: { accepted: true, agent_id: agentId } }, { status: 202 });
}
