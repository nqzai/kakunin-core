import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { processChat } from '@/lib/chat/process';
import { validateGuardrails } from '@/lib/chat/guardrails';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import { trackRouteTiming } from '@/lib/observability/route-timing';
import type { ChatRequestBody, Conversation } from '@/types/chat';

export const maxDuration = 30;

const chatRequestSchema = z.object({
  conversation_id: z.string().uuid().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      })
    )
    .min(1)
    .max(40),
  context: z
    .object({
      source: z.enum(['discord', 'web', 'api', 'email']).optional(),
      user_id: z.string().max(255).optional(),
      thread_id: z.string().max(255).optional(),
      agent_id: z.string().uuid().optional(),
    })
    .optional(),
});

/**
 * POST /api/v1/chat
 *
 * Public chat API supporting multi-turn conversations.
 * API key authenticated via middleware (tenant_id in x-tenant-id header).
 *
 * Delegates core processing to lib/chat/process.ts — same function used by
 * the Discord handler to avoid an HTTP self-call.
 */

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = chatRequestSchema.safeParse(await req.json());
  if (!body.success) {
    log.warn('[chat] validation error', { tenantId, error: body.error.message });
    trackRouteTiming({
      route: '/api/v1/chat',
      status: 'client_error',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 400,
      sampleRate: 0.1,
      context: { tenantId, outcome: 'validation_error' },
    });
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();
  const data = body.data as ChatRequestBody;
  const latestUserMsg = data.messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';

  // Guardrail check — return streamed error so clients handle it uniformly
  const guardCheck = validateGuardrails(latestUserMsg);
  if (!guardCheck.valid) {
    log.warn('[chat] guardrail violation', { tenantId, reason: guardCheck.error });
    trackRouteTiming({
      route: '/api/v1/chat',
      status: 'client_error',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 400,
      sampleRate: 0.1,
      context: { tenantId, outcome: 'guardrail_block' },
    });
    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(guardCheck.error!));
        controller.close();
      },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  // ── Fetch or create conversation ──────────────────────────────────────────
  let conversation: Conversation | null = null;

  if (data.conversation_id) {
    const { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', data.conversation_id)
      .eq('tenant_id', tenantId)
      .single();

    if (!conv) {
      trackRouteTiming({
        route: '/api/v1/chat',
        status: 'client_error',
        durationMs: Date.now() - startedAt,
        slowThresholdMs: 400,
        sampleRate: 0.1,
        context: { tenantId, outcome: 'conversation_not_found' },
      });
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    conversation = conv as Conversation;
  } else {
    const { data: newConv, error: createErr } = await supabase
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        source: data.context?.source ?? 'api',
        user_id: data.context?.user_id,
        external_thread_id: data.context?.thread_id,
        agent_id: data.context?.agent_id,
        status: 'active',
      })
      .select()
      .single();

    if (createErr || !newConv) {
      log.error('[chat] conversation create error', { tenantId, error: createErr?.message });
      trackRouteTiming({
        route: '/api/v1/chat',
        status: 'server_error',
        durationMs: Date.now() - startedAt,
        slowThresholdMs: 400,
        sampleRate: 1,
        context: { tenantId, outcome: 'conversation_create_failed' },
      });
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }
    conversation = newConv as Conversation;

    // Log conversation creation
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'conversation.created',
      actor_type: 'user',
      actor_id: data.context?.user_id || 'anonymous',
      description: 'Conversation initiated via API',
      affected_id: conversation.id,
      metadata: {
        source: data.context?.source || 'api',
        thread_id: data.context?.thread_id,
        agent_id: data.context?.agent_id,
      },
    });
  }

  // ── Delegate to shared chat processor ────────────────────────────────────
  try {
    const result = await processChat({
      tenantId,
      conversationId: conversation.id,
      userMessage: latestUserMsg,
      context: {
        source: data.context?.source,
        user_id: data.context?.user_id,
        thread_id: data.context?.thread_id,
      },
    });

    const encoder = new TextEncoder();
    const responseStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(result.content));
        controller.close();
      },
    });

    trackRouteTiming({
      route: '/api/v1/chat',
      status: 'ok',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 800,
      sampleRate: 0.1,
      context: {
        tenantId,
        outcome: 'ok',
        conversationId: conversation.id,
        response_chars: result.content.length,
      },
    });

    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        'X-Conversation-Id': conversation.id,
      },
    });
  } catch (err) {
    const errMsg = (err as Error).message;
    log.error('[chat] processing error', { tenantId, conversationId: conversation.id, error: errMsg });
    trackRouteTiming({
      route: '/api/v1/chat',
      status: 'server_error',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 400,
      sampleRate: 1,
      context: { tenantId, outcome: 'processing_error', conversationId: conversation.id },
    });
    return NextResponse.json({ error: 'LLM unavailable — try again shortly' }, { status: 503 });
  }
}
