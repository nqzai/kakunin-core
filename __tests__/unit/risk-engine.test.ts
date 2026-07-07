import { describe, it, expect } from 'vitest';
import { scoreEvent } from '@/lib/monitoring/risk-engine';

// Base lookup — action type → score / band, no scope context.
const SCORE_TABLE = [
  ['api_call',                    0.05, 'low'   ],
  ['authentication_attempt',      0.15, 'low'   ],
  ['authentication_failure',      0.55, 'medium'],
  ['data_access',                 0.20, 'low'   ],
  ['data_mutation',               0.35, 'medium'],
  ['transaction_initiated',       0.30, 'medium'],
  ['transaction_anomaly',         0.85, 'high'  ],
  ['unauthorized_access_attempt', 0.95, 'high'  ],
  ['message_signed',              0.05, 'low'   ],
  ['message_verification_failed', 0.95, 'high'  ],
  ['kill_switch_activated',       1.00, 'high'  ],
] as const;

describe('scoreEvent — base lookup', () => {
  it.each(SCORE_TABLE)(
    'scores %s → score=%s band=%s with no factors',
    (actionType, expectedScore, expectedBand) => {
      const { score, band, factors } = scoreEvent({ actionType });
      expect(score).toBe(expectedScore);
      expect(band).toBe(expectedBand);
      expect(factors).toEqual([]);
    }
  );

  it('returns 0.10 / low / no factors for unknown action type', () => {
    const { score, band, factors } = scoreEvent({ actionType: 'totally_unknown_action' });
    expect(score).toBe(0.10);
    expect(band).toBe('low');
    expect(factors).toEqual([]);
  });
});

describe('scoreEvent — band boundaries', () => {
  it('score 0.85 → high (not medium)', () => {
    expect(scoreEvent({ actionType: 'transaction_anomaly' }).band).toBe('high');
  });
  it('score 0.30 → medium (not low)', () => {
    expect(scoreEvent({ actionType: 'transaction_initiated' }).band).toBe('medium');
  });
  it('score < 0.30 → low', () => {
    expect(scoreEvent({ actionType: 'api_call' }).band).toBe('low');
  });
});

describe('scoreEvent — financial scope floor', () => {
  const scope = { max_single_trade_usd: 1000, permitted_venues: ['NYSE', 'NASDAQ'] };

  it('trade over max_single_trade_usd floors to 0.95 / high with scope_violation factor', () => {
    const { score, band, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: 5000, venue: 'NYSE' },
      financialScope: scope,
    });
    expect(score).toBe(0.95);
    expect(band).toBe('high');
    expect(factors).toEqual(['scope_violation']);
  });

  it('trade on a non-permitted venue floors to 0.95 / high', () => {
    const { score, band, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: 500, venue: 'BINANCE' },
      financialScope: scope,
    });
    expect(score).toBe(0.95);
    expect(band).toBe('high');
    expect(factors).toEqual(['scope_violation']);
  });

  it('trade within scope keeps the base score and no factors', () => {
    const { score, band, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: 500, venue: 'NYSE' },
      financialScope: scope,
    });
    expect(score).toBe(0.30);
    expect(band).toBe('medium');
    expect(factors).toEqual([]);
  });

  it('no financial scope defined → base score, no crash', () => {
    const { score, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: 999999, venue: 'BINANCE' },
    });
    expect(score).toBe(0.30);
    expect(factors).toEqual([]);
  });

  it('scope only applies to transaction_initiated, not other actions', () => {
    const { score, factors } = scoreEvent({
      actionType: 'api_call',
      details: { amount_usd: 999999, venue: 'BINANCE' },
      financialScope: scope,
    });
    expect(score).toBe(0.05);
    expect(factors).toEqual([]);
  });
});

describe('scoreEvent — untrusted details are type-guarded', () => {
  const scope = { max_single_trade_usd: 1000, permitted_venues: ['NYSE'] };

  it('amount_usd as a string does not trigger a violation', () => {
    const { score, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: '999999', venue: 'NYSE' },
      financialScope: scope,
    });
    expect(score).toBe(0.30);
    expect(factors).toEqual([]);
  });

  it('venue null / missing does not trigger a venue violation', () => {
    const { score, factors } = scoreEvent({
      actionType: 'transaction_initiated',
      details: { amount_usd: 500, venue: null },
      financialScope: scope,
    });
    expect(score).toBe(0.30);
    expect(factors).toEqual([]);
  });

  it('empty details object is safe', () => {
    const { score } = scoreEvent({
      actionType: 'transaction_initiated',
      details: {},
      financialScope: scope,
    });
    expect(score).toBe(0.30);
  });
});
