import { describe, it, expect } from 'vitest';
import {
  evaluateGate,
  GATE_ACTION_REQUIRED_AT,
  GATE_FAIL_AT,
} from '@/lib/integrations/github/gate';

describe('evaluateGate — deploy gate bands', () => {
  it('no events → pass, score 0, no revoke', () => {
    const r = evaluateGate([]);
    expect(r.decision).toBe('pass');
    expect(r.score).toBe(0);
    expect(r.should_revoke).toBe(false);
    expect(r.events_considered).toBe(0);
  });

  it('all low risk → pass', () => {
    const r = evaluateGate([0.1, 0.3, 0.74]);
    expect(r.decision).toBe('pass');
    expect(r.band).toBe('low');
    expect(r.score).toBe(0.74);
  });

  it('peak in [0.75, 0.85) → action_required, no revoke', () => {
    const r = evaluateGate([0.2, 0.8, 0.5]);
    expect(r.decision).toBe('action_required');
    expect(r.band).toBe('medium');
    expect(r.should_revoke).toBe(false);
  });

  it('peak ≥ 0.85 → fail + revoke', () => {
    const r = evaluateGate([0.1, 0.9, 0.4]);
    expect(r.decision).toBe('fail');
    expect(r.band).toBe('high');
    expect(r.should_revoke).toBe(true);
    expect(r.score).toBe(0.9);
  });

  it('uses PEAK risk, not average', () => {
    // average is low but one event is high → must fail
    const r = evaluateGate([0.0, 0.0, 0.0, 0.95]);
    expect(r.decision).toBe('fail');
  });

  it('exact threshold boundaries are inclusive', () => {
    expect(evaluateGate([GATE_ACTION_REQUIRED_AT]).decision).toBe('action_required');
    expect(evaluateGate([GATE_FAIL_AT]).decision).toBe('fail');
    expect(evaluateGate([GATE_ACTION_REQUIRED_AT - 0.001]).decision).toBe('pass');
    expect(evaluateGate([GATE_FAIL_AT - 0.001]).decision).toBe('action_required');
  });

  it('rounds score to 3 decimals', () => {
    expect(evaluateGate([0.123456]).score).toBe(0.123);
  });
});
