import { randomBytes } from 'crypto';
import { Redis } from '@upstash/redis';

/**
 * Holds an exchanged Vercel OAuth result until the tenant explicitly confirms
 * the install on our own confirmation page. The OAuth callback is a bare GET
 * triggered by Vercel's redirect — it can be replayed cross-site with an
 * attacker's own `code`, so it must never perform the key-creation/env-inject
 * side effect directly. Confirmation requires a same-origin POST with a fresh
 * session, which a forged cross-site GET cannot produce.
 */
export interface PendingVercelInstall {
  tenantId: string;
  userId: string;
  accessToken: string;
  installationId: string;
  teamId: string | null;
  configurationId: string | null;
  next: string;
}

const TTL_SECONDS = 10 * 60;
const PREFIX = 'kakunin:vercel-pending:';

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    // In-memory fallback is per-instance and not safe for production —
    // a token stored on one Vercel function instance won't be visible to
    // the instance that handles the confirm request. Only acceptable
    // locally where there's a single dev server process.
    if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
      throw new Error('UPSTASH_REDIS_REST_URL/TOKEN must be set in production for Vercel install confirmation');
    }
    return null;
  }
  redis = new Redis({ url, token });
  return redis;
}

// Dev-only fallback when Upstash isn't configured locally — not multi-instance safe.
const memoryStore = new Map<string, { value: PendingVercelInstall; expiresAt: number }>();

export async function storePendingVercelInstall(payload: PendingVercelInstall): Promise<string> {
  const token = randomBytes(32).toString('hex');
  const r = getRedis();
  if (r) {
    await r.set(`${PREFIX}${token}`, JSON.stringify(payload), { ex: TTL_SECONDS });
  } else {
    memoryStore.set(token, { value: payload, expiresAt: Date.now() + TTL_SECONDS * 1000 });
  }
  return token;
}

export async function consumePendingVercelInstall(token: string): Promise<PendingVercelInstall | null> {
  const r = getRedis();
  if (r) {
    // GETDEL is atomic — avoids a GET+DEL race that could let two concurrent
    // confirms both read the value before either delete fires.
    const raw = await r.getdel<string>(`${PREFIX}${token}`);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) as PendingVercelInstall : raw as PendingVercelInstall;
  }

  const entry = memoryStore.get(token);
  memoryStore.delete(token);
  if (!entry || entry.expiresAt < Date.now()) return null;
  return entry.value;
}
