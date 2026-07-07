import { describe, it, expect, beforeAll } from 'vitest';
import {
  computeForensicsProof,
  verifyForensicsProof,
  contentHash,
  type ForensicEvent,
} from '@/lib/forensics/proof';

const events: ForensicEvent[] = [
  { id: 'e1', occurred_at: '2026-05-30T10:00:00Z', action_type: 'api_call', risk_score: 0.05, risk_band: 'low' },
  { id: 'e2', occurred_at: '2026-05-30T10:01:00Z', action_type: 'transaction_anomaly', risk_score: 0.9, risk_band: 'high' },
];
const ctx = { tenantId: 't1', agentId: 'a1' };

describe('forensics proof', () => {
  beforeAll(() => {
    process.env.AUDIT_SIGNING_KEY = 'f'.repeat(64);
  });

  it('content hash is deterministic + order-sensitive', () => {
    expect(contentHash(events)).toBe(contentHash(events));
    expect(contentHash(events)).not.toBe(contentHash([...events].reverse()));
  });

  it('produces a signed proof that verifies', () => {
    const proof = computeForensicsProof(events, ctx);
    expect(proof.algorithm).toBe('HMAC-SHA256');
    expect(proof.event_count).toBe(2);
    expect(proof.signature).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyForensicsProof(events, ctx, proof)).toBe(true);
  });

  it('fails verification if events are altered', () => {
    const proof = computeForensicsProof(events, ctx);
    const tampered = [{ ...events[0], risk_score: 0.99 }, events[1]];
    expect(verifyForensicsProof(tampered, ctx, proof)).toBe(false);
  });

  it('fails verification under a different tenant/agent', () => {
    const proof = computeForensicsProof(events, ctx);
    expect(verifyForensicsProof(events, { tenantId: 't2', agentId: 'a1' }, proof)).toBe(false);
  });

  it('returns null signature when key is unconfigured (no throw)', () => {
    const saved = process.env.AUDIT_SIGNING_KEY;
    delete process.env.AUDIT_SIGNING_KEY;
    const proof = computeForensicsProof(events, ctx);
    expect(proof.signature).toBeNull();
    expect(verifyForensicsProof(events, ctx, proof)).toBe(false);
    process.env.AUDIT_SIGNING_KEY = saved;
  });
});
