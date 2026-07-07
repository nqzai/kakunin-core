import type { SupabaseClient } from '@supabase/supabase-js';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';

export type ProactiveNotificationType =
  | 'pre_revocation_warning'
  | 'certificate_expiring'
  | 'quota_warning'
  | 'compliance_deadline'
  | 'risk_threshold_crossed'
  | 'agent_halted'
  | 'system_alert';

interface SendProactiveNotificationParams {
  supabase: SupabaseClient;
  tenantId: string;
  agentId: string;
  notificationType: ProactiveNotificationType;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export async function hasNotificationOnDay(
  supabase: SupabaseClient,
  tenantId: string,
  agentId: string,
  notificationType: ProactiveNotificationType,
  dayIso: string,
): Promise<boolean> {
  const { count } = await supabase
    .from('audit_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('affected_id', agentId)
    .eq('event_type', `notification.${notificationType}`)
    .gte('created_at', `${dayIso}T00:00:00Z`);

  return (count ?? 0) > 0;
}

export async function sendProactiveNotification({
  supabase,
  tenantId,
  agentId,
  notificationType,
  title,
  message,
  severity,
  actionUrl,
  metadata,
}: SendProactiveNotificationParams) {
  return writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: `notification.${notificationType}`,
    actor_type: 'system',
    actor_id: 'kakunin',
    description: message,
    affected_id: agentId,
    metadata: {
      notification_type: notificationType,
      title,
      severity,
      action_url: actionUrl ?? null,
      ...(metadata ?? {}),
    } as Json,
  });
}
