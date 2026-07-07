import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { scoreEvent, type FinancialScope } from '@/lib/monitoring/risk-engine';
import { enqueue } from '@/lib/queue/qstash';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { dispatchEmail } from '@/lib/email/dispatch';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { dispatchAlertChannels } from '@/lib/alerts/channel-dispatch';
import { writeAuditWorm } from '@/lib/audit/worm-writer';
import { consumeEventQuota, releaseEventQuotaReservation } from '@/lib/quota/event-quota';
import { hasNotificationOnDay, sendProactiveNotification } from '@/lib/notifications/proactive';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

const VALID_BANDS = ['low', 'medium', 'high'] as const;

const ACTION_TYPES = [
  'api_call',
  'authentication_attempt',
  'authentication_failure',
  'data_access',
  'data_mutation',
  'transaction_initiated',
  'transaction_anomaly',
  'unauthorized_access_attempt',
  'message_signed',
  'message_verification_failed',
] as const;

const eventBodySchema = z.object({
  agentId: z.string().uuid(),
  actionType: z.enum(ACTION_TYPES),
  chainId: z.string().uuid().optional(),
  sessionId: z.string().max(255).optional(),
  occurredAt: z.string().datetime().optional(),
  details: z.record(z.string(), z.unknown()).optional().default({}),
});

/**
 * GET /v1/events
 *
 * Query behavioral events for the tenant. Cursor-based pagination using
 * occurred_at timestamp as the cursor (newest-first).
 *
 * Filters: agent_id, band, action_type, before (ISO cursor)
 */
