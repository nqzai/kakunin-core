import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import { trackRouteTiming } from '@/lib/observability/route-timing';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

export interface DashboardRequestContext {
  pathname: string;
  userEmail: string;
  userName: string;
  tenantId: string | null;
  tenantName: string | null;
  planTier: string | null;
  stripeCustomerId: string | null;
}

export interface DashboardOverviewData {
  alertCount: number;
  debugChatEnabled: boolean;
  totalAgents: number;
  activeCerts: number;
  eventsToday: number;
  highRiskCount: number;
  activeAgents: Array<{ id: string; name: string; status: string; created_at: string }>;
  trustSignals: Array<{
    title: string;
    url: string;
    source: string | null;
    published_at: string | null;
    risk_cls: string | null;
  }>;
  auditEvents: Array<{
    id: string;
    event_type: string;
    description: string;
    actor_type: string;
    actor_id: string;
    affected_id: string | null;
    created_at: string;
  }>;
}

const EMPTY_OVERVIEW: DashboardOverviewData = {
  alertCount: 0,
  debugChatEnabled: false,
  totalAgents: 0,
  activeCerts: 0,
  eventsToday: 0,
  highRiskCount: 0,
  activeAgents: [],
  trustSignals: [],
  auditEvents: [],
};

function readHeaderValue(value: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

export const getDashboardRequestContext = cache(async (): Promise<DashboardRequestContext | null> => {
  const startedAt = Date.now();
  const requestHeaders = await headers();
  const pathname = readHeaderValue(requestHeaders.get('x-kakunin-pathname')) ?? '/dashboard';
  const appContext = await resolveAuthenticatedAppContext();
  if (!appContext) {
    trackRouteTiming({
      route: '/dashboard/request-context',
      status: 'client_error',
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 200,
      sampleRate: 0.1,
      context: { pathname, outcome: 'unauthenticated' },
    });
    return null;
  }

  const context = {
    pathname,
    userEmail: appContext.userEmail,
    userName: appContext.userName,
    tenantId: appContext.tenant?.id ?? null,
    tenantName: appContext.tenant?.name ?? null,
    planTier: appContext.planTier,
    stripeCustomerId: appContext.stripeCustomerId,
  };

  trackRouteTiming({
    route: '/dashboard/request-context',
    status: 'ok',
    durationMs: Date.now() - startedAt,
    slowThresholdMs: 200,
    sampleRate: 0.05,
    context: {
      pathname,
      tenantId: context.tenantId,
      planTier: context.planTier,
      outcome: 'resolved',
    },
  });

  return context;
});

const getCachedDashboardOverviewData = unstable_cache(async (
  tenantId: string | null
): Promise<DashboardOverviewData> => {
  const db = createServiceClient();

  const trustSignalsPromise = db
    .from('trust_signals')
    .select('title, url, source, published_at, risk_cls')
    .order('published_at', { ascending: false })
    .limit(5);

  if (!tenantId) {
    const trustSignalsRes = await trustSignalsPromise;
    return {
      ...EMPTY_OVERVIEW,
      trustSignals: (trustSignalsRes.data ?? []) as DashboardOverviewData['trustSignals'],
    };
  }

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [
    summaryRes,
    activeAgentsRes,
    auditLogRes,
    trustSignalsRes,
  ] = await Promise.all([
    db.rpc('get_dashboard_overview_summary', {
      p_tenant_id: tenantId,
      p_since: yesterday,
    }),
    db.from('agents').select('id, name, status, created_at')
      .eq('tenant_id', tenantId).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(4),
    db.from('audit_log').select('id, event_type, description, actor_type, actor_id, affected_id, created_at')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(6),
    trustSignalsPromise,
  ]);

  const summary = ((summaryRes.data ?? [])[0] ?? {}) as {
    total_agents?: number | string | null;
    active_certs?: number | string | null;
    events_today?: number | string | null;
    high_risk_count?: number | string | null;
    debug_chat_enabled?: boolean | null;
  };

  const totalAgents = Number(summary.total_agents ?? 0);
  const activeCerts = Number(summary.active_certs ?? 0);
  const eventsToday = Number(summary.events_today ?? 0);
  const highRiskCount = Number(summary.high_risk_count ?? 0);

  return {
    alertCount: highRiskCount,
    debugChatEnabled: summary.debug_chat_enabled ?? false,
    totalAgents,
    activeCerts,
    eventsToday,
    highRiskCount,
    activeAgents: (activeAgentsRes.data ?? []) as DashboardOverviewData['activeAgents'],
    trustSignals: (trustSignalsRes.data ?? []) as DashboardOverviewData['trustSignals'],
    auditEvents: (auditLogRes.data ?? []) as DashboardOverviewData['auditEvents'],
  };
}, ['dashboard-overview'], { revalidate: 30 });

export const getDashboardOverviewData = cache(async (
  tenantId: string | null
): Promise<DashboardOverviewData> => {
  const startedAt = Date.now();
  const requestHeaders = await headers();
  const pathname = readHeaderValue(requestHeaders.get('x-kakunin-pathname')) ?? '/dashboard';
  const overview = await getCachedDashboardOverviewData(tenantId);

  trackRouteTiming({
    route: '/dashboard/overview',
    status: 'ok',
    durationMs: Date.now() - startedAt,
    slowThresholdMs: 250,
    sampleRate: 0.05,
    context: {
      pathname,
      tenantId,
      outcome: tenantId ? 'tenant_overview' : 'empty_overview',
      alertCount: overview.alertCount,
      totalAgents: overview.totalAgents,
    },
  });

  return overview;
});
