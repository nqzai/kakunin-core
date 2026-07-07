/**
 * GET /v1/ca — public CA certificate endpoint.
 *
 * Returns the Kakunin CA certificate PEM. No auth required.
 * Used by:
 *   - Regulators and verifiers to build the agent cert trust chain
 *   - @kakunin/sdk/verify middleware to verify agent cert signatures locally
 *   - X.509 clients following the AIA extension in agent certs
 *
 * Cached aggressively — CA cert rotates at most once per year.
 * Accept: application/x-pem-file returns PEM; default returns JSON.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getCaCertPem } from '@/lib/certificates/ca';

export async function GET(req: NextRequest) {
  let caCertPem: string;
  try {
    caCertPem = getCaCertPem();
  } catch {
    return NextResponse.json(
      { error: 'CA certificate not yet provisioned. Contact support@kakunin.ai.' },
      { status: 503 }
    );
  }

  const accept = req.headers.get('accept') ?? '';
  const wantsPem = accept.includes('application/x-pem-file') || accept.includes('text/plain');

  const response = wantsPem
    ? new NextResponse(caCertPem, {
        headers: {
          'Content-Type': 'application/x-pem-file',
          'Content-Disposition': 'inline; filename="kakunin-ca.pem"',
        },
      })
    : NextResponse.json({
        data: {
          subject: 'CN=Kakunin AI Agent CA,O=Kakunin,C=EU',
          pem: caCertPem,
          usage: 'Verifies all Kakunin-issued AI agent X.509 certificates',
          download_url: 'https://api.kakunin.ai/v1/ca',
        },
      });

  // CA cert rotates at most annually — cache 24 h, stale-while-revalidate 7 days
  response.headers.set('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  return response;
}
