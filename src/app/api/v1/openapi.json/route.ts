import { NextResponse } from 'next/server';
import { generateOpenApiSpec } from '@/lib/openapi/spec';

// Cached at build time in production; regenerated on each request in dev
export const dynamic = 'force-static';

export function GET() {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
