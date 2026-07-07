import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ipLimiter: Ratelimit | null = null;
let emailLimiter: Ratelimit | null = null;

function getRedisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  return { url, token };
}

function getIpLimiter(): Ratelimit | null {
  if (ipLimiter) return ipLimiter;
  const config = getRedisConfig();
  if (!config) return null;

  ipLimiter = new Ratelimit({
    redis: new Redis(config),
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    prefix: 'kakunin:assessment:ip',
    analytics: true,
  });

  return ipLimiter;
}

function getEmailLimiter(): Ratelimit | null {
  if (emailLimiter) return emailLimiter;
  const config = getRedisConfig();
  if (!config) return null;

  emailLimiter = new Ratelimit({
    redis: new Redis(config),
    limiter: Ratelimit.slidingWindow(3, '1 d'),
    prefix: 'kakunin:assessment:email',
    analytics: true,
  });

  return emailLimiter;
}

export interface AssessmentRateLimitInput {
  ip: string;
  email: string;
}

export interface AssessmentRateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: 'ip' | 'email';
}

export async function checkAssessmentRateLimits(
  input: AssessmentRateLimitInput,
): Promise<AssessmentRateLimitResult> {
  const ip = input.ip.trim();
  const email = input.email.trim().toLowerCase();
  const limiterByIp = getIpLimiter();
  const limiterByEmail = getEmailLimiter();

  if (!limiterByIp || !limiterByEmail) {
    return { allowed: true };
  }

  const [ipResult, emailResult] = await Promise.all([
    limiterByIp.limit(`ip:${ip}`),
    limiterByEmail.limit(`email:${email}`),
  ]);

  if (!ipResult.success) {
    return {
      allowed: false,
      reason: 'ip',
      retryAfterSeconds: Math.max(1, Math.ceil((ipResult.reset - Date.now()) / 1000)),
    };
  }

  if (!emailResult.success) {
    return {
      allowed: false,
      reason: 'email',
      retryAfterSeconds: Math.max(1, Math.ceil((emailResult.reset - Date.now()) / 1000)),
    };
  }

  return { allowed: true };
}
