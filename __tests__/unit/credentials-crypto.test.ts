import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptCredentials, decryptCredentials } from '@/lib/credentials/crypto';

// 32-byte key, base64-encoded (generated via crypto.randomBytes(32))
const TEST_KEY = 'Pk3kxCX2LOt1pRSLQc9U3vgHsAlWlW980hdkDJBQuqM=';

describe('credentials/crypto', () => {
  let savedKey: string | undefined;

  beforeAll(() => {
    savedKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = TEST_KEY;
  });

  afterAll(() => {
    if (savedKey !== undefined) {
      process.env.CREDENTIAL_ENCRYPTION_KEY = savedKey;
    } else {
      delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    }
  });

  it('round-trips encrypt → decrypt', () => {
    const creds = { slack_token: 'xoxb-fake', channel: '#alerts' };
    const enc = encryptCredentials(creds);
    const dec = decryptCredentials(enc);
    expect(dec).toEqual(creds);
  });

  it('produces iv:tag:ct format', () => {
    const enc = encryptCredentials({ key: 'value' });
    const parts = enc.split(':');
    expect(parts).toHaveLength(3);
    // IV = 12 bytes hex = 24 chars
    expect(parts[0]).toMatch(/^[a-f0-9]{24}$/);
    // Auth tag = 16 bytes hex = 32 chars
    expect(parts[1]).toMatch(/^[a-f0-9]{32}$/);
    // Ciphertext is non-empty hex
    expect(parts[2]).toMatch(/^[a-f0-9]+$/);
  });

  it('generates unique IVs per call (no IV reuse)', () => {
    const creds = { token: 'same' };
    const a = encryptCredentials(creds);
    const b = encryptCredentials(creds);
    expect(a.split(':')[0]).not.toBe(b.split(':')[0]);
  });

  it('throws on invalid format (wrong number of parts)', () => {
    expect(() => decryptCredentials('deadbeef')).toThrow('Invalid encrypted credentials format');
  });

  it('throws on tampered ciphertext (GCM auth failure)', () => {
    const enc = encryptCredentials({ secret: 'real' });
    const parts = enc.split(':');
    // Flip a byte in the ciphertext
    const tampered = parts[2].replace(/^./, parts[2][0] === 'a' ? 'b' : 'a');
    expect(() => decryptCredentials(`${parts[0]}:${parts[1]}:${tampered}`)).toThrow();
  });

  it('throws when CREDENTIAL_ENCRYPTION_KEY is missing', () => {
    const saved = process.env.CREDENTIAL_ENCRYPTION_KEY;
    delete process.env.CREDENTIAL_ENCRYPTION_KEY;
    expect(() => encryptCredentials({ a: 1 })).toThrow('CREDENTIAL_ENCRYPTION_KEY not configured');
    expect(() => decryptCredentials('aa:bb:cc')).toThrow('CREDENTIAL_ENCRYPTION_KEY not configured');
    process.env.CREDENTIAL_ENCRYPTION_KEY = saved;
  });

  it('throws when CREDENTIAL_ENCRYPTION_KEY is wrong length', () => {
    const saved = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
    expect(() => encryptCredentials({ a: 1 })).toThrow('must be 32 bytes');
    process.env.CREDENTIAL_ENCRYPTION_KEY = saved;
  });

  it('handles nested objects and arrays', () => {
    const creds = { nested: { arr: [1, 2, 3], deep: { key: 'val' } } };
    const dec = decryptCredentials(encryptCredentials(creds));
    expect(dec).toEqual(creds);
  });
});
