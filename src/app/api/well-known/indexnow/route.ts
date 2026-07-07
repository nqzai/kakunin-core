import { NextRequest, NextResponse } from 'next/server';

/**
 * IndexNow API key endpoint
 * Required by Bing IndexNow to verify domain ownership
 * Returns plain text API key — public endpoint, no auth needed
 *
 * @see https://www.bing.com/indexnow/getstarted
 */
export async function GET(_: NextRequest): Promise<NextResponse> {
  const apiKey = process.env.INDEXNOW_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'IndexNow API key not configured' },
      { status: 500 }
    );
  }

  // Return plain text (Bing expects Content-Type: text/plain)
  return new NextResponse(apiKey, {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}
