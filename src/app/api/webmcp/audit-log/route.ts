import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { invokeTenantScopedEventRoute } from '@/lib/gateway/v1-route-invoke';
import { resolveWebMcpTenantContext } from '@/lib/webmcp/session';

const bodySchema = z.object({
  agent_id: z.string().min(1),
  action_type: z.enum([
    'data_access',
    'trade_execution',
    'authentication',
    'report_generation',
    'user_interaction',
    'api_call',
    'model_inference',
    'data_mutation',
    'transaction_initiated',
    'authentication_attempt',
    'transaction_anomaly',
    'unauthorized_access_attempt',
    'message_signed',
    'message_verification_failed',
  ]),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

const LEGACY_ACTION_TYPE_MAP: Record<string, string> = {
  trade_execution: 'transaction_initiated',
  authentication: 'authentication_attempt',
  report_generation: 'api_call',
  user_interaction: 'api_call',
  model_inference: 'api_call',
};

export async function POST(req: NextRequest) {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const tenantContext = await resolveWebMcpTenantContext();
  if (tenantContext.response) {
    return tenantContext.response;
  }

  const { agent_id, action_type, metadata } = body.data;
  const canonicalActionType = LEGACY_ACTION_TYPE_MAP[action_type] ?? action_type;

  const response = await invokeTenantScopedEventRoute(tenantContext.context.tenantId, {
    agentId: agent_id,
    actionType: canonicalActionType,
    details: metadata,
  });
  const data = await response.json() as Record<string, unknown>;
  const payload = (data['data'] as Record<string, unknown> | undefined) ?? {};

  return NextResponse.json(
    response.ok
      ? { success: true, event_id: payload['event_id'] ?? null, ...data }
      : data,
    { status: response.status }
  );
}
