/**
 * Behavioral Drift Engine
 *
 * Detects slow model corruption or behavioral drift by comparing an agent's
 * current 7-day event distribution against its established baseline.
 *
 * Algorithm: chi-squared approximation on action_type distribution +
 * frequency deviation check (events/hour vs baseline avg).
 *
 * RCM C-B1: Model Versioning & Feature Integrity (target maturity L4)
 * EU AI Act post-market monitoring obligations.
 */

export type DriftBand = 'stable' | 'moderate' | 'significant';

export interface BaselineData {
  action_type_distribution: Record<string, number>;  // fraction of total
  avg_events_per_hour: number;
  p50_risk_score: number;
  p95_risk_score: number;
}

export interface DriftResult {
  drift_score: number;  // 0.0–1.0
  drift_band: DriftBand;
  contributing_factors: string[];
}

// drift_score >= 0.6 → significant (fires webhook)
// drift_score >= 0.3 → moderate
const THRESHOLDS = { significant: 0.6, moderate: 0.3 };

/**
 * Compute a drift score comparing current distribution against a baseline.
 *
 * @param baseline - The stored baseline distribution for this agent
 * @param currentDistribution - Action type distribution over the last 7 days (fractions summing to 1)
 * @param currentEventsPerHour - Average events/hour over the last 7 days
 * @param currentP95RiskScore - p95 risk score over the last 7 days
 */
export function computeDrift(
  baseline: BaselineData,
  currentDistribution: Record<string, number>,
  currentEventsPerHour: number,
  currentP95RiskScore: number,
): DriftResult {
  const contributingFactors: string[] = [];

  // 1. Action type distribution drift (chi-squared approximation)
  const allKeys = new Set([
    ...Object.keys(baseline.action_type_distribution),
    ...Object.keys(currentDistribution),
  ]);

  let chiSquaredSum = 0;
  for (const key of allKeys) {
    const expected = baseline.action_type_distribution[key] ?? 0;
    const observed = currentDistribution[key] ?? 0;
    if (expected > 0) {
      chiSquaredSum += Math.pow(observed - expected, 2) / expected;
    } else if (observed > 0) {
      // New action type not in baseline — treat as moderate anomaly
      chiSquaredSum += observed;
    }
  }

  // Normalize chi-squared to 0–1 range (capped at 4 which maps to significant drift)
  const distributionScore = Math.min(chiSquaredSum / 4, 1.0);
  if (distributionScore >= THRESHOLDS.moderate) {
    contributingFactors.push('action_type_distribution_shifted');
  }

  // 2. Event frequency drift — flag if current rate > 2σ from baseline
  const frequencyRatio = baseline.avg_events_per_hour > 0
    ? currentEventsPerHour / baseline.avg_events_per_hour
    : 1;
  const frequencyScore = frequencyRatio > 3 ? 1.0 : frequencyRatio > 2 ? 0.5 : 0;
  if (frequencyScore >= 0.5) {
    contributingFactors.push('event_frequency_elevated');
  }

  // 3. Risk score elevation drift — p95 significantly higher than baseline
  const riskDelta = currentP95RiskScore - baseline.p95_risk_score;
  const riskScore = riskDelta > 0.3 ? 1.0 : riskDelta > 0.1 ? 0.5 : 0;
  if (riskScore >= 0.5) {
    contributingFactors.push('risk_score_elevated');
  }

  // Weighted composite: distribution drift is the strongest signal
  const driftScore = Math.min(
    distributionScore * 0.6 + frequencyScore * 0.25 + riskScore * 0.15,
    1.0
  );

  const drift_band: DriftBand =
    driftScore >= THRESHOLDS.significant ? 'significant'
    : driftScore >= THRESHOLDS.moderate ? 'moderate'
    : 'stable';

  return {
    drift_score: Math.round(driftScore * 1000) / 1000,
    drift_band,
    contributing_factors: contributingFactors,
  };
}

/**
 * Compute baseline statistics from a set of behavioral events.
 */
export function computeBaseline(events: Array<{
  action_type: string;
  risk_score: number;
  occurred_at: string;
}>): BaselineData & { events_analyzed: number; avg_risk_by_action_type: Record<string, number> } {
  if (events.length === 0) {
    return {
      action_type_distribution: {},
      avg_events_per_hour: 0,
      p50_risk_score: 0,
      p95_risk_score: 0,
      events_analyzed: 0,
      avg_risk_by_action_type: {},
    };
  }

  const total = events.length;

  // Action type distribution (fractions)
  const typeCounts: Record<string, number> = {};
  const typeScores: Record<string, number[]> = {};
  for (const e of events) {
    typeCounts[e.action_type] = (typeCounts[e.action_type] ?? 0) + 1;
    if (!typeScores[e.action_type]) typeScores[e.action_type] = [];
    typeScores[e.action_type].push(e.risk_score);
  }

  const action_type_distribution: Record<string, number> = {};
  const avg_risk_by_action_type: Record<string, number> = {};
  for (const [type, count] of Object.entries(typeCounts)) {
    action_type_distribution[type] = Math.round((count / total) * 10000) / 10000;
    const scores = typeScores[type] ?? [];
    avg_risk_by_action_type[type] = Math.round(
      (scores.reduce((s, x) => s + x, 0) / scores.length) * 1000
    ) / 1000;
  }

  // Events per hour over the baseline window
  const timestamps = events.map((e) => new Date(e.occurred_at).getTime());
  const windowMs = Math.max(...timestamps) - Math.min(...timestamps);
  const windowHours = windowMs > 0 ? windowMs / (1000 * 60 * 60) : 1;
  const avg_events_per_hour = Math.round((total / windowHours) * 100) / 100;

  // Percentile risk scores
  const sorted = [...events].map((e) => e.risk_score).sort((a, b) => a - b);
  const p50Index = Math.floor(sorted.length * 0.5);
  const p95Index = Math.floor(sorted.length * 0.95);

  return {
    action_type_distribution,
    avg_events_per_hour,
    p50_risk_score: sorted[p50Index] ?? 0,
    p95_risk_score: sorted[p95Index] ?? 0,
    events_analyzed: total,
    avg_risk_by_action_type,
  };
}
