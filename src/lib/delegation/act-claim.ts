/**
 * RFC 8693 actor (`act`) claim — delegation chains (P3a — RA-184).
 *
 * Makes the human→agent→sub-agent authority chain EXPLICIT rather than
 * tenant-implicit. NIST flags this as the gap legacy NHI tools miss
 * (docs/US_REGULATORY_MAPPING.md). Backs the new C-A3 control and the NCCoE
 * non-repudiation pillar.
 *
 * Per RFC 8693 §4.1: the token `sub` is the principal whose authority is being
 * exercised; the `act` claim names the party acting on its behalf, and a chain
 * of delegation is expressed by NESTING act claims. The outermost `act.sub` is
 * the current/most-recent actor; deeper nesting is earlier delegates.
 *
 * Our chain convention (root → current):
 *   [principal(human), delegate1(agent), ..., currentActor(sub_agent)]
 * which serializes to:
 *   { sub: human, act: { sub: sub_agent, act: { sub: agent } } }
 *
 * This module is pure — no crypto, no I/O. The signed token wraps it (token.ts).
 */

export type ActorType = 'human' | 'agent' | 'sub_agent' | 'service';

export interface Actor {
  sub: string;
  type?: ActorType;
}

/** A nested RFC 8693 act claim. */
export interface ActClaim {
  sub: string;
  type?: ActorType;
  act?: ActClaim;
}

export const MAX_DELEGATION_DEPTH = 8;

export class DelegationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DelegationError';
  }
}

/**
 * Build the top-level `{ sub, act }` claims from an ordered chain
 * [principal, ...delegates, currentActor]. Throws on an empty/oversized chain
 * or a blank actor subject.
 */
export function buildActClaim(chain: Actor[]): { sub: string; sub_type?: ActorType; act?: ActClaim } {
  if (chain.length === 0) throw new DelegationError('Delegation chain is empty');
  if (chain.length > MAX_DELEGATION_DEPTH) {
    throw new DelegationError(`Delegation chain exceeds max depth ${MAX_DELEGATION_DEPTH}`);
  }
  for (const a of chain) {
    if (!a.sub || !a.sub.trim()) throw new DelegationError('Every actor needs a non-empty sub');
  }

  const [principal, ...actors] = chain;
  // RFC 8693 `sub` is a bare string and cannot hold a type. Carry the principal's
  // type in a sibling `sub_type` claim so parse() round-trips it losslessly
  // (the root is not always a human — a service account can initiate a chain).
  const subType = principal.type ? { sub_type: principal.type } : {};
  if (actors.length === 0) return { sub: principal.sub, ...subType };

  // Build nesting outermost(current) → innermost(first delegate).
  let node: ActClaim | undefined;
  for (const a of actors) {
    // a from first delegate → current; wrap so the LAST (current) ends outermost.
    node = node ? { sub: a.sub, ...(a.type ? { type: a.type } : {}), act: node } : { sub: a.sub, ...(a.type ? { type: a.type } : {}) };
  }
  return { sub: principal.sub, ...subType, act: node };
}

/**
 * Flatten `{ sub, act }` back to the ordered chain
 * [principal, ...delegates, currentActor].
 */
export function parseActClaim(claim: { sub: string; sub_type?: ActorType; act?: ActClaim }): Actor[] {
  // Restore the principal's type from the sibling `sub_type` claim. Legacy
  // tokens without it default to 'human' (the common chain root).
  const principal: Actor = { sub: claim.sub, type: claim.sub_type ?? 'human' };
  const inner: Actor[] = []; // collected outer→inner = current→first-delegate
  let node = claim.act;
  let depth = 0;
  while (node) {
    if (++depth > MAX_DELEGATION_DEPTH) throw new DelegationError('act claim nesting too deep');
    inner.push({ sub: node.sub, ...(node.type ? { type: node.type } : {}) });
    node = node.act;
  }
  // inner is current→first-delegate; reverse to first-delegate→current.
  return [principal, ...inner.reverse()];
}

/** The actor currently exercising the authority (last in the chain). */
export function currentActor(chain: Actor[]): Actor {
  return chain[chain.length - 1];
}

/** Human-readable "human → agent → sub_agent" rendering. */
export function renderChain(chain: Actor[]): string {
  return chain.map((a) => a.sub).join(' → ');
}
