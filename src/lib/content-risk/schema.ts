/**
 * Content-risk schemas (P0 pilot subset).
 *
 * Wire schema = what the LLM emits for ONE agent message (single chunk, no
 * chunker). `AgentOutputRisk` = the deterministic, post-aggregation result
 * mapped toward Kakunin's behavior_event shape.
 *
 * Subset of RA FME V19: techniques + appeals + fallacies + a fear/urgency
 * emotion pair. Dropped for v0: ideology, grounding/fact-check, strategic
 * omissions, full Plutchik-8, cross-platform corroboration. See docs/FME_PILOT.md §3.
 */

import { z } from 'zod';

export const Appeal = z.enum(['ethos', 'pathos', 'logos', 'mixed']);
export type Appeal = z.infer<typeof Appeal>;

/** One manipulation/rhetoric span the model found in the message (chunk-local). */
export const WireSpan = z.object({
  span_id: z.string(),
  text: z.string().min(8), // verbatim, min 8 chars to avoid false-match anchoring
  technique: z.string().min(1),
  appeal: Appeal,
  confidence: z.number().min(0).max(1),
  rationale: z.string().optional(),
});
export type WireSpan = z.infer<typeof WireSpan>;

/** One logical fallacy the model found (RA LogicFracture subset). */
export const WireFallacy = z.object({
  fallacy_type: z.string().min(1),
  quote: z.string().min(1),
  rationale: z.string().optional(),
});
export type WireFallacy = z.infer<typeof WireFallacy>;

export const WireEmotion = z.object({
  fear: z.number().min(0).max(1),
  urgency: z.number().min(0).max(1),
});
export type WireEmotion = z.infer<typeof WireEmotion>;

export const AgentOutputWire = z.object({
  spans: z.array(WireSpan),
  fallacies: z.array(WireFallacy),
  emotion: WireEmotion,
});
export type AgentOutputWire = z.infer<typeof AgentOutputWire>;

/** Span re-anchored to the source message (char offsets verified by indexOf). */
export interface AnchoredSpan {
  span_id: string;
  char_start: number;
  char_end: number;
  text: string;
  technique: string;
  appeal: Appeal;
  confidence: number;
  rationale?: string;
}

/**
 * Deterministic content-risk result for one agent message. Shaped to drop
 * into a future `behavior_event` (action_type 'output_content_risk') — but in
 * the pilot it is serialized to a dry-run JSON report, NOT written to the DB.
 */
export interface AgentOutputRisk {
  action_type: 'output_content_risk';
  /** 0–1 deterministic short-text content-risk score (RA-187 saturating curve). */
  risk_score: number;
  /** Band derived from risk_score: low <0.3, medium <0.6, high ≥0.6. */
  band: 'low' | 'medium' | 'high';
  /** 0–100 mirror of risk_score for dashboards. */
  manipulation_risk: number;
  /** Label list for dashboards — mirrors RA-166 factors[] pattern. */
  factors: string[];
  techniques: AnchoredSpan[];
  fallacies: WireFallacy[];
  emotion: WireEmotion;
  /** Provenance for the WORM trail — keeps scores reproducible. */
  provenance: {
    prompt_hash: string;
    prompt_version: string;
    severity_table_hash: string;
    model: string;
    word_count: number;
  };
}
