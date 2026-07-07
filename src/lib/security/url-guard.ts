/**
 * SSRF guard for outbound requests to user/tenant-supplied URLs.
 *
 * Any worker that POSTs to a URL a tenant controls (webhook delivery today,
 * the v2 OTLP exporter tomorrow — see docs/V2_BLUEPRINT.md §4) MUST run the
 * target through {@link assertSafeUrl} before calling fetch. Without it a
 * tenant can point a webhook at internal/cloud-metadata endpoints
 * (e.g. http://169.254.169.254/latest/meta-data/) and the worker will issue
 * that request from inside the cloud network.
 *
 * The guard:
 *  - requires an https scheme (no http, file, gopher, ftp, …)
 *  - resolves the hostname (DNS) and rejects if ANY resolved address falls in
 *    a private / loopback / link-local / reserved range — closes DNS-rebinding
 *    and "domain that resolves to 169.254.169.254" tricks
 *  - rejects literal private IP hosts directly (no DNS round-trip needed)
 *
 * Throws {@link UnsafeUrlError} on rejection so callers can distinguish a
 * blocked-target failure from a transport error.
 */

import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeUrlError';
  }
}

/**
 * Optional allowlist for stricter posture. When provided, the URL's hostname
 * must exactly match an entry or be a subdomain of one. Empty/undefined means
 * "any public host is allowed" (still subject to the private-range checks).
 */
export interface AssertSafeUrlOptions {
  allowedHosts?: readonly string[];
  /** Allow plain http — only for tests/local. Never set in production paths. */
  allowHttp?: boolean;
}

/**
 * Parse an IPv4 dotted-quad into its 32-bit unsigned integer, or null if it
 * isn't a well-formed IPv4 literal.
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    value = value * 256 + octet;
  }
  return value >>> 0;
}

/** True if an IPv4 address sits in a private / reserved / non-routable range. */
function isPrivateIpv4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as unsafe
  const inRange = (base: string, prefix: number) => {
    const baseInt = ipv4ToInt(base)!;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return (n & mask) === (baseInt & mask);
  };
  return (
    inRange('0.0.0.0', 8) || // "this" network
    inRange('10.0.0.0', 8) || // private
    inRange('100.64.0.0', 10) || // carrier-grade NAT
    inRange('127.0.0.0', 8) || // loopback
    inRange('169.254.0.0', 16) || // link-local incl. cloud metadata
    inRange('172.16.0.0', 12) || // private
    inRange('192.0.0.0', 24) || // IETF protocol assignments
    inRange('192.168.0.0', 16) || // private
    inRange('198.18.0.0', 15) || // benchmarking
    inRange('224.0.0.0', 4) || // multicast
    inRange('240.0.0.0', 4) // reserved / broadcast
  );
}

/** True if an IPv6 address sits in a private / reserved / non-routable range. */
function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase().split('%')[0]; // strip zone id

  // IPv4-mapped / IPv4-compatible (::ffff:a.b.c.d or ::a.b.c.d) → check embedded v4
  const mapped = addr.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
  if (mapped) return isPrivateIpv4(mapped[1]);

  if (addr === '::1' || addr === '::') return true; // loopback / unspecified

  const firstHextet = addr.split(':')[0];
  const high = parseInt(firstHextet || '0', 16);
  if (Number.isNaN(high)) return true;

  // fc00::/7 unique-local
  if ((high & 0xfe00) === 0xfc00) return true;
  // fe80::/10 link-local
  if ((high & 0xffc0) === 0xfe80) return true;
  // ff00::/8 multicast
  if ((high & 0xff00) === 0xff00) return true;

  return false;
}

/** True if the literal IP string is in any blocked range. */
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateIpv4(ip);
  if (kind === 6) return isPrivateIpv6(ip);
  return true; // not a valid IP → unsafe
}

function hostMatchesAllowlist(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase();
  return allowed.some((entry) => {
    const a = entry.toLowerCase();
    return host === a || host.endsWith(`.${a}`);
  });
}

/**
 * Assert that `url` is safe to issue an outbound request to. Rejects non-https
 * schemes, hosts that resolve to private/loopback/link-local/reserved IPs, and
 * (when `allowedHosts` is set) any host outside the allowlist.
 *
 * @throws {UnsafeUrlError} when the URL is malformed or targets a blocked host.
 */
export async function assertSafeUrl(
  url: string,
  options: AssertSafeUrlOptions = {},
): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new UnsafeUrlError('URL is malformed');
  }

  const allowedSchemes = options.allowHttp ? ['https:', 'http:'] : ['https:'];
  if (!allowedSchemes.includes(parsed.protocol)) {
    throw new UnsafeUrlError(`Scheme "${parsed.protocol}" not allowed (https required)`);
  }

  // Reject embedded credentials (user:pass@host) — used to obscure real host.
  if (parsed.username || parsed.password) {
    throw new UnsafeUrlError('URL must not contain credentials');
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, ''); // strip IPv6 brackets

  if (options.allowedHosts?.length && !hostMatchesAllowlist(hostname, options.allowedHosts)) {
    throw new UnsafeUrlError(`Host "${hostname}" is not in the allowlist`);
  }

  // Literal IP host → check directly, no DNS needed.
  if (isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw new UnsafeUrlError(`Host "${hostname}" resolves to a blocked IP range`);
    }
    return;
  }

  // Hostname → resolve every address and reject if ANY is private (DNS rebinding).
  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new UnsafeUrlError(`Host "${hostname}" could not be resolved`);
  }

  if (addresses.length === 0) {
    throw new UnsafeUrlError(`Host "${hostname}" resolved to no addresses`);
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new UnsafeUrlError(`Host "${hostname}" resolves to a blocked IP (${address})`);
    }
  }
}
