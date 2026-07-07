import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import type { ActionType, RiskBand } from '@/lib/monitoring/risk-engine';
import type { DriftBand } from '@/lib/monitoring/drift-engine';

interface RiskTrendPoint {
  date: string;
  avg_score: number;
  event_count: number;
  dominant_band: RiskBand;
}

/**
 * GET /v1/agents/:id/risk — 30-day rolling risk profile.
 *
 * Returns trend, per-action-type breakdown, and recent high-risk events.
 * Designed for autonomous agents to self-assess their compliance posture.
 * Edge-cached 60s — fresh enough for monitoring, cheap enough to poll.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;
  const supabase = createServiceClient();

  // Verify agent exists + belongs to tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const windowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch latest drift score — parallel with events fetch
  const driftQuery = supabase
    .from('agent_drift_scores')
    .select('drift_score, drift_band, contributing_factors, computed_at, window_days')
    .eq('agent_id', id)
    .eq('tenant_id', tenantId)
    .order('computed_at', { ascending: false })
    .limit(2);

  const baselineQuery = supabase
    .from('agent_baselines')
    .select('established_at, events_analyzed')
    .eq('agent_id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  // Fetch events + drift data in parallel
  const [eventsResult, driftResult, baselineResult] = await Promise.all([
    supabase
      .from('behavior_events')
      .select('id, action_type, risk_score, risk_band, factors, occurred_at, source_ip')
      .eq('agent_id', id)
      .eq('tenant_id', tenantId)
      .gte('occurred_at', windowStart)
      .order('occurred_at', { ascending: true }),
    driftQuery,
    baselineQuery,
  ]);

  if (eventsResult.error) {
    return NextResponse.json({ error: 'Failed to fetch risk data' }, { status: 500 });
  }

  const { data: events } = eventsResult;
  const latestDrift = driftResult.data?.[0] ?? null;
  const previousDrift = driftResult.data?.[1] ?? null;
  const baseline = baselineResult.data ?? null;

  const driftTrend = latestDrift && previousDrift
    ? (latestDrift.drift_score > previousDrift.drift_score ? 'increasing'
      : latestDrift.drift_score < previousDrift.drift_score ? 'decreasing'
      : 'stable')
    : null;

  const allEvents = events ?? [];

  // Aggregate: event counts + avg score per action type
  const byActionType: Record<string, { count: number; total_score: number; avg_score: number }> = {};
  for (const e of allEvents) {
    if (!byActionType[e.action_type]) {
      byActionType[e.action_type] = { count: 0, total_score: 0, avg_score: 0 };
    }
    byActionType[e.action_type].count++;
    byActionType[e.action_type].total_score += e.risk_score;
  }
  for (const key of Object.keys(byActionType)) {
    const b = byActionType[key];
    b.avg_score = Math.round((b.total_score / b.count) * 1000) / 1000;
  }

  // Build daily trend (UTC day buckets)
  const dailyMap: Record<string, { scores: number[]; count: number; bands: Record<RiskBand, number> }> = {};
  for (const e of allEvents) {
    const day = e.occurred_at.slice(0, 10); // YYYY-MM-DD
    if (!dailyMap[day]) {
      dailyMap[day] = { scores: [], count: 0, bands: { low: 0, medium: 0, high: 0 } };
    }
    dailyMap[day].scores.push(e.risk_score);
    dailyMap[day].count++;
    dailyMap[day].bands[e.risk_band as RiskBand]++;
  }

  const trend: RiskTrendPoint[] = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const avg = d.scores.reduce((s, x) => s + x, 0) / d.scores.length;
      const dominant = (['high', 'medium', 'low'] as RiskBand[]).find(
        (band) => d.bands[band] > 0
      ) ?? 'low';
      return {
        date,
        avg_score: Math.round(avg * 1000) / 1000,
        event_count: d.count,
        dominant_band: dominant,
      };
    });

  // Overall stats
  const totalEvents = allEvents.length;
  const avgScore =
    totalEvents > 0
      ? Math.round((allEvents.reduce((s, e) => s + e.risk_score, 0) / totalEvents) * 1000) / 1000
      : 0;
  const highRiskEvents = allEvents.filter((e) => e.risk_band === 'high');
  const dominantBand: RiskBand =
    highRiskEvents.length > 0
      ? 'high'
      : allEvents.some((e) => e.risk_band === 'medium')
        ? 'medium'
        : 'low';

  // Recent high-risk events (last 10)
  const recentHighRisk = highRiskEvents
    .slice(-10)
    .reverse()
    .map((e) => ({
      id: e.id,
      action_type: e.action_type as ActionType,
      risk_score: e.risk_score,
      factors: e.factors,
      occurred_at: e.occurred_at,
      source_ip: e.source_ip,
    }));

  const response = NextResponse.json({
    data: {
      agent_id: id,
      agent_name: agent.name,
      agent_status: agent.status,
      window_days: 30,
      window_start: windowStart,
      total_events: totalEvents,
      avg_score: avgScore,
      dominant_band: dominantBand,
      event_counts_by_type: byActionType,
      high_risk_event_count: highRiskEvents.length,
      recent_high_risk_events: recentHighRisk,
      trend,
      drift: latestDrift ? {
        drift_score: latestDrift.drift_score,
        drift_band: latestDrift.drift_band as DriftBand,
        contributing_factors: latestDrift.contributing_factors as string[],
        computed_at: latestDrift.computed_at,
        drift_trend: driftTrend,
        baseline_established_at: baseline?.established_at ?? null,
        baseline_events_analyzed: baseline?.events_analyzed ?? null,
      } : {
        drift_score: null,
        drift_band: null,
        drift_trend: null,
        baseline_established_at: baseline?.established_at ?? null,
        baseline_events_analyzed: baseline?.events_analyzed ?? null,
        note: baseline ? 'Drift score pending — scheduled computation runs nightly' : 'No baseline established yet. Baseline auto-established after 30 days of data.',
      },
    },
  });

  // 60s CDN cache — fresh enough for monitoring dashboards + agent self-assessment
  response.headers.set('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
  return response;
}
