/**
 * GET /v1/ca/chain — full CA certificate chain for independent verification.
 *
 * Returns PEM-concatenated chain: intermediate CA cert (if configured) + root CA cert.
 * Verifiers should configure their TLS/X.509 trust store with all certs in this chain.
 *
 * When no intermediate CA is configured, returns only the root CA cert (same as /v1/ca).
 *
 * Cached aggressively — CA chain rotates at most once per year.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCaChainPem, getIntermediateCaPem } from '@/lib/certificates/ca';

export async function GET(req: NextRequest) {
  let chainPem: string;
  try {
    chainPem = getCaChainPem();
  } catch {
    return NextResponse.json(
      { error: 'CA certificate not yet provisioned. Contact support@kakunin.ai.' },
      { status: 503 }
    );
  }

  const hasIntermediate = getIntermediateCaPem() !== null;
  const accept = req.headers.get('accept') ?? '';
  const wantsPem = accept.includes('application/x-pem-file') || accept.includes('text/plain');

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  };

  if (wantsPem) {
    return new NextResponse(chainPem, {
      headers: {
        'Content-Type': 'application/x-pem-file',
        'Content-Disposition': 'inline; filename="kakunin-ca-chain.pem"',
        ...cacheHeaders,
      },
    });
  }

  return NextResponse.json(
    {
      data: {
        chain_pem: chainPem,
        depth: hasIntermediate ? 2 : 1,
        description: hasIntermediate
          ? 'Root CA + Intermediate CA. Agent certificates are signed by the Intermediate CA.'
          : 'Root CA only. Agent certificates are signed directly by the Root CA.',
        usage: 'Configure your X.509 trust store with all certificates in chain_pem to verify Kakunin agent certificates without calling the API.',
        chain_url: 'https://api.kakunin.ai/v1/ca/chain',
        root_url: 'https://api.kakunin.ai/v1/ca',
      },
    },
    { headers: cacheHeaders }
  );
}
