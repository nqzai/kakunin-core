/**
 * Content-risk async dispatch (P3b — RA-186).
 *
 * Enqueues an agent message for offline content-risk scoring via QStash. NEVER
 * call inline on a response path — scoring adds ~2–5s of LLM latency, so it must
 * stay off the /v1/events and chat hot paths (V2_BLUEPRINT §P3b). Fire-and-
 * forget: callers do `void enqueueContentRiskScoring(...).catch(() => {})`.
 */

import { enqueue } from '@/lib/queue/qstash';

export interface ContentRiskJob {
  tenantId: string;
  agentId: string;
  /** The agent output text to score. */
  text: string;
  /** Origin of the message, e.g. 'chat' | 'discord' | 'agentmail'. */
  source: string;
  /** Optional source row id (chat_messages.id) for traceability. */
  messageId?: string;
}

export async function enqueueContentRiskScoring(job: ContentRiskJob): Promise<void> {
  if (!job.text || !job.text.trim()) return;
  await enqueue({ path: 'content-risk-score', body: { ...job } });
}
