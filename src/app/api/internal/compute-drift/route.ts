/**
 * QStash worker — compute behavioral drift score for one agent.
 *
 * Called nightly per certified agent via QStash scheduled messages.
 * Compares last 7 days of behavioral events against the stored baseline.
 * If no baseline exists and the agent has >= 30 days of data, establishes one first.
 *
 * Fires behavioral_drift_detected webhook when drift_score >= 0.6.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { computeDrift, computeBaseline } from '@/lib/monitoring/drift-engine';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { writeAuditLog } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { parseQStashBody } from '@/lib/api/validation';
import { log } from '@/lib/logging';

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  const parsed = await parseQStashBody(req, bodySchema);
  if (!parsed.ok) return parsed.response;

  const { tenantId, agentId } = parsed.data;
  const supabase = createServiceClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch last 7-day events
  const { data: recentEvents, error: eventsError } = await supabase
    .from('behavior_events')
    .select('action_type, risk_score, occurred_at')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .gte('occurred_at', sevenDaysAgo)
    .order('occurred_at', { ascending: true });

  if (eventsError) {
    log.error('[compute-drift] events fetch failed', eventsError);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }

  // Check for existing baseline
  const { data: existingBaseline } = await supabase
    .from('agent_baselines')
    .select('*')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  let baseline = existingBaseline;

  // Auto-establish baseline if missing and agent has 30 days of data
  if (!baseline) {
    const { data: historicEvents } = await supabase
      .from('behavior_events')
      .select('action_type, risk_score, occurred_at')
      .eq('agent_id', agentId)
      .eq('tenant_id', tenantId)
      .gte('occurred_at', thirtyDaysAgo)
      .order('occurred_at', { ascending: true });

    if (historicEvents && historicEvents.length >= 10) {
      const baselineStats = computeBaseline(historicEvents);
      const { data: newBaseline, error: baselineError } = await supabase
        .from('agent_baselines')
        .upsert({
          tenant_id: tenantId,
          agent_id: agentId,
          established_at: now.toISOString(),
          events_analyzed: baselineStats.events_analyzed,
          action_type_distribution: baselineStats.action_type_distribution as unknown as Json,
          avg_events_per_hour: baselineStats.avg_events_per_hour,
          p50_risk_score: baselineStats.p50_risk_score,
          p95_risk_score: baselineStats.p95_risk_score,
          avg_risk_by_action_type: baselineStats.avg_risk_by_action_type as unknown as Json,
          source: 'auto',
        }, { onConflict: 'tenant_id,agent_id' })
        .select()
        .single();

      if (!baselineError && newBaseline) {
        baseline = newBaseline;

        // Audit baseline establishment (rule #1: every state mutation is audited)
        await writeAuditLog(supabase, {
          tenant_id: tenantId,
          event_type: 'agent.baseline_established',
          actor_type: 'system',
          actor_id: 'compute-drift-worker',
          description: `Behavioral baseline auto-established for agent ${agentId} from ${baselineStats.events_analyzed} events`,
          affected_id: agentId,
          metadata: { events_analyzed: baselineStats.events_analyzed, source: 'auto' },
        });
      }
    }
  }

  // No baseline yet — skip drift computation, not enough data
  if (!baseline || !recentEvents || recentEvents.length === 0) {
    return NextResponse.json({ data: { skipped: true, reason: 'insufficient_data' } });
  }

  // Compute current distribution from recent events
  const total = recentEvents.length;
  const typeCounts: Record<string, number> = {};
  for (const e of recentEvents) {
    typeCounts[e.action_type] = (typeCounts[e.action_type] ?? 0) + 1;
  }
  const currentDistribution: Record<string, number> = {};
  for (const [type, count] of Object.entries(typeCounts)) {
    currentDistribution[type] = count / total;
  }

  const recentTimestamps = recentEvents.map((e) => new Date(e.occurred_at).getTime());
  const windowMs = Math.max(...recentTimestamps) - Math.min(...recentTimestamps);
  const windowHours = windowMs > 0 ? windowMs / (1000 * 60 * 60) : 1;
  const currentEventsPerHour = total / windowHours;

  const sortedScores = recentEvents.map((e) => e.risk_score).sort((a, b) => a - b);
  const p95Index = Math.floor(sortedScores.length * 0.95);
  const currentP95 = sortedScores[p95Index] ?? 0;

  const result = computeDrift(
    {
      action_type_distribution: baseline.action_type_distribution as unknown as Record<string, number>,
      avg_events_per_hour: Number(baseline.avg_events_per_hour),
      p50_risk_score: Number(baseline.p50_risk_score),
      p95_risk_score: Number(baseline.p95_risk_score),
    },
    currentDistribution,
    currentEventsPerHour,
    currentP95,
  );

  // Store drift score (append-only)
  const { error: driftInsertError } = await supabase.from('agent_drift_scores').insert({
    tenant_id: tenantId,
    agent_id: agentId,
    computed_at: now.toISOString(),
    drift_score: result.drift_score,
    drift_band: result.drift_band,
    contributing_factors: result.contributing_factors as unknown as Json,
    window_days: 7,
  });

  if (driftInsertError) {
    log.error('[compute-drift] drift score insert failed', { agentId, error: driftInsertError.message });
  }

  // Fire behavioral_drift_detected webhook when significant
  if (result.drift_band === 'significant') {
    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'agent.drift.significant',
      actor_type: 'system',
      actor_id: 'drift-engine',
      description: `Significant behavioral drift detected for agent ${agentId} (score: ${result.drift_score})`,
      affected_id: agentId,
      metadata: {
        drift_score: result.drift_score,
        drift_band: result.drift_band,
        contributing_factors: result.contributing_factors,
      } as Json,
    });

    dispatchWebhookEvent({
      tenantId,
      eventType: 'risk.alert',
      payload: {
        alert_type: 'behavioral_drift_detected',
        agent_id: agentId,
        drift_score: result.drift_score,
        drift_band: result.drift_band,
        contributing_factors: result.contributing_factors,
        computed_at: now.toISOString(),
      },
    }).catch((err: unknown) => {
      log.warn('[compute-drift] webhook dispatch failed', { agentId, error: (err as Error).message });
    });
  }

  return NextResponse.json({
    data: {
      agent_id: agentId,
      drift_score: result.drift_score,
      drift_band: result.drift_band,
      contributing_factors: result.contributing_factors,
      computed_at: now.toISOString(),
    },
  });
}
