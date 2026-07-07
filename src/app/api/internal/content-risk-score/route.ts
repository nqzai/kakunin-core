import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import { analyzeAgentOutput } from '@/lib/content-risk/analyze';
import type { Json } from '@/types/database';

/**
 * POST /api/internal/content-risk-score (QStash worker — P3b RA-186)
 *
 * Scores one agent message for manipulation/deception (FME content-risk) and,
 * when the risk is material (band ≥ medium), records it as an
 * `output_content_risk` behavioral event + audit row — mapped to EU AI Act
 * Article 5 (prohibited manipulative/deceptive practices). Async, off the hot
 * path. Always returns 200 (no QStash retry on a scored message).
 */

interface ScoreJob {
  tenantId: string;
  agentId: string;
  text: string;
  source: string;
  messageId?: string;
}

// Only persist material risk — avoid flooding the event stream with low scores.
const MIN_PERSIST = 0.3;

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;
  const job = JSON.parse(verified.body) as ScoreJob;

  let result;
  try {
    result = await analyzeAgentOutput(job.text);
  } catch (err) {
    log.error('[content-risk-score] Analysis failed', { agentId: job.agentId, error: (err as Error).message });
    return NextResponse.json({ ok: false, reason: 'analysis_failed' }); // 200 — don't retry
  }

  if (result.risk_score < MIN_PERSIST) {
    return NextResponse.json({ ok: true, scored: true, persisted: false, risk_score: result.risk_score });
  }

  const supabase = createServiceClient();
  const occurredAt = new Date().toISOString();

  const { data: inserted, error } = await supabase
    .from('behavior_events')
    .insert({
      tenant_id: job.tenantId,
      agent_id: job.agentId,
      action_type: 'output_content_risk',
      risk_score: result.risk_score,
      risk_band: result.band,
      factors: result.factors,
      occurred_at: occurredAt,
      environment: 'production',
      payload: {
        source: job.source,
        message_id: job.messageId ?? null,
        techniques: result.techniques.map((t) => ({ technique: t.technique, text: t.text, confidence: t.confidence })),
        fallacies: result.fallacies,
        emotion: result.emotion,
        provenance: result.provenance,
      } as Json,
    })
    .select('id')
    .single();

  if (error || !inserted) {
    log.error('[content-risk-score] Event insert failed', { agentId: job.agentId, error: error?.message });
    return NextResponse.json({ ok: false, reason: 'insert_failed' }); // 200
  }

  // EU AI Act Art. 5 — manipulative/deceptive output is an auditable event.
  await writeAuditLog(supabase, {
    tenant_id: job.tenantId,
    event_type: 'agent.output_content_risk',
    actor_type: 'system',
    actor_id: 'content-risk-worker',
    description: `Agent output flagged ${result.band} content-risk (${result.risk_score}): ${result.factors.join(', ')}`,
    affected_id: job.agentId,
    metadata: {
      regulation: 'eu_ai_act_art_5',
      risk_score: result.risk_score,
      band: result.band,
      factors: result.factors,
      source: job.source,
      event_id: inserted.id,
    },
  });

  log.info('[content-risk-score] Persisted', { agentId: job.agentId, risk: result.risk_score, band: result.band });
  return NextResponse.json({ ok: true, scored: true, persisted: true, risk_score: result.risk_score, band: result.band });
}
