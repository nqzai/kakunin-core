import { Redis } from '@upstash/redis';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';

export interface ApiKeyTenantContext {
  tenantId: string;
  isStaging: boolean;
  environment: 'live' | 'sandbox';
}

const STAGING_HOSTNAME = 'staging.kakunin.ai';

/**
 * Exact-hostname check — the Host header is attacker-controlled, so a
 * substring/prefix match (e.g. `host.startsWith('staging.')`) is bypassable
 * with hosts like "staging.evil.com". Parse out the hostname (dropping any
 * port) and compare against the exact allowed staging host or its
 * subdomains.
 */
export function isStagingHost(hostHeader?: string | null): boolean {
  if (!hostHeader) return false;
  let hostname: string;
  try {
    hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
  } catch {
    return false;
  }
  return hostname === STAGING_HOSTNAME || hostname.endsWith(`.${STAGING_HOSTNAME}`);
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type ApiKeyAuthResult =
  | { ok: true; context: ApiKeyTenantContext }
  | { ok: false; reason: 'invalid_key' | 'sandbox_key_on_live_host' };

// ── Redis key-lookup cache ────────────────────────────────────────────────────
// Caches keyHash → { tenantId, environment } to cut one DB roundtrip per
// authenticated request. Positive entries only (invalid keys are already
// per-IP rate limited in the proxy). Revocation calls invalidateApiKeyCache
// so keys still die at write time — the TTL is only a safety net.

const AUTH_CACHE_TTL_SECONDS = 60;
const AUTH_CACHE_PREFIX = 'kakunin:auth:';

interface CachedKeyRecord {
  tenantId: string;
  environment: 'live' | 'sandbox';
}

let redis: Redis | null = null;
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

async function readKeyCache(keyHash: string): Promise<CachedKeyRecord | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    const hit = await r.get<CachedKeyRecord>(`${AUTH_CACHE_PREFIX}${keyHash}`);
    if (hit && typeof hit.tenantId === 'string' && (hit.environment === 'live' || hit.environment === 'sandbox')) {
      return hit;
    }
    return null;
  } catch (err) {
    // Cache failure must never block auth — fall through to DB
    log.warn('[api-key-auth] cache read failed', { error: (err as Error).message });
    return null;
  }
}

function writeKeyCache(keyHash: string, record: CachedKeyRecord): void {
  const r = getRedis();
  if (!r) return;
  void r
    .set(`${AUTH_CACHE_PREFIX}${keyHash}`, record, { ex: AUTH_CACHE_TTL_SECONDS })
    .catch((err: unknown) => {
      log.warn('[api-key-auth] cache write failed', { error: (err as Error).message });
    });
}

/**
 * Evict a key from the auth cache. MUST be called by any code path that
 * revokes or rotates an API key so revocation takes effect immediately
 * instead of after the cache TTL.
 */
export async function invalidateApiKeyCache(keyHash: string): Promise<void> {
  const r = getRedis();
  if (!r) return;
  try {
    await r.del(`${AUTH_CACHE_PREFIX}${keyHash}`);
  } catch (err) {
    log.error('[api-key-auth] cache invalidation failed — revoked key may live up to TTL', {
      error: (err as Error).message,
    });
  }
}

/**
 * Validate an API key and resolve its tenant/environment context.
 *
 * Returns a discriminated result so callers can distinguish an invalid or
 * revoked key from a valid sandbox key presented against the live host —
 * the latter deserves an actionable error message for SDK users.
 */
export async function resolveApiKeyAuth(
  apiKey: string,
  hostHeader?: string | null,
): Promise<ApiKeyAuthResult> {
  if (!apiKey) {
    return { ok: false, reason: 'invalid_key' };
  }

  const keyHash = await hashApiKey(apiKey);
  const isStaging = isStagingHost(hostHeader);

  // isStaging is host-dependent, so only the host-independent record is
  // cached; the sandbox/live host check runs on every request.
  let record = await readKeyCache(keyHash);

  if (!record) {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('api_keys')
      .select('tenant_id, revoked_at, environment, key_prefix')
      .eq('key_hash', keyHash)
      .single();

    if (error || !data || data.revoked_at) {
      return { ok: false, reason: 'invalid_key' };
    }

    // Legacy keys created before the environment column existed have it as
    // null — derive from key_prefix (kak_test_* vs kak_live_*) rather than
    // defaulting to 'live', which would fail open for legacy sandbox keys.
    const environment: 'live' | 'sandbox' =
      data.environment === 'sandbox' || data.environment === 'live'
        ? data.environment
        : data.key_prefix?.startsWith('kak_test_')
          ? 'sandbox'
          : 'live';

    record = { tenantId: data.tenant_id, environment };
    writeKeyCache(keyHash, record);
  }

  // Sandbox keys are scoped to staging — reject if presented against a live host
  if (record.environment === 'sandbox' && !isStaging) {
    return { ok: false, reason: 'sandbox_key_on_live_host' };
  }

  return {
    ok: true,
    context: {
      tenantId: record.tenantId,
      isStaging,
      environment: record.environment,
    },
  };
}

export async function resolveApiKeyTenantContext(
  apiKey: string,
  hostHeader?: string | null,
): Promise<ApiKeyTenantContext | null> {
  const result = await resolveApiKeyAuth(apiKey, hostHeader);
  return result.ok ? result.context : null;
}
