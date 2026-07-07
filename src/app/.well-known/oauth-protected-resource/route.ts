import { NextResponse } from 'next/server';

// OAuth Protected Resource Metadata — RFC 9728
// Tells agents which authorization servers can issue tokens for Kakunin's protected APIs,
// and what scopes are available. Agents use this to obtain the right access tokens.
//
// RFC 9728 §3: The response Content-Type MUST be
//   application/oauth-protected-resource+json
// Using plain application/json causes scanners (e.g. isitagentready.com) to fail the check.
export const dynamic = 'force-static';

const BASE = 'https://kakunin.ai';

export function GET() {
  const protectedResourceMetadata = {
    resource: `${BASE}/api/v1`,
    authorization_servers: [BASE],
    scopes_supported: [
      'agent:verify',
      'agent:certificates:read',
      'agent:certificates:issue',
      'agent:audit:read',
      'agent:risk:read',
    ],
    bearer_methods_supported: ['header'],
    resource_documentation: `${BASE}/docs/api`,
    resource_signing_alg_values_supported: ['RS256', 'ES256'],
  };

  return new NextResponse(JSON.stringify(protectedResourceMetadata, null, 2), {
    status: 200,
    headers: {
      // RFC 9728 §3 — required media type
      'Content-Type': 'application/oauth-protected-resource+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
