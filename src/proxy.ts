import { type NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { trackRouteTiming } from '@/lib/observability/route-timing';
import { resolveApiKeyAuth } from '@/lib/gateway/api-key-auth';

/**
 * Routing proxy — runs on /api/v1/* and /dashboard/* requests.
 *
 * Responsibilities:
 * 1. /dashboard/* — attach lightweight request metadata for server seams
 * 2. /api/v1/*    — validate API key → attach tenant_id to x-tenant-id header
 * 3. /api/v1/*    — Upstash Redis rate-limit: per-IP (pre-auth) + per-key
 *
 * Rate limits fire BEFORE the DB key lookup — enforced here, not in route
 * handlers. The per-IP limiter caps unauthenticated key-guessing so invalid
 * Bearer tokens cannot drive unlimited DB lookups.
 *
 * Fails closed: outside local development, missing Upstash config rejects
 * API traffic (503) rather than silently skipping rate limiting.
 */

// Lazy-initialized — only created if env vars are present
let redis: Redis | null = null;
let keyRatelimit: Ratelimit | null = null;
let ipRatelimit: Ratelimit | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

function getKeyRatelimit(): Ratelimit | null {
  if (keyRatelimit) return keyRatelimit;
  const r = getRedis();
  if (!r) return null;
  keyRatelimit = new Ratelimit({
    redis: r,
    // 100 requests per 10 seconds per API key — generous for autonomous agents
    limiter: Ratelimit.slidingWindow(100, '10 s'),
    prefix: 'kakunin:rl',
    analytics: true,
  });
  return keyRatelimit;
}

function getIpRatelimit(): Ratelimit | null {
  if (ipRatelimit) return ipRatelimit;
  const r = getRedis();
  if (!r) return null;
  ipRatelimit = new Ratelimit({
    redis: r,
    // Pre-auth cap per source IP. Each invalid key would otherwise get its
    // own per-key bucket, allowing unlimited DB lookups via random tokens.
    limiter: Ratelimit.slidingWindow(300, '60 s'),
    prefix: 'kakunin:rl:ip',
    analytics: true,
  });
  return ipRatelimit;
}

function rateLimitedResponse(limit: number, remaining: number, reset: number): NextResponse {
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Limit': String(limit),
        'X-RateLimit-Remaining': String(remaining),
        'X-RateLimit-Reset': String(reset),
        'Retry-After': String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))),
      },
    }
  );
}

/**
 * Headers the proxy itself is authoritative for. Stripped from every inbound
 * request (all branches) so clients can never smuggle tenant/staging context
 * to a route handler.
 */
const PROXY_OWNED_HEADERS = ['x-tenant-id', 'x-is-staging'] as const;

function sanitizedHeaders(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  for (const h of PROXY_OWNED_HEADERS) headers.delete(h);
  return headers;
}

export async function proxy(request: NextRequest) {
  const startedAt = Date.now();
  const { pathname } = request.nextUrl;
  function finalize(response: NextResponse, status: 'ok' | 'redirect' | 'client_error' | 'server_error', branch: string) {
    trackRouteTiming({
      route: 'proxy',
      status,
      durationMs: Date.now() - startedAt,
      slowThresholdMs: 120,
      sampleRate: 0.02,
      context: { branch, pathname },
    });
    return response;
  }

  // Strip proxy-owned headers on every branch — clients must never be able
  // to inject x-tenant-id / x-is-staging into downstream route handlers.
  const requestHeaders = sanitizedHeaders(request);

  // ── Dashboard metadata — server components perform the authoritative auth
  // and tenant resolution path so we don't duplicate auth.getUser() in proxy.
  if (pathname.startsWith('/dashboard')) {
    requestHeaders.set('x-kakunin-pathname', pathname);
    return finalize(NextResponse.next({
      request: { headers: requestHeaders },
    }), 'ok', 'dashboard_metadata');
  }

  if (!pathname.startsWith('/api/v1/')) {
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 'ok', 'pass_through');
  }

  // Public endpoints — no auth, no rate limit
  // /v1/verify/* — cert and chain verification (public by design)
  // /v1/ca       — CA certificate PEM for trust chain building
  // /v1/ca/chain — full CA chain PEM for independent verification
  // /v1/crl      — Certificate Revocation List (public X.509 artifact)
  // /v1/crl/generate — QStash worker (validates QStash signature internally)
  if (
    pathname.startsWith('/api/v1/verify/') ||
    pathname === '/api/v1/ca' ||
    pathname === '/api/v1/ca/chain' ||
    pathname === '/api/v1/crl' ||
    pathname === '/api/v1/crl/generate' ||
    // OpenAPI spec is public — used by dev tooling, Postman, the developer dashboard
    pathname === '/api/v1/openapi.json'
  ) {
    return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 'ok', 'api_public');
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return finalize(
      NextResponse.json({ error: 'Missing or invalid Authorization header' }, { status: 401 }),
      'client_error',
      'api_missing_auth'
    );
  }

  const apiKey = authHeader.slice(7);

  // Rate limit checks — MUST fire before DB query per CLAUDE.md rule #4.
  // Fail closed: missing Upstash config outside local dev rejects the request
  // instead of silently running without rate limiting (mirrors QStash policy).
  const keyRl = getKeyRatelimit();
  const ipRl = getIpRatelimit();
  if (!keyRl || !ipRl) {
    if (process.env.NODE_ENV !== 'development') {
      console.error('[proxy] Upstash rate-limit config missing outside local dev — rejecting request');
      return finalize(
        NextResponse.json({ error: 'Service temporarily unavailable' }, { status: 503 }),
        'server_error',
        'api_ratelimit_unconfigured'
      );
    }
  } else {
    // Per-IP pre-auth limit — caps key brute-forcing / DB-probe DoS, since
    // every distinct invalid key would otherwise get its own per-key bucket.
    const ip =
      request.headers.get('x-real-ip') ??
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';
    const ipResult = await ipRl.limit(ip);
    if (!ipResult.success) {
      return finalize(
        rateLimitedResponse(ipResult.limit, ipResult.remaining, ipResult.reset),
        'client_error',
        'api_rate_limited_ip'
      );
    }

    const keyResult = await keyRl.limit(apiKey);
    if (!keyResult.success) {
      return finalize(
        rateLimitedResponse(keyResult.limit, keyResult.remaining, keyResult.reset),
        'client_error',
        'api_rate_limited'
      );
    }
  }

  // Validate API key + resolve tenant/environment (shared with MCP + sandbox routes)
  const auth = await resolveApiKeyAuth(apiKey, request.headers.get('host'));

  if (!auth.ok) {
    if (auth.reason === 'sandbox_key_on_live_host') {
      return finalize(
        NextResponse.json({ error: 'Sandbox API key is not valid on this host' }, { status: 401 }),
        'client_error',
        'api_sandbox_key_on_live'
      );
    }
    return finalize(
      NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 }),
      'client_error',
      'api_invalid_key'
    );
  }
  const context = auth.context;

  requestHeaders.set('x-tenant-id', context.tenantId);
  if (context.isStaging) {
    requestHeaders.set('x-is-staging', 'true');
  }

  return finalize(NextResponse.next({ request: { headers: requestHeaders } }), 'ok', 'api_authenticated');
}

export const config = {
  matcher: ['/api/v1/:path*', '/dashboard/:path*'],
};
