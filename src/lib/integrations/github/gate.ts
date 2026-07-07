/**
 * GitHub Actions cert-gate decision logic (P2b — RA-183).
 *
 * Pure, deterministic risk → gate decision. A CI workflow asks "is this agent
 * safe to deploy?"; we answer from its recent behavioral risk using honest
 * bands (V2_BLUEPRINT §P2):
 *
 *   score  < 0.75            → pass            (deploy proceeds)
 *   0.75 ≤ score < 0.85      → action_required (warn; deploy proceeds, flagged)
 *   score ≥ 0.85             → fail            (block deploy + revoke cert)
 *
 * The gate score is the PEAK risk_score over the window — a single high-risk
 * event must be able to block a deploy (conservative by design).
 */

export type GateDecision = 'pass' | 'action_required' | 'fail';

export const GATE_ACTION_REQUIRED_AT = 0.75;
export const GATE_FAIL_AT = 0.85;

export interface GateResult {
  decision: GateDecision;
  score: number;
  band: 'low' | 'medium' | 'high';
  events_considered: number;
  /** True when the decision requires revoking the agent's certificate. */
  should_revoke: boolean;
}

/** Decide the gate outcome from recent events' risk scores. */
export function evaluateGate(riskScores: number[]): GateResult {
  const score = riskScores.length ? Math.max(...riskScores) : 0;
  const rounded = Math.round(score * 1000) / 1000;

  let decision: GateDecision;
  let band: GateResult['band'];
  if (score >= GATE_FAIL_AT) {
    decision = 'fail';
    band = 'high';
  } else if (score >= GATE_ACTION_REQUIRED_AT) {
    decision = 'action_required';
    band = 'medium';
  } else {
    decision = 'pass';
    band = 'low';
  }

  return {
    decision,
    score: rounded,
    band,
    events_considered: riskScores.length,
    should_revoke: decision === 'fail',
  };
}
