import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';
import { trackRouteTiming } from '@/lib/observability/route-timing';

/**
 * GET /v1/agents/{id}/events/stream
 *
 * Server-Sent Events stream of behavioral events for a specific agent.
 * Agents and orchestrators can subscribe to real-time risk events without polling.
 *
 * Auth: Bearer token (via x-tenant-id middleware header)
 * Protocol: text/event-stream (SSE)
 * Cursor: ?since=<ISO-timestamp> — only stream events after this time (default: now)
 * Heartbeat: every 15s to keep connection alive through proxies
 *
 * Event shape:
 *   event: behavior_event
 *   data: {"id":"...","agent_id":"...","action_type":"...","risk_score":0.12,"risk_band":"low","occurred_at":"..."}
 *
 *   event: heartbeat
 *   data: {"ts":"..."}
 *
 *   event: error
 *   data: {"error":"..."}
 */
export const dynamic = 'force-dynamic';
// SSE requires streaming — disable body size limit
export const maxDuration = 55; // Vercel max for hobby/pro (seconds)

const FAST_POLL_MS = 2000;
const MEDIUM_POLL_MS = 5000;
const SLOW_POLL_MS = 10000;
const HEARTBEAT_MS = 15000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startedAt = Date.now();
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const { id: agentId } = await params;
  const url = new URL(req.url);
  const since = url.searchParams.get('since') ?? new Date().toISOString();

  // Validate agent belongs to this tenant
  const supabase = createServiceClient();
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    trackRouteTiming({
      route: '/api/v1/agents/[id]/events/stream',
      status: 'client_error',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 300,
      sampleRate: 0.1,
      context: { tenantId, agentId, outcome: 'agent_not_found' },
    });
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Build SSE stream using ReadableStream
  let cursor = since;
  let heartbeatInterval: ReturnType<typeof setInterval>;
  let pollTimeout: ReturnType<typeof setTimeout> | null = null;
  let pollCount = 0;
  let eventCount = 0;
  let dbErrorCount = 0;
  let streamClosed = false;
  let consecutiveIdlePolls = 0;

  function logStreamClosed(reason: string) {
    if (streamClosed) return;
    streamClosed = true;
    log.info('[sse.stream] closed', {
      route: '/api/v1/agents/[id]/events/stream',
      tenantId,
      agentId,
      reason,
      duration_ms: Date.now() - startedAt,
      poll_count: pollCount,
      event_count: eventCount,
      db_error_count: dbErrorCount,
    });
  }

  const stream = new ReadableStream({
    start(controller) {
      const encode = (data: string) => new TextEncoder().encode(data);

      trackRouteTiming({
        route: '/api/v1/agents/[id]/events/stream',
        status: 'ok',
        durationMs: Date.now() - startedAt,
        slowThresholdMs: 300,
        sampleRate: 0.1,
        context: { tenantId, agentId, outcome: 'connected' },
      });

      // Send connected event immediately
      controller.enqueue(
        encode(`event: connected\ndata: ${JSON.stringify({ agent_id: agentId, since: cursor, message: 'Stream established' })}\n\n`)
      );

      const clearPolling = () => {
        if (pollTimeout) {
          clearTimeout(pollTimeout);
          pollTimeout = null;
        }
      };

      const nextPollDelay = () => {
        if (consecutiveIdlePolls >= 6) return SLOW_POLL_MS;
        if (consecutiveIdlePolls >= 2) return MEDIUM_POLL_MS;
        return FAST_POLL_MS;
      };

      const scheduleNextPoll = (delayMs: number) => {
        clearPolling();
        pollTimeout = setTimeout(runPoll, delayMs);
      };

      const runPoll = async () => {
        if (streamClosed) return;
        try {
          pollCount += 1;
          const { data: events, error } = await supabase
            .from('behavior_events')
            .select('id, agent_id, action_type, risk_score, risk_band, occurred_at')
            .eq('tenant_id', tenantId)
            .eq('agent_id', agentId)
            .gt('occurred_at', cursor)
            .order('occurred_at', { ascending: true })
            .limit(50);

          if (error) {
            dbErrorCount += 1;
            controller.enqueue(
              encode(`event: error\ndata: ${JSON.stringify({ error: 'Database error' })}\n\n`)
            );
            scheduleNextPoll(MEDIUM_POLL_MS);
            return;
          }

          const nextEvents = events ?? [];
          if (nextEvents.length === 0) {
            consecutiveIdlePolls += 1;
          } else {
            consecutiveIdlePolls = 0;
          }

          for (const event of nextEvents) {
            eventCount += 1;
            controller.enqueue(
              encode(`event: behavior_event\ndata: ${JSON.stringify({
                id: event.id,
                agent_id: event.agent_id,
                action_type: event.action_type,
                risk_score: event.risk_score,
                risk_band: event.risk_band,
                occurred_at: event.occurred_at,
              })}\n\n`)
            );
            // Advance cursor to avoid re-sending
            if (event.occurred_at > cursor) cursor = event.occurred_at;
          }
          scheduleNextPoll(nextPollDelay());
        } catch {
          // Swallow poll errors — stream stays open
          scheduleNextPoll(MEDIUM_POLL_MS);
        }
      };

      scheduleNextPoll(FAST_POLL_MS);

      // Heartbeat every 15s to keep proxies/load balancers alive
      heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(
            encode(`event: heartbeat\ndata: ${JSON.stringify({ ts: new Date().toISOString() })}\n\n`)
          );
        } catch {
          // Controller closed — clear intervals
          clearInterval(heartbeatInterval);
          clearPolling();
          logStreamClosed('heartbeat_enqueue_failed');
        }
      }, HEARTBEAT_MS);
    },

    cancel() {
      clearInterval(heartbeatInterval);
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
      logStreamClosed('client_cancelled');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
    },
  });
}
