import { NextResponse } from 'next/server';

// RFC 9727 — API Catalog. Advertises Kakunin public API surface to agents.
// application/linkset+json per RFC 9264 §4.2
export const dynamic = 'force-static';

const BASE = 'https://kakunin.ai';

export function GET() {
  const catalog = {
    linkset: [
      {
        anchor: `${BASE}/api/v1`,
        'service-desc': [
          {
            href: `${BASE}/api/v1/openapi.json`,
            type: 'application/vnd.oai.openapi+json;version=3.0',
          },
        ],
        'service-doc': [
          {
            href: `${BASE}/docs/api`,
            type: 'text/html',
          },
        ],
      },
      {
        // Public verification endpoint — no auth required
        anchor: `${BASE}/api/v1/verify`,
        type: ['{"href":"https://schema.org/EntryPoint"}'],
        'service-doc': [
          {
            href: `${BASE}/docs/api/verify`,
            type: 'text/html',
          },
        ],
      },
    ],
  };

  return new NextResponse(JSON.stringify(catalog, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
