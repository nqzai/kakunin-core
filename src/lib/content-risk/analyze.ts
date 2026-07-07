/**
 * Agent-output content-risk analyzer (P0 pilot).
 *
 * Single agent message → one LLM annotation call (temp 0) → tolerant parse →
 * deterministic span anchoring (indexOf, NFC + case-fold) → deterministic
 * severity aggregation → AgentOutputRisk shaped toward behavior_event.
 *
 * OFFLINE only. NOT wired to /api/v1/events. See docs/FME_PILOT.md.
 */

import { complete, getModel } from '@/lib/openrouter/client';
import { shortTextRiskScore, contentRiskBand, severityTableHash } from './severity';
import {
  AGENT_OUTPUT_SYSTEM_PROMPT,
  PROMPT_VERSION,
  promptHash,
} from './prompt';
import {
  WireSpan,
  WireFallacy,
  WireEmotion,
  type AgentOutputWire,
  type AnchoredSpan,
  type AgentOutputRisk,
} from './schema';

/** LLM seam — injectable so unit tests run offline (no OpenRouter). */
export interface ContentRiskLLM {
  /** Returns raw model text (expected to be a JSON object). */
  complete(args: { system: string; user: string; model: string }): Promise<string>;
}

/** Default seam backed by Kakunin's OpenRouter client at temperature 0. */
export const openRouterContentRiskLLM: ContentRiskLLM = {
  async complete({ system, user, model }) {
    const res = await complete(
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: 0,
        maxTokens: 1500,
      },
      getModel('content_risk_fallback'),
    );
    return res.content;
  },
};

export function wordCount(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/**
 * Strip optional ```json fences and parse to an object. Returns {} on any
 * failure — the tolerant element parse below then yields an empty result
 * rather than throwing and losing the whole message.
 */
function parseLoose(raw: string): unknown {
  let s = raw.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) s = fence[1].trim();
  // Some models still prepend prose — grab the first {...} block.
  if (!s.startsWith('{')) {
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) s = s.slice(start, end + 1);
  }
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}

/** Tolerant element-wise parse — one bad span/fallacy never poisons the message. */
export function parseWire(raw: string): AgentOutputWire {
  const obj = parseLoose(raw) as {
    spans?: unknown[];
    fallacies?: unknown[];
    emotion?: unknown;
  };
  const spans: WireSpan[] = [];
  for (const r of Array.isArray(obj.spans) ? obj.spans : []) {
    const p = WireSpan.safeParse(r);
    if (p.success) spans.push(p.data);
  }
  const fallacies: WireFallacy[] = [];
  for (const r of Array.isArray(obj.fallacies) ? obj.fallacies : []) {
    const p = WireFallacy.safeParse(r);
    if (p.success) fallacies.push(p.data);
  }
  const emo = WireEmotion.safeParse(obj.emotion);
  return {
    spans,
    fallacies,
    emotion: emo.success ? emo.data : { fear: 0, urgency: 0 },
  };
}

/**
 * Deterministically anchor each wire span to the source message. Drops spans
 * with confidence < 0.4, text < 8 chars, or text not found in the message
 * (hallucinated). Anchoring: NFC-normalized exact match, then case-fold.
 */
export function anchorSpans(message: string, spans: WireSpan[]): AnchoredSpan[] {
  const normMsg = message.normalize('NFC');
  const out: AnchoredSpan[] = [];
  for (const s of spans) {
    if (s.confidence < 0.4) continue;
    if (s.text.length < 8) continue;
    const normText = s.text.normalize('NFC');

    let cs = normMsg.indexOf(normText);
    if (cs < 0) cs = normMsg.toLowerCase().indexOf(normText.toLowerCase());
    if (cs < 0) continue; // hallucinated — not in message

    const ce = cs + normText.length;
    out.push({
      span_id: s.span_id,
      char_start: cs,
      char_end: ce,
      text: message.slice(cs, ce),
      technique: s.technique,
      appeal: s.appeal,
      confidence: s.confidence,
      rationale: s.rationale,
    });
  }
  return out;
}

/** Build the deterministic AgentOutputRisk from an already-anchored annotation. */
export function buildRisk(
  message: string,
  wire: AgentOutputWire,
  model: string,
): AgentOutputRisk {
  const techniques = anchorSpans(message, wire.spans);
  const words = wordCount(message);
  // RA-187: length-agnostic saturating score (replaces the news density formula
  // that saturated short chat messages to a binary 0/1).
  const risk_score = shortTextRiskScore(techniques);

  const factors = [
    ...new Set([
      ...techniques.filter((t) => t.technique !== 'factual_claim').map((t) => t.technique),
      ...wire.fallacies.map((f) => `fallacy:${f.fallacy_type}`),
    ]),
  ].sort();

  return {
    action_type: 'output_content_risk',
    risk_score,
    band: contentRiskBand(risk_score),
    manipulation_risk: Math.round(risk_score * 100 * 100) / 100,
    factors,
    techniques,
    fallacies: wire.fallacies,
    emotion: wire.emotion,
    provenance: {
      prompt_hash: promptHash(),
      prompt_version: PROMPT_VERSION,
      severity_table_hash: severityTableHash(),
      model,
      word_count: words,
    },
  };
}

export interface AnalyzeOptions {
  llm?: ContentRiskLLM;
  model?: string;
}

/**
 * Analyze one agent message for content risk. Offline/dogfood use only.
 * Returns an AgentOutputRisk; the caller decides what to do with it (pilot
 * writes a dry-run JSON report — it does NOT touch the DB).
 */
export async function analyzeAgentOutput(
  message: string,
  opts: AnalyzeOptions = {},
): Promise<AgentOutputRisk> {
  const llm = opts.llm ?? openRouterContentRiskLLM;
  const model = opts.model ?? getModel('content_risk');

  if (wordCount(message) === 0) {
    return buildRisk(message, { spans: [], fallacies: [], emotion: { fear: 0, urgency: 0 } }, model);
  }

  const raw = await llm.complete({
    system: AGENT_OUTPUT_SYSTEM_PROMPT,
    user: `Agent message to analyse:\n\n${message}`,
    model,
  });
  const wire = parseWire(raw);
  return buildRisk(message, wire, model);
}
