import { describe, it, expect } from 'vitest';
import {
  manipulationRiskScore,
  severityWeight,
  severityTableHash,
  DENSITY_SCALE,
  shortTextRiskScore,
  contentRiskBand,
} from '@/lib/content-risk/severity';
import {
  parseWire,
  anchorSpans,
  buildRisk,
  wordCount,
  analyzeAgentOutput,
  type ContentRiskLLM,
} from '@/lib/content-risk/analyze';
import type { WireSpan } from '@/lib/content-risk/schema';

describe('severity — vendored RA FME aggregator', () => {
  it('factual_claim contributes zero', () => {
    expect(severityWeight('factual_claim')).toBe(0);
  });

  it('unknown technique defaults to 0.5', () => {
    expect(severityWeight('not_a_real_technique')).toBe(0.5);
  });

  it('manipulationRiskScore matches RA density formula', () => {
    // 1 span sev 0.9 over 100 words → (0.9/100)*10000 = 90
    const score = manipulationRiskScore([{ technique: 'appeal_to_fear' }], 100);
    expect(score).toBeCloseTo((0.9 / 100) * DENSITY_SCALE, 5);
    expect(score).toBeCloseTo(90, 5);
  });

  it('clips to 100 and excludes factual_claim', () => {
    const spans = [
      { technique: 'appeal_to_fear' }, // 0.9
      { technique: 'false_dilemma' }, // 0.85
      { technique: 'factual_claim' }, // 0 (excluded)
    ];
    expect(manipulationRiskScore(spans, 10)).toBe(100); // (1.75/10)*10000 clipped
  });

  it('zero words → 0 (no divide-by-zero)', () => {
    expect(manipulationRiskScore([{ technique: 'doubt' }], 0)).toBe(0);
  });

  it('severity_table_hash is stable', () => {
    expect(severityTableHash()).toBe(severityTableHash());
    expect(severityTableHash()).toMatch(/^[a-f0-9]{40}$/);
  });
});

describe('shortTextRiskScore — RA-187 recalibration', () => {
  it('empty → 0', () => {
    expect(shortTextRiskScore([])).toBe(0);
  });

  it('grades a single strong fear span into medium (not binary 1.0)', () => {
    const s = shortTextRiskScore([{ technique: 'appeal_to_fear', confidence: 0.9 }]);
    expect(s).toBeGreaterThan(0.4);
    expect(s).toBeLessThan(0.7); // graded, not saturated
  });

  it('is monotonic — more/stronger spans → higher score', () => {
    const one = shortTextRiskScore([{ technique: 'appeal_to_fear', confidence: 0.9 }]);
    const three = shortTextRiskScore([
      { technique: 'appeal_to_fear', confidence: 0.9 },
      { technique: 'false_dilemma', confidence: 0.8 },
      { technique: 'name_calling', confidence: 0.8 },
    ]);
    expect(three).toBeGreaterThan(one);
    expect(three).toBeLessThan(1); // never reaches exactly 1.0
  });

  it('ignores factual_claim', () => {
    expect(shortTextRiskScore([{ technique: 'factual_claim', confidence: 1 }])).toBe(0);
  });

  it('a weak single span stays low', () => {
    expect(shortTextRiskScore([{ technique: 'repetition', confidence: 0.5 }])).toBeLessThan(0.3);
  });
});

describe('contentRiskBand', () => {
  it('bands by 0.3 / 0.6 thresholds', () => {
    expect(contentRiskBand(0.1)).toBe('low');
    expect(contentRiskBand(0.3)).toBe('medium');
    expect(contentRiskBand(0.59)).toBe('medium');
    expect(contentRiskBand(0.6)).toBe('high');
    expect(contentRiskBand(0.95)).toBe('high');
  });
});

describe('wordCount', () => {
  it('counts whitespace-separated tokens', () => {
    expect(wordCount('  hello   world\nfoo ')).toBe(3);
    expect(wordCount('')).toBe(0);
  });
});

describe('anchorSpans — deterministic indexOf anchoring', () => {
  const msg = 'Act now or you will lose everything. This is your last chance.';
  const span = (over: Partial<WireSpan>): WireSpan => ({
    span_id: 's1',
    text: 'lose everything',
    technique: 'appeal_to_fear',
    appeal: 'pathos',
    confidence: 0.8,
    ...over,
  });

  it('anchors an exact substring with correct offsets', () => {
    const [a] = anchorSpans(msg, [span({})]);
    expect(msg.slice(a.char_start, a.char_end)).toBe('lose everything');
  });

  it('drops hallucinated text not in the message', () => {
    expect(anchorSpans(msg, [span({ text: 'nonexistent phrase' })])).toHaveLength(0);
  });

  it('drops confidence < 0.4', () => {
    expect(anchorSpans(msg, [span({ confidence: 0.3 })])).toHaveLength(0);
  });

  it('drops spans shorter than 8 chars', () => {
    expect(anchorSpans(msg, [span({ text: 'Act now' })])).toHaveLength(0);
  });

  it('case-fold fallback anchors when case differs', () => {
    const [a] = anchorSpans(msg, [span({ text: 'LOSE EVERYTHING' })]);
    expect(a.text).toBe('lose everything'); // resolves to the real casing
  });
});

