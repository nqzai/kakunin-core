import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

/**
 * GET /v1/notifications
 * Fetch the agent notification inbox — proactive alerts pushed by Kakunin.
 *
 * POST /v1/notifications/push (internal/system use)
 * Push a proactive notification to an agent's registered inbox.
 *
 * Unlike webhooks (which are reactive event callbacks), proactive notifications
 * are Kakunin-initiated alerts sent ahead of critical state changes:
 *
 *   - pre_revocation_warning: risk score crossed 0.75 — revocation imminent if no intervention
 *   - certificate_expiring:   certificate expires in 7 days
 *   - quota_warning:          80% of monthly event quota consumed
 *   - compliance_deadline:    upcoming regulatory deadline for the tenant's jurisdiction
 *
 * This fulfills l5_proactive_notifications: the service reaches out to agents
 * BEFORE a state change rather than only reacting after the fact.
 *
 * Notifications are stored in the audit_log with event_type = 'notification.*'
 * and can be queried by agent_id.
 */

const NOTIFICATION_TYPES = [
  'pre_revocation_warning',
  'certificate_expiring',
  'quota_warning',
  'compliance_deadline',
  'risk_threshold_crossed',
  'agent_halted',
  'system_alert',
] as const;

const pushNotificationSchema = z.object({
  agent_id: z.string().uuid(),
  notification_type: z.enum(NOTIFICATION_TYPES),
  title: z.string().max(255),
  message: z.string().max(2000),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  action_url: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const url = new URL(req.url);
  const agentId = url.searchParams.get('agent_id');
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(Math.max(1, Number(limitRaw ?? 50)), 100);
  const before = url.searchParams.get('before');

  const supabase = createServiceClient();

  let query = supabase
    .from('audit_log')
    .select('id, event_type, actor_type, actor_id, description, affected_id, metadata, created_at')
    .eq('tenant_id', tenantId)
    .like('event_type', 'notification.%')
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (agentId) query = query.eq('affected_id', agentId);
  if (before) query = query.lt('created_at', before);

  const { data: notifications, error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  const hasNextPage = (notifications?.length ?? 0) > limit;
  const rows = hasNextPage ? notifications!.slice(0, limit) : (notifications ?? []);
  const nextCursor = hasNextPage ? rows[rows.length - 1]?.created_at ?? null : null;

  return NextResponse.json({
    data: rows.map(n => {
      const meta = n.metadata as { notification_type?: string; severity?: string; title?: string; action_url?: string } | null;
      return {
        id: n.id,
        notification_type: meta?.notification_type ?? n.event_type.replace('notification.', ''),
        severity: meta?.severity ?? 'info',
        title: meta?.title ?? n.description,
        message: n.description,
        agent_id: n.affected_id,
        action_url: meta?.action_url ?? null,
        created_at: n.created_at,
      };
    }),
    pagination: {
      limit,
      has_next_page: hasNextPage,
      next_cursor: nextCursor,
    },
  });
}

export async function POST(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id');
  if (!tenantId) {
    return NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 });
  }

  const body = pushNotificationSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { agent_id, notification_type, title, message, severity, action_url, metadata } = body.data;
  const supabase = createServiceClient();

  // Verify agent belongs to tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('id', agent_id)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  // Store as audit_log entry with notification.* event_type
  const notification = await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: `notification.${notification_type}`,
    actor_type: 'system',
    actor_id: 'kakunin',
    description: message,
    affected_id: agent_id,
    metadata: {
      notification_type,
      title,
      severity,
      action_url: action_url ?? null,
      ...(metadata ?? {}),
    } as Json,
  });

  if (!notification) {
    log.error('[notifications.push] writeAuditLog failed');
    return NextResponse.json({ error: 'Failed to push notification' }, { status: 500 });
  }

  return NextResponse.json(
    {
      data: {
        id: notification.id,
        agent_id,
        notification_type,
        severity,
        title,
        message,
        action_url: action_url ?? null,
        created_at: notification.created_at,
      },
    },
    { status: 201 }
  );
}
