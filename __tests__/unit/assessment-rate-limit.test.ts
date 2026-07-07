import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkAssessmentRateLimits } from '@/lib/assessment/rate-limit';

describe('assessment/rate-limit', () => {
  let savedUrl: string | undefined;
  let savedToken: string | undefined;

  beforeEach(() => {
    savedUrl = process.env.UPSTASH_REDIS_REST_URL;
    savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  afterEach(() => {
    if (savedUrl !== undefined) {
      process.env.UPSTASH_REDIS_REST_URL = savedUrl;
    } else {
      delete process.env.UPSTASH_REDIS_REST_URL;
    }
    if (savedToken !== undefined) {
      process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
    } else {
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    }
  });

  it('allows all requests when Redis is not configured', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkAssessmentRateLimits({
      ip: '1.2.3.4',
      email: 'test@example.com',
    });

    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(result.retryAfterSeconds).toBeUndefined();
  });

  it('allows when only URL is missing', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    const result = await checkAssessmentRateLimits({
      ip: '5.6.7.8',
      email: 'user@test.com',
    });

    expect(result.allowed).toBe(true);
  });

  it('allows when only token is missing', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkAssessmentRateLimits({
      ip: '10.0.0.1',
      email: 'a@b.com',
    });

    expect(result.allowed).toBe(true);
  });

  it('trims and lowercases email', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const result = await checkAssessmentRateLimits({
      ip: ' 1.2.3.4 ',
      email: '  Test@EXAMPLE.COM  ',
    });

    expect(result.allowed).toBe(true);
  });
});