export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const url = new URL(req.url);

  const agentId = url.searchParams.get('agent_id');
  const band = url.searchParams.get('band');
  const actionType = url.searchParams.get('action_type');
  // Cursor: ISO timestamp of the oldest item in the previous page
  const before = url.searchParams.get('before');
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(Math.max(1, Number(limitRaw ?? 50)), 100);

  // Validate optional enum params
  if (band && !VALID_BANDS.includes(band as (typeof VALID_BANDS)[number])) {
    return NextResponse.json({ error: 'Invalid band — must be low, medium, or high' }, { status: 400 });
  }
  if (actionType && !ACTION_TYPES.includes(actionType as (typeof ACTION_TYPES)[number])) {
    return NextResponse.json({ error: `Invalid action_type` }, { status: 400 });
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('behavior_events')
    .select('id, agent_id, action_type, risk_score, risk_band, factors, occurred_at, source_ip, payload')
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: false })
    // Fetch one extra to detect whether a next page exists
    .limit(limit + 1);

  if (agentId) query = query.eq('agent_id', agentId);
  // Cast validated strings to the enum types the Supabase client expects
  if (band) query = query.eq('risk_band', band as 'low' | 'medium' | 'high');
  if (actionType) query = query.eq('action_type', actionType as (typeof ACTION_TYPES)[number]);
  // Cursor: all rows strictly before this timestamp
  if (before) query = query.lt('occurred_at', before);

  const { data: events, error } = await query;

  if (error) {
    log.error('[events.list]', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  const hasNextPage = events.length > limit;
  const rows = hasNextPage ? events.slice(0, limit) : events;
  // Next cursor is the occurred_at of the oldest row returned
  const nextCursor = hasNextPage ? (rows[rows.length - 1]?.occurred_at ?? null) : null;

  return NextResponse.json({
    data: rows,
    pagination: {
      limit,
      has_next_page: hasNextPage,
      next_cursor: nextCursor,
    },
  });
}

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const sourceIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null;

  const body = eventBodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { agentId, actionType, chainId, sessionId, occurredAt, details } = body.data;
  const supabase = createServiceClient();

  // Verify agent belongs to tenant — reject cross-tenant injection
  // Fetch tenant plan_tier in the same round-trip via agents join
  const [agentResult, tenantResult] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name, status, metadata')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single(),
    supabase
      .from('tenants')
      .select('plan_tier')
      .eq('id', tenantId)
      .single(),
  ]);

  const { data: agent, error: agentError } = agentResult;

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Retired and suspended agents must not emit scored events. A suspended agent
  // (e.g. post-halt) is in an invalid state — reject at the door rather than
  // scoring its traffic.
  if (agent.status === 'retired' || agent.status === 'suspended') {
    return NextResponse.json(
      { error: `${agent.status === 'retired' ? 'Retired' : 'Suspended'} agents cannot emit events` },
      { status: 422 },
    );
  }

  // Quota enforcement — atomically reserve one monthly event slot before insert.
  const planTier = tenantResult.data?.plan_tier ?? 'pending';
  const quota = await consumeEventQuota(supabase, tenantId, agentId, planTier);
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: 'Monthly event quota exceeded for this agent',
        quota: { limit: quota.limit, current: quota.current, plan: planTier },
      },
      {
        status: 429,
        headers: { 'Retry-After': String(quota.retryAfterSeconds) },
      },
    );
  }

  // Score the event. Financial-scope enforcement now lives in the engine —
  // a trade beyond its certified limits floors to high and records the reason.
  const financialScope = (agent.metadata as { financial_scope?: FinancialScope } | null)?.financial_scope;
  const { score, band, factors } = scoreEvent({ actionType, details, financialScope });

  const payload: Json = {
    action_type: actionType,
    ...(sessionId ? { session_id: sessionId } : {}),
    details: details as Json,
  };

  const { data: event, error: insertError } = await supabase
    .from('behavior_events')
    .insert({
      tenant_id: tenantId,
      agent_id: agentId,
      action_type: actionType,
      risk_score: score,
      risk_band: band,
      factors,
      payload,
      source_ip: sourceIp,
      ...(chainId ? { chain_id: chainId } : {}),
      ...(occurredAt ? { occurred_at: occurredAt } : {}),
    })
    .select('id, risk_score, risk_band, action_type, factors, occurred_at')
    .single();

  if (insertError || !event) {
    try {
      await releaseEventQuotaReservation(supabase, tenantId, agentId);
    } catch (err) {
      log.warn('[events.ingest] quota reservation release failed:', (err as Error).message);
    }
    log.error('[events.ingest]', insertError);
    return NextResponse.json({ error: 'Failed to record event' }, { status: 500 });
  }

  // WORM backup for behavior_events row — fire-and-forget
  void writeAuditWorm({
    tenantId,
    eventType: `behavior_event.${actionType}`,
    rowId: event.id,
    actorType: 'agent',
    actorId: agentId,
    description: `Agent behavior event: ${actionType} (risk: ${band}, score: ${score})`,
    affectedId: agentId,
    metadata: { risk_score: score, risk_band: band, source_ip: sourceIp, action_type: actionType, factors },
    timestamp: event.occurred_at,
  });

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: `behavior.${actionType}`,
    actor_type: 'agent',
    actor_id: agentId,
    description: `Agent "${agent.name}" — ${actionType} (risk: ${band})`,
    affected_id: event.id,
    metadata: { risk_score: score, risk_band: band, source_ip: sourceIp, factors } as Json,
  });

  if (score >= 0.75 && score < 0.85) {
    const today = new Date().toISOString().slice(0, 10);
    const alreadyWarned = await hasNotificationOnDay(
      supabase,
      tenantId,
      agentId,
      'pre_revocation_warning',
      today,
    );

    if (!alreadyWarned) {
      const actionUrl = `https://kakunin.ai/dashboard/agents/${agentId}`;
      await sendProactiveNotification({
        supabase,
        tenantId,
        agentId,
        notificationType: 'pre_revocation_warning',
        title: 'Pre-revocation warning',
        message: `Agent "${agent.name}" crossed the pre-revocation threshold on ${actionType} with score ${score.toFixed(2)}.`,
        severity: 'warning',
        actionUrl,
        metadata: {
          risk_score: score,
          risk_band: band,
          event_id: event.id,
          action_type: actionType,
        },
      });

      const { data: tenant } = await supabase
        .from('tenants')
        .select('email')
        .eq('id', tenantId)
        .single();

      if (tenant?.email) {
        dispatchEmail({
          template: 'risk.pre_revocation_warning',
          to: tenant.email,
          data: {
            tenantId,
            agentName: agent.name,
            agentId,
            score,
            eventType: actionType,
          },
        }).catch((err: unknown) => {
          log.warn('[events.ingest] pre-revocation email dispatch failed', { error: (err as Error).message });
        });
      }
    }
  }

  // High-risk event: fire async revocation check + risk.alert webhook
  if (band === 'high') {
    try {
      await enqueue({
        path: 'revocation-check',
        body: {
          tenantId,
          agentId,
          eventId: event.id,
          riskScore: score,
          actionType,
        },
      });
    } catch (err) {
      // QStash not configured in dev — log warning, never throw
      log.warn('[events.ingest] QStash enqueue skipped:', (err as Error).message);
    }

    // Dispatch risk.alert webhook — fire-and-forget
    dispatchWebhookEvent({
      tenantId,
      eventType: 'risk.alert',
      payload: {
        agent_id: agentId,
        event_id: event.id,
        action_type: actionType,
        risk_score: score,
        risk_band: band,
        occurred_at: event.occurred_at,
      },
    }).catch((err: unknown) => {
      log.warn('[events.ingest] webhook dispatch failed:', (err as Error).message);
    });

    // BYOA alert channels — Slack / PagerDuty / SMS / WhatsApp — fire-and-forget
    dispatchAlertChannels(supabase, {
      tenantId,
      agentId,
      eventId: event.id,
      riskScore: score,
      actionType,
      occurredAt: event.occurred_at,
    }).catch((err: unknown) => {
      log.warn('[events.ingest] alert channel dispatch failed:', (err as Error).message);
    });

    // Email tenant admin for risk.alert — fire-and-forget via QStash
    const { data: agentRow } = await supabase
      .from('agents')
      .select('name')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single();

    const { data: tenant } = await supabase
      .from('tenants')
      .select('email')
      .eq('id', tenantId)
      .single();

    if (tenant?.email) {
      dispatchEmail({
        template: 'risk.alert',
        to: tenant.email,
        data: {
          tenantId,
          agentName: agentRow?.name ?? 'Unknown agent',
          agentId,
          score,
          eventType: actionType,
        },
      }).catch((err: unknown) => {
        log.warn('[events.ingest] risk alert email dispatch failed', { error: (err as Error).message });
      });
    }
  }

  return NextResponse.json({
    data: {
      event_id: event.id,
      risk_score: event.risk_score,
      risk_band: event.risk_band,
      action_type: event.action_type,
      factors: event.factors,
      occurred_at: event.occurred_at,
      revocation_check_queued: band === 'high',
    },
  });
}
