/**
 * Risk Engine
 *
 * Scores a single behavioral event for an AI agent. This is the PER-EVENT,
 * zero-history scorer: it owns only acute signals derivable from the event
 * itself (base action severity + financial-scope violations). Historical
 * signals (baseline deviation, frequency/velocity, drift) belong to the
 * Behavioral Drift Engine (drift-engine.ts), computed nightly and surfaced via
 * GET /agents/:id/risk. See docs/RISK_ENGINE_DESIGN.md for the split rationale.
 *
 * Pure function — no DB I/O. The caller passes in the event + the agent's
 * financial scope; the engine never queries.
 *
 * Risk bands (per compliance spec §3.2):
 *   high   — score ≥ 0.85 → triggers auto-revocation check
 *   medium — score ≥ 0.30
 *   low    — score < 0.30
 */

export type ActionType =
  | 'api_call'
  | 'authentication_attempt'
  | 'authentication_failure'
  | 'data_access'
  | 'data_mutation'
  | 'transaction_initiated'
  | 'transaction_anomaly'
  | 'unauthorized_access_attempt'
  | 'message_signed'
  | 'message_verification_failed'
  | 'kill_switch_activated';

export type RiskBand = 'low' | 'medium' | 'high';

/** Certified financial limits from `agents.metadata.financial_scope`. */
export interface FinancialScope {
  max_single_trade_usd?: number;
  permitted_venues?: string[];
}

export interface ScoreInput {
  actionType: string;
  /** Agent-supplied event detail — UNTRUSTED. Type-guarded before any read. */
  details?: Record<string, unknown>;
  financialScope?: FinancialScope;
}

export interface RiskScore {
  score: number;
  band: RiskBand;
  /** Machine-readable reasons the score was elevated (e.g. 'scope_violation'). */
  factors: string[];
}

// Base risk scores per action type — calibrated against MiCA Art. 72 risk criteria
const RISK_TABLE: Record<ActionType, number> = {
  api_call:                     0.05,
  authentication_attempt:       0.15,
  authentication_failure:       0.55,
  data_access:                  0.20,
  data_mutation:                0.35,
  transaction_initiated:        0.30,
  transaction_anomaly:          0.85,
  unauthorized_access_attempt:  0.95,
  message_signed:               0.05,
  // Failed verification = potential spoofing attempt — same band as unauthorized access
  message_verification_failed:  0.95,
  kill_switch_activated:        1.00,
};

const DEFAULT_SCORE = 0.10; // Unknown action types default to low-risk

// A trade outside its certified scope floors to this score (high band).
// Matches the score formerly borrowed from `unauthorized_access_attempt` —
// fixed, not graduated-by-severity (see RA-165 for the deferred gradient).
const SCOPE_VIOLATION_FLOOR = 0.95;

/**
 * Score a single behavioral event.
 *
 * @param input - Action type, untrusted event details, and the agent's financial scope
 * @returns Risk score (0–1), band classification, and the factors that elevated it
 */
export function scoreEvent(input: ScoreInput): RiskScore {
  const { actionType, details, financialScope } = input;
  const base = RISK_TABLE[actionType as ActionType] ?? DEFAULT_SCORE;

  const factors: string[] = [];
  let score = base;

  // Financial-scope enforcement: a trade beyond its certified limits floors to
  // high. Only transactions can violate scope; other actions skip this.
  if (
    actionType === 'transaction_initiated' &&
    financialScope &&
    details &&
    isScopeViolation(details, financialScope)
  ) {
    score = Math.max(score, SCOPE_VIOLATION_FLOOR);
    factors.push('scope_violation');
  }

  return { score, band: getBand(score), factors };
}

/**
 * Detect whether a transaction breaches the agent's certified financial scope.
 * `details` is untrusted agent input — every field is type-guarded before use.
 */
function isScopeViolation(
  details: Record<string, unknown>,
  scope: FinancialScope,
): boolean {
  const amountUsd = typeof details['amount_usd'] === 'number' ? details['amount_usd'] : null;
  const venue = typeof details['venue'] === 'string' ? details['venue'] : null;

  if (
    amountUsd !== null &&
    typeof scope.max_single_trade_usd === 'number' &&
    amountUsd > scope.max_single_trade_usd
  ) {
    return true;
  }

  if (venue !== null && scope.permitted_venues && !scope.permitted_venues.includes(venue)) {
    return true;
  }

  return false;
}

function getBand(score: number): RiskBand {
  // 0.85 threshold — auto-revocation level per compliance spec (Section 3.2)
  if (score >= 0.85) return 'high';
  if (score >= 0.30) return 'medium';
  return 'low';
}
