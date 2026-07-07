import { NextRequest, NextResponse } from 'next/server';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { log } from '@/lib/logging';

/**
 * Internal: IndexNow API dispatcher
 *
 * Called by QStash when a blog post publishes.
 * Notifies Bing IndexNow API to index the new URL.
 */

interface IndexNowPayload {
  urls: string[];
  title?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const verified = await requireVerifiedQStashBody(req);
    if (!verified.ok) return verified.response;

    const payload: IndexNowPayload = JSON.parse(verified.body);
    const { urls } = payload;

    if (!urls || urls.length === 0) {
      return NextResponse.json({ error: 'Missing urls' }, { status: 400 });
    }

    const indexnowKey = process.env.INDEXNOW_API_KEY;
    if (!indexnowKey) {
      log.error('[indexnow] INDEXNOW_API_KEY not configured');
      return NextResponse.json(
        { error: 'IndexNow key not configured' },
        { status: 500 }
      );
    }

    // POST to IndexNow API
    const indexnowResponse = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: new URL(urls[0]).hostname,
        key: indexnowKey,
        // Standard IndexNow key file path: /{key}.txt at root
        keyLocation: `https://${new URL(urls[0]).hostname}/${indexnowKey}.txt`,
        urlList: urls,
      }),
    });

    if (!indexnowResponse.ok) {
      const errorBody = await indexnowResponse.text();
      log.error('[indexnow] Bing IndexNow API error', { status: indexnowResponse.status, body: errorBody });
      return NextResponse.json(
        { error: `IndexNow API error: ${indexnowResponse.status}` },
        { status: 500 }
      );
    }

    log.info('[indexnow] Successfully notified Bing for URLs', { urls, count: urls.length });

    return NextResponse.json(
      {
        success: true,
        indexed: urls,
        message: 'URLs submitted to Bing IndexNow',
      },
      { status: 200 }
    );
  } catch (error) {
    log.error('[indexnow] Error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
