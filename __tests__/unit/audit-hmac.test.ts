import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { computeEntryHash, verifyEntryHash, type AuditRowFields } from '@/lib/audit/hmac';

// 32-byte hex key (64 hex chars)
const TEST_KEY = 'f'.repeat(64);

const baseRow: AuditRowFields = {
  id: '00000000-0000-0000-0000-000000000001',
  tenant_id: 'tenant-abc',
  event_type: 'certificate.issued',
  actor_type: 'system',
  actor_id: 'kakunin',
  description: 'Issued certificate for agent X',
  affected_id: 'agent-123',
  metadata: { serial: 'ABC123' },
  created_at: '2026-06-01T12:00:00Z',
};

describe('audit/hmac', () => {
  let savedKey: string | undefined;

  beforeAll(() => {
    savedKey = process.env.AUDIT_SIGNING_KEY;
    process.env.AUDIT_SIGNING_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (savedKey !== undefined) {
      process.env.AUDIT_SIGNING_KEY = savedKey;
    } else {
      delete process.env.AUDIT_SIGNING_KEY;
    }
  });

  it('computes a 64-char hex HMAC', () => {
    const hash = computeEntryHash(baseRow);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('is deterministic for the same row', () => {
    expect(computeEntryHash(baseRow)).toBe(computeEntryHash(baseRow));
  });

  it('changes when any field changes', () => {
    const original = computeEntryHash(baseRow);
    const altered = computeEntryHash({ ...baseRow, description: 'Different' });
    expect(original).not.toBe(altered);
  });

  it('handles null tenant_id (system events)', () => {
    const row = { ...baseRow, tenant_id: null };
    const hash = computeEntryHash(row);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toBe(computeEntryHash(baseRow));
  });

  it('handles null affected_id', () => {
    const row = { ...baseRow, affected_id: null };
    const hash = computeEntryHash(row);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('handles null/undefined metadata', () => {
    const withNull = computeEntryHash({ ...baseRow, metadata: null });
    const withUndefined = computeEntryHash({ ...baseRow, metadata: undefined });
    expect(withNull).toMatch(/^[a-f0-9]{64}$/);
    expect(withUndefined).toMatch(/^[a-f0-9]{64}$/);
  });

  it('sorts metadata keys for deterministic hashing', () => {
    const a = computeEntryHash({ ...baseRow, metadata: { z: 1, a: 2 } });
    const b = computeEntryHash({ ...baseRow, metadata: { a: 2, z: 1 } });
    expect(a).toBe(b);
  });

  it('returns null when key is unconfigured (graceful degradation)', () => {
    const saved = process.env.AUDIT_SIGNING_KEY;
    delete process.env.AUDIT_SIGNING_KEY;
    expect(computeEntryHash(baseRow)).toBeNull();
    process.env.AUDIT_SIGNING_KEY = saved;
  });

  describe('verifyEntryHash', () => {
    it('returns valid for a correctly signed row', () => {
      const hash = computeEntryHash(baseRow)!;
      expect(verifyEntryHash({ ...baseRow, entry_hash: hash })).toBe('valid');
    });

    it('returns invalid for tampered data', () => {
      const hash = computeEntryHash(baseRow)!;
      const tampered = { ...baseRow, description: 'tampered', entry_hash: hash };
      expect(verifyEntryHash(tampered)).toBe('invalid');
    });

    it('returns unsigned when entry_hash is null', () => {
      expect(verifyEntryHash({ ...baseRow, entry_hash: null })).toBe('unsigned');
    });

    it('returns unsigned when entry_hash is undefined', () => {
      expect(verifyEntryHash({ ...baseRow })).toBe('unsigned');
    });

    it('returns unsigned when key is missing', () => {
      const saved = process.env.AUDIT_SIGNING_KEY;
      delete process.env.AUDIT_SIGNING_KEY;
      expect(verifyEntryHash({ ...baseRow, entry_hash: 'a'.repeat(64) })).toBe('unsigned');
      process.env.AUDIT_SIGNING_KEY = saved;
    });

    it('returns invalid for wrong-length hash', () => {
      expect(verifyEntryHash({ ...baseRow, entry_hash: 'abc' })).toBe('invalid');
    });
  });
});
