/**
 * Signed delegation tokens (P3a — RA-184).
 *
 * RFC 8693-style delegation as a stateless, signed JWT (HS256, Node crypto —
 * no new dependency). The token IS the record: it carries the RFC 8693 sub/act
 * delegation chain and is verifiable by signature alone, so no delegations
 * table is needed. Issuance is additionally written to audit_log for the
 * non-repudiation trail.
 *
 * Key: DELEGATION_TOKEN_SECRET, falling back to AUDIT_SIGNING_KEY (both ≥32B,
 * stored in Doppler). The JWT header `typ: kakunin-delegation+jwt` gives domain
 * separation from any other HMAC use of the key.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import { buildActClaim, parseActClaim, type Actor, type ActClaim, type ActorType } from './act-claim';

function getKey(): Buffer {
  const raw = process.env.DELEGATION_TOKEN_SECRET ?? process.env.AUDIT_SIGNING_KEY;
  if (!raw) throw new Error('[delegation] DELEGATION_TOKEN_SECRET / AUDIT_SIGNING_KEY not configured');
  const buf = /^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0 ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'utf8');
  if (buf.length < 32) throw new Error('[delegation] signing key must be at least 32 bytes');
  return buf;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

const HEADER = { alg: 'HS256', typ: 'kakunin-delegation+jwt' } as const;

export interface DelegationClaims {
  sub: string;
  /** Principal's actor type — RFC 8693 `sub` is a bare string, so type rides here. */
  sub_type?: ActorType;
  act?: ActClaim;
  scope?: string;
  aud?: string;
  iss: string;
  iat: number;
  exp: number;
  token_type: 'delegation';
  'kakunin.agent_id': string;
  'kakunin.tenant_id': string;
}

export interface IssueDelegationInput {
  tenantId: string;
  agentId: string;
  /** Ordered chain root→current: [human, agent, ...sub_agent]. */
  chain: Actor[];
  scope?: string;
  audience?: string;
  ttlSeconds?: number;
}

const DEFAULT_TTL = 3600;

/** Issue a signed delegation token. Returns the compact JWT + decoded claims. */
export function issueDelegationToken(input: IssueDelegationInput): { token: string; claims: DelegationClaims } {
  const { sub, sub_type, act } = buildActClaim(input.chain); // validates the chain
  const now = Math.floor(Date.now() / 1000);
  const claims: DelegationClaims = {
    sub,
    ...(sub_type ? { sub_type } : {}),
    ...(act ? { act } : {}),
    ...(input.scope ? { scope: input.scope } : {}),
    ...(input.audience ? { aud: input.audience } : {}),
    iss: 'kakunin',
    iat: now,
    exp: now + (input.ttlSeconds ?? DEFAULT_TTL),
    token_type: 'delegation',
    'kakunin.agent_id': input.agentId,
    'kakunin.tenant_id': input.tenantId,
  };

  const signingInput = `${b64url(JSON.stringify(HEADER))}.${b64url(JSON.stringify(claims))}`;
  const sig = createHmac('sha256', getKey()).update(signingInput).digest('base64url');
  return { token: `${signingInput}.${sig}`, claims };
}

export interface VerifyResult {
  valid: boolean;
  reason?: string;
  claims?: DelegationClaims;
  chain?: Actor[];
}

/** Verify a delegation token's signature + expiry and return the actor chain. */
export function verifyDelegationToken(token: string): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { valid: false, reason: 'malformed' };
  const [h, p, sig] = parts;

  const expected = createHmac('sha256', getKey()).update(`${h}.${p}`).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { valid: false, reason: 'bad_signature' };

  let claims: DelegationClaims;
  try {
    claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as DelegationClaims;
  } catch {
    return { valid: false, reason: 'bad_payload' };
  }

  if (claims.token_type !== 'delegation') return { valid: false, reason: 'wrong_token_type' };
  if (typeof claims.exp === 'number' && claims.exp < Math.floor(Date.now() / 1000)) {
    return { valid: false, reason: 'expired', claims };
  }

  return { valid: true, claims, chain: parseActClaim(claims) };
}
