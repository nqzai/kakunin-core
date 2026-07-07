import { describe, it, expect } from 'vitest';
import { isValidBearerSecret } from '@/lib/security/bearer-auth';

describe('isValidBearerSecret', () => {
  const SECRET = 'super-secret-cron-token';

  it('accepts a correct Bearer secret', () => {
    expect(isValidBearerSecret(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it('rejects a wrong secret', () => {
    expect(isValidBearerSecret('Bearer wrong', SECRET)).toBe(false);
  });

  it('fails closed when the expected secret is undefined', () => {
    expect(isValidBearerSecret('Bearer undefined', undefined)).toBe(false);
    expect(isValidBearerSecret('Bearer ', undefined)).toBe(false);
    expect(isValidBearerSecret(`Bearer ${SECRET}`, undefined)).toBe(false);
  });

  it('fails closed when the expected secret is empty', () => {
    expect(isValidBearerSecret('Bearer ', '')).toBe(false);
  });

  it('rejects a missing or malformed Authorization header', () => {
    expect(isValidBearerSecret(null, SECRET)).toBe(false);
    expect(isValidBearerSecret(undefined, SECRET)).toBe(false);
    expect(isValidBearerSecret(SECRET, SECRET)).toBe(false); // no "Bearer " prefix
    expect(isValidBearerSecret(`bearer ${SECRET}`, SECRET)).toBe(false); // case-sensitive scheme
  });

  it('rejects when presented token is a prefix of the secret (length mismatch)', () => {
    expect(isValidBearerSecret(`Bearer ${SECRET.slice(0, -1)}`, SECRET)).toBe(false);
  });
});
