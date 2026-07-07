import { type NextRequest, NextResponse } from 'next/server';
import { getCurrentCrl } from '@/lib/certificates/crl';

/**
 * GET /v1/crl
 *
 * Public endpoint — no auth required (CRL is a standard public artifact).
 * Returns the current CA-signed CRL in DER or PEM format.
 *
 * Cached at CDN layer for 1 hour. Clients should check nextUpdate header.
 */
export async function GET(req: NextRequest) {
  const crl = await getCurrentCrl();

  if (!crl) {
    return NextResponse.json(
      { error: 'CRL not yet generated. Run the /v1/crl/generate job first.' },
      { status: 503 }
    );
  }

  const acceptHeader = req.headers.get('accept') ?? '';
  const derBuffer = Buffer.from(crl.derHex, 'hex');

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    'Last-Modified': new Date(crl.generatedAt).toUTCString(),
    'Expires': new Date(crl.nextUpdateAt).toUTCString(),
    'X-CRL-Generated-At': crl.generatedAt,
    'X-CRL-Next-Update': crl.nextUpdateAt,
  };

  if (acceptHeader.includes('application/pkix-crl') || acceptHeader.includes('application/x-pkcs7-crl')) {
    return new NextResponse(derBuffer, {
      status: 200,
      headers: {
        ...cacheHeaders,
        'Content-Type': 'application/pkix-crl',
        'Content-Disposition': 'attachment; filename="kakunin-agents.crl"',
      },
    });
  }

  // Default: PEM-encoded for human-readable access
  const pem =
    '-----BEGIN X509 CRL-----\n' +
    derBuffer.toString('base64').replace(/.{64}/g, '$&\n') +
    '\n-----END X509 CRL-----\n';

  return new NextResponse(pem, {
    status: 200,
    headers: {
      ...cacheHeaders,
      'Content-Type': 'application/x-pem-file',
      'Content-Disposition': 'inline; filename="kakunin-agents.crl.pem"',
    },
  });
}
