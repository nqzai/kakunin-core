import { describe, it, expect, vi } from 'vitest';
import { assertSafeUrl, isPrivateIp, UnsafeUrlError } from '@/lib/security/url-guard';

// Stub DNS so tests are deterministic and offline. Each hostname maps to the
// address(es) we want lookup() to "resolve" to.
const dnsTable: Record<string, string[]> = {
  'evil.example.com': ['169.254.169.254'], // rebinding → cloud metadata
  'rebind.example.com': ['1.2.3.4', '10.0.0.5'], // one public, one private
  'public.example.com': ['93.184.216.34'], // public only
  'hooks.slack.com': ['52.85.0.1'],
};

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (hostname: string) => {
    const addrs = dnsTable[hostname];
    if (!addrs) {
      const err = new Error('ENOTFOUND') as NodeJS.ErrnoException;
      err.code = 'ENOTFOUND';
      throw err;
    }
    return addrs.map((address) => ({ address, family: address.includes(':') ? 6 : 4 }));
  }),
}));

describe('isPrivateIp', () => {
  it.each([
    ['10.0.0.1', true],
    ['172.16.5.4', true],
    ['172.31.255.255', true],
    ['192.168.1.1', true],
    ['127.0.0.1', true],
    ['169.254.169.254', true], // cloud metadata
    ['0.0.0.0', true],
    ['100.64.0.1', true], // CGNAT
    ['::1', true],
    ['fc00::1', true],
    ['fe80::1', true],
    ['::ffff:10.0.0.1', true], // IPv4-mapped private
    ['8.8.8.8', false],
    ['93.184.216.34', false],
    ['2606:2800:220:1::1', false],
    ['not-an-ip', true], // non-IP → unsafe
  ])('isPrivateIp(%s) === %s', (ip, expected) => {
    expect(isPrivateIp(ip)).toBe(expected);
  });
});

describe('assertSafeUrl', () => {
  it('rejects non-https schemes', async () => {
    await expect(assertSafeUrl('http://public.example.com/hook')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    await expect(assertSafeUrl('file:///etc/passwd')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects literal loopback / link-local IP hosts', async () => {
    await expect(assertSafeUrl('https://127.0.0.1/hook')).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(assertSafeUrl('https://169.254.169.254/latest/meta-data/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
    await expect(assertSafeUrl('https://[::1]/hook')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects a hostname that resolves to a link-local metadata IP', async () => {
    await expect(assertSafeUrl('https://evil.example.com/hook')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('rejects when ANY resolved address is private (DNS rebinding)', async () => {
    await expect(assertSafeUrl('https://rebind.example.com/hook')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('rejects URLs with embedded credentials', async () => {
    await expect(assertSafeUrl('https://user:pass@public.example.com/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('rejects malformed URLs', async () => {
    await expect(assertSafeUrl('not a url')).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it('rejects unresolvable hosts', async () => {
    await expect(assertSafeUrl('https://nonexistent.invalid/')).rejects.toBeInstanceOf(
      UnsafeUrlError,
    );
  });

  it('allows a valid public https vendor URL', async () => {
    await expect(assertSafeUrl('https://public.example.com/webhook')).resolves.toBeUndefined();
  });

  it('enforces an allowlist when provided', async () => {
    await expect(
      assertSafeUrl('https://hooks.slack.com/services/x', { allowedHosts: ['slack.com'] }),
    ).resolves.toBeUndefined();
    await expect(
      assertSafeUrl('https://public.example.com/', { allowedHosts: ['slack.com'] }),
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
