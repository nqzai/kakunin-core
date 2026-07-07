/**
 * Email Dispatch
 *
 * Fire-and-forget. Enqueues a send-email job to QStash.
 * QStash delivers to /api/internal/send-email with retries: 3.
 * Never awaited in a response path.
 */
import { waitUntil } from '@vercel/functions';
import { Client as QStashClient } from '@upstash/qstash';
import { log } from '@/lib/logging';
import { getPublicAppUrl } from '@/lib/runtime/public-app-url';
import type { EmailTemplate } from './templates';

function getEmailDispatchConfig(): { qstash: QStashClient; url: string; appUrl: string } | null {
  const token = process.env.QSTASH_TOKEN;
  const appUrl = getPublicAppUrl();

  if (!token || !appUrl) {
    return null;
  }

  return {
    qstash: new QStashClient({ token }),
    url: `${appUrl}/api/internal/send-email`,
    appUrl,
  };
}

export interface DispatchEmailOpts {
  template: EmailTemplate;
  to: string | string[];
  data: Record<string, unknown>;
}

/**
 * Enqueue a transactional email via QStash.
 * Returns immediately — delivery is async with up to 3 retries.
 */
export async function dispatchEmail(opts: DispatchEmailOpts): Promise<void> {
  const { template, to, data } = opts;
  const config = getEmailDispatchConfig();

  if (!config) {
    log.warn('[email.dispatch] QStash email dispatch is not configured', {
      hasQstashToken: Boolean(process.env.QSTASH_TOKEN),
      hasAppUrl: Boolean(getPublicAppUrl()),
      template,
    });
    return;
  }

  const publishTask = config.qstash
    .publishJSON({
      url: config.url,
      body: { template, to, data },
      retries: 3,
    })
    .catch((err: unknown) => {
      // Non-blocking — log and continue. Email failure must never break the main flow.
      log.warn('[email.dispatch] Failed to enqueue email', {
        template,
        to,
        error: (err as Error).message,
      });
    });

  // Keep the serverless function alive long enough for the queue publish to finish
  // even when callers intentionally do not await dispatchEmail().
  waitUntil(publishTask);
  await publishTask;
}
