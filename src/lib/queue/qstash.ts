/**
 * QStash Client
 *
 * Thin wrapper around @upstash/qstash for fire-and-forget async jobs.
 * All jobs use retries: 3 per CLAUDE.md non-negotiable rule #6.
 *
 * Usage: import { enqueue } from '@/lib/queue/qstash'
 * Never await inline — always fire-and-forget to avoid Vercel 25s timeout.
 */

import { Client } from '@upstash/qstash';
import { getPublicAppUrl } from '@/lib/runtime/public-app-url';

function getQStashClient(): Client {
  if (!process.env.QSTASH_TOKEN) {
    throw new Error('QSTASH_TOKEN not configured');
  }
  return new Client({ token: process.env.QSTASH_TOKEN });
}

export interface EnqueueOptions {
  path: string;
  body: Record<string, unknown>;
  /** Delay in seconds before first delivery attempt */
  delaySeconds?: number;
}

/**
 * Enqueue an internal API route as an async QStash job.
 * Job targets /api/internal/<path> on this app's own URL.
 */
export async function enqueue({ path, body, delaySeconds }: EnqueueOptions): Promise<void> {
  const appUrl = getPublicAppUrl();
  if (!appUrl) {
    throw new Error('NEXT_PUBLIC_APP_URL not configured');
  }

  const client = getQStashClient();
  await client.publishJSON({
    url: `${appUrl}/api/internal/${path}`,
    body,
    retries: 3,
    ...(delaySeconds ? { delay: delaySeconds } : {}),
  });
}
