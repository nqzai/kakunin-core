import { NextResponse } from 'next/server';

// OAuth 2.0 Authorization Server Metadata — RFC 8414
// Publishes how agents can discover our authorization server to authenticate with Kakunin APIs.
// Checked by isitagentready.com for oauthDiscovery compliance.
export const dynamic = 'force-static';

const BASE = 'https://kakunin.ai';

export function GET() {
  const authServerMetadata = {
    issuer: BASE,
    authorization_endpoint: `${BASE}/oauth/authorize`,
    token_endpoint: `${BASE}/api/v1/oauth/token`,
    jwks_uri: `${BASE}/.well-known/jwks.json`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'client_credentials', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    scopes_supported: [
      'agent:verify',
      'agent:certificates:read',
      'agent:certificates:issue',
      'agent:audit:read',
      'agent:risk:read',
    ],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${BASE}/docs/api`,
    ui_locales_supported: ['en'],
  };

  return new NextResponse(JSON.stringify(authServerMetadata, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