describe('parseWire — tolerant parsing', () => {
  it('strips ```json fences', () => {
    const raw = '```json\n{"spans":[],"fallacies":[],"emotion":{"fear":0.1,"urgency":0.2}}\n```';
    const w = parseWire(raw);
    expect(w.emotion).toEqual({ fear: 0.1, urgency: 0.2 });
  });

  it('drops one malformed span, keeps the valid one', () => {
    const raw = JSON.stringify({
      spans: [
        { span_id: 's1', text: 'lose everything', technique: 'appeal_to_fear', appeal: 'pathos', confidence: 0.8 },
        { span_id: 's2', text: 'bad', technique: 'doubt', appeal: 'pathos', confidence: 5 }, // confidence>1 + text<8
      ],
      fallacies: [],
      emotion: { fear: 0, urgency: 0 },
    });
    expect(parseWire(raw).spans).toHaveLength(1);
  });

  it('returns empty result on garbage', () => {
    const w = parseWire('not json at all');
    expect(w.spans).toEqual([]);
    expect(w.emotion).toEqual({ fear: 0, urgency: 0 });
  });

  it('extracts the JSON block when prose precedes it', () => {
    const raw = 'Here is the analysis: {"spans":[],"fallacies":[],"emotion":{"fear":0,"urgency":0}} done';
    expect(parseWire(raw).spans).toEqual([]);
  });
});

describe('buildRisk — mapping to behavior_event shape', () => {
  const msg = 'Everyone agrees this is the only safe choice, so you must buy now.';
  const wire = {
    spans: [
      { span_id: 's1', text: 'Everyone agrees', technique: 'bandwagon', appeal: 'pathos' as const, confidence: 0.7 },
      { span_id: 's2', text: 'the only safe choice', technique: 'false_dilemma', appeal: 'logos' as const, confidence: 0.8 },
    ],
    fallacies: [{ fallacy_type: 'false_cause', quote: 'so you must buy now' }],
    emotion: { fear: 0.2, urgency: 0.7 },
  };

  it('produces action_type and 0-1 risk_score', () => {
    const r = buildRisk(msg, wire, 'test-model');
    expect(r.action_type).toBe('output_content_risk');
    expect(r.risk_score).toBeGreaterThan(0);
    expect(r.risk_score).toBeLessThanOrEqual(1);
    expect(r.risk_score).toBeCloseTo(r.manipulation_risk / 100, 3);
  });

  it('factors include techniques + fallacy: labels, sorted & unique', () => {
    const r = buildRisk(msg, wire, 'test-model');
    expect(r.factors).toContain('bandwagon');
    expect(r.factors).toContain('false_dilemma');
    expect(r.factors).toContain('fallacy:false_cause');
    expect(r.factors).toEqual([...r.factors].sort());
  });

  it('carries provenance hashes', () => {
    const r = buildRisk(msg, wire, 'test-model');
    expect(r.provenance.severity_table_hash).toMatch(/^[a-f0-9]{40}$/);
    expect(r.provenance.prompt_hash).toMatch(/^[a-f0-9]{40}$/);
    expect(r.provenance.model).toBe('test-model');
    expect(r.provenance.word_count).toBe(wordCount(msg));
  });

  it('benign message scores 0', () => {
    const r = buildRisk('Sure, your certificate was renewed successfully.', {
      spans: [],
      fallacies: [],
      emotion: { fear: 0, urgency: 0 },
    }, 'test-model');
    expect(r.risk_score).toBe(0);
    expect(r.factors).toEqual([]);
  });
});

describe('analyzeAgentOutput — with injected LLM (offline)', () => {
  const fakeLLM = (payload: object): ContentRiskLLM => ({
    async complete() {
      return JSON.stringify(payload);
    },
  });

  it('scores a manipulative message end-to-end', async () => {
    const msg = 'Act now or you will lose everything you own.';
    const r = await analyzeAgentOutput(msg, {
      model: 'test-model',
      llm: fakeLLM({
        spans: [{ span_id: 's1', text: 'lose everything', technique: 'appeal_to_fear', appeal: 'pathos', confidence: 0.9 }],
        fallacies: [],
        emotion: { fear: 0.8, urgency: 0.9 },
      }),
    });
    expect(r.techniques).toHaveLength(1);
    expect(r.factors).toEqual(['appeal_to_fear']);
    expect(r.risk_score).toBeGreaterThan(0);
    expect(r.emotion.urgency).toBe(0.9);
  });

  it('short-circuits empty message without calling the LLM', async () => {
    let called = false;
    const r = await analyzeAgentOutput('   ', {
      model: 'test-model',
      llm: { async complete() { called = true; return '{}'; } },
    });
    expect(called).toBe(false);
    expect(r.risk_score).toBe(0);
  });
});
