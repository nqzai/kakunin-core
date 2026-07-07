import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';
import { parseBody } from '@/lib/api/validation';
import { unauthorized, notFound, serverError } from '@/lib/api/responses';

/**
 * POST /v1/subscriptions
 * Create a new event feed subscription for an agent.
 *
 * GET /v1/subscriptions
 * List all active subscriptions for the tenant.
 *
 * Subscriptions are stored in the audit_log table with
 * event_type = 'subscription.created' and the full config in metadata.
 * This avoids a schema migration while keeping a full audit trail.
 *
 * l5_subscription_api: agents manage ongoing subscriptions
 * to data feeds programmatically, with full lifecycle (create/list/cancel).
 */

const EVENT_TYPES = [
  'behavior_event.high_risk',
  'behavior_event.medium_risk',
  'certificate.issued',
  'certificate.revoked',
  'certificate.expiring_soon',
  'agent.halted',
  'risk.alert',
] as const;

const createSubscriptionSchema = z.object({
  agent_id: z.string().uuid(),
  event_types: z.array(z.enum(EVENT_TYPES)).min(1),
  delivery_url: z.string().url(),
  description: z.string().max(255).optional(),
  min_risk_score: z.number().min(0).max(1).optional(),
});

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return unauthorized('Missing or invalid Authorization header');
  }

  const parsed = await parseBody(req, createSubscriptionSchema);
  if (!parsed.ok) return parsed.response;

  const { agent_id, event_types, delivery_url, description, min_risk_score } = parsed.data;
  const supabase = createServiceClient();

  // Verify agent belongs to this tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agent_id)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return notFound('Agent');
  }

  // Store subscription in audit_log — has a flexible metadata JSON column
  const subscription = await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'subscription.created',
    actor_type: 'system',
    actor_id: tenantId,
    description: description ?? `Subscription for ${event_types.join(', ')} on agent ${agent_id}`,
    affected_id: agent_id,
    metadata: {
      subscription_active: true,
      agent_id,
      event_types,
      delivery_url,
      description: description ?? null,
      min_risk_score: min_risk_score ?? null,
    } as Json,
  });

  if (!subscription) {
    log.error('[subscriptions.create] writeAuditLog failed');
    return serverError('Failed to create subscription');
  }

  return NextResponse.json(
    {
      data: {
        id: subscription.id,
        agent_id,
        event_types,
        delivery_url,
        active: true,
        min_risk_score: min_risk_score ?? null,
        description: description ?? null,
        created_at: subscription.created_at,
      },
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return unauthorized('Missing or invalid Authorization header');
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get('agent_id');

  const supabase = createServiceClient();

  // Fetch subscriptions from audit_log
  let query = supabase
    .from('audit_log')
    .select('id, created_at, metadata, affected_id')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.created')
    .order('created_at', { ascending: false });

  if (agentId) query = query.eq('affected_id', agentId);

  const { data: rows, error } = await query;

  if (error) {
    return serverError('Failed to fetch subscriptions');
  }

  // Fetch all cancelled subscription IDs for this tenant
  const { data: cancelledRows, error: cancelledError } = await supabase
    .from('audit_log')
    .select('affected_id')
    .eq('tenant_id', tenantId)
    .eq('event_type', 'subscription.cancelled');

  if (cancelledError) {
    return serverError('Failed to fetch cancellations');
  }

  const cancelledIds = new Set(
    (cancelledRows ?? [])
      .map(r => r.affected_id)
      .filter((id): id is string => typeof id === 'string')
  );

  // Filter to active-only subscriptions (not cancelled)
  const active = (rows ?? [])
    .filter(r => !cancelledIds.has(r.id))
    .map(r => {
      const meta = r.metadata as {
        agent_id?: string;
        event_types?: string[];
        delivery_url?: string;
        description?: string;
        min_risk_score?: number;
      } | null;
      return {
        id: r.id,
        agent_id: meta?.agent_id ?? r.affected_id,
        event_types: meta?.event_types ?? [],
        delivery_url: meta?.delivery_url ?? null,
        active: true,
        description: meta?.description ?? null,
        min_risk_score: meta?.min_risk_score ?? null,
        created_at: r.created_at,
      };
    });

  return NextResponse.json({ data: active });
}
