import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readExportCursor, decryptOutbound } from '@/lib/integrations/connections';
import type { Json } from '@/types/database';

// Provide a valid encryption key for decryptOutbound tests
const TEST_KEY = 'Pk3kxCX2LOt1pRSLQc9U3vgHsAlWlW980hdkDJBQuqM=';

describe('readExportCursor', () => {
  const validUuid = '12345678-abcd-1234-5678-abcdef012345';
  const validTs = '2026-06-01T12:00:00.123456Z';

  it('returns empty object when config is null', () => {
    expect(readExportCursor({ config: null })).toEqual({});
  });

  it('returns empty object when config has no cursor', () => {
    expect(readExportCursor({ config: { foo: 'bar' } })).toEqual({});
  });

  it('returns empty object when cursor is not an object', () => {
    expect(readExportCursor({ config: { cursor: 'string' } })).toEqual({});
    expect(readExportCursor({ config: { cursor: 42 } })).toEqual({});
  });

  it('parses valid events cursor', () => {
    const config: Json = { cursor: { events: { ts: validTs, id: validUuid } } };
    const result = readExportCursor({ config });
    expect(result.events).toEqual({ ts: validTs, id: validUuid });
    expect(result.chains).toBeUndefined();
  });

  it('parses valid chains cursor', () => {
    const config: Json = { cursor: { chains: { ts: '2026-01-01T00:00:00Z', id: validUuid } } };
    const result = readExportCursor({ config });
    expect(result.chains).toEqual({ ts: '2026-01-01T00:00:00Z', id: validUuid });
    expect(result.events).toBeUndefined();
  });

  it('parses both streams', () => {
    const config: Json = {
      cursor: {
        events: { ts: validTs, id: validUuid },
        chains: { ts: '2026-01-01T00:00:00+02:00', id: validUuid },
      },
    };
    const result = readExportCursor({ config });
    expect(result.events).toBeDefined();
    expect(result.chains).toBeDefined();
  });

  it('rejects invalid UUID in cursor', () => {
    const cursor = { events: { ts: validTs, id: 'not-a-uuid' } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });

  it('rejects invalid timestamp in cursor', () => {
    const cursor = { events: { ts: 'not-a-timestamp', id: validUuid } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });

  it('rejects missing fields in cursor', () => {
    expect(readExportCursor({ config: { cursor: { events: { ts: validTs } } } })).toEqual({});
    expect(readExportCursor({ config: { cursor: { events: { id: validUuid } } } })).toEqual({});
  });

  it('rejects non-string ts/id', () => {
    const cursor = { events: { ts: 123, id: validUuid } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });

  it('rejects SQL-injection-like timestamp', () => {
    const cursor = { events: { ts: "2026-01-01'); DROP TABLE events;--", id: validUuid } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });
});

describe('decryptOutbound', () => {
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

  it('returns empty headers and no apiKey when both null', () => {
    const result = decryptOutbound({ headers_enc: null, api_key_enc: null });
    expect(result.headers).toEqual({});
    expect(result.apiKey).toBeUndefined();
  });

  it('decrypts stored headers', async () => {
    const { encryptCredentials } = await import('@/lib/credentials/crypto');
    const headers = { Authorization: 'Bearer tok123', 'X-Custom': 'val' };
    const enc = encryptCredentials(headers);
    const result = decryptOutbound({ headers_enc: enc, api_key_enc: null });
    expect(result.headers).toEqual(headers);
  });

  it('decrypts stored apiKey', async () => {
    const { encryptCredentials } = await import('@/lib/credentials/crypto');
    const enc = encryptCredentials({ apiKey: 'secret-key-123' });
    const result = decryptOutbound({ headers_enc: null, api_key_enc: enc });
    expect(result.apiKey).toBe('secret-key-123');
  });
});
