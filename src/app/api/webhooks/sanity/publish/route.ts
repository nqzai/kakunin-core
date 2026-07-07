import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { log } from '@/lib/logging';

/**
 * Sanity webhook: Blog publish events
 *
 * Receives POST when a blog post is published in Sanity.
 * Dispatches IndexNow indexing request to QStash.
 */

interface SanityWebhookPayload {
  _type: string;
  _id: string;
  title?: string;
  slug?: {
    current: string;
  };
  publishedAt?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Parse payload (Sanity webhook event)
    const payload: SanityWebhookPayload = await req.json();

    // Only process blog posts
    if (payload._type !== 'blogPost') {
      return NextResponse.json({ skipped: 'not a blogPost' }, { status: 200 });
    }

    // Skip drafts — transaction webhooks fire on draft saves too;
    // only submit published documents (id without the "drafts." prefix) to IndexNow
    if (payload._id.startsWith('drafts.')) {
      return NextResponse.json({ skipped: 'draft document' }, { status: 200 });
    }

    // Extract slug
    const slug = payload.slug?.current;
    if (!slug) {
      log.warn('[sanity-publish] Blog post missing slug', { id: payload._id });
      return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
    }

    // Build full blog URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.kakunin.ai';
    const blogUrl = `${baseUrl}/blog/${slug}`;

    log.info('[sanity-publish] Publishing blog post', { url: blogUrl });

    // Dispatch to QStash → /api/internal/indexnow
    const qstash = new Client({ token: process.env.QSTASH_TOKEN });
    const indexnowUrl = `${baseUrl}/api/internal/indexnow`;

    await qstash.publishJSON({
      url: indexnowUrl,
      body: { urls: [blogUrl], title: payload.title },
      retries: 3,
    });

    return NextResponse.json(
      { success: true, url: blogUrl, queued: 'IndexNow dispatch' },
      { status: 200 }
    );
  } catch (error) {
    log.error('[sanity-publish] Error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
