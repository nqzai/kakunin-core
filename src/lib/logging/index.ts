/**
 * Better Stack Logger
 *
 * Structured JSON logs → Better Stack HTTP ingest API.
 * Uses Vercel waitUntil() so the fetch completes after the response is sent.
 * Falls back to console when BETTER_STACK_SOURCE_TOKEN is unset.
 *
 * Setup:
 *   1. Better Stack → Telemetry → Sources → Connect source → JavaScript
 *   2. doppler secrets set BETTER_STACK_SOURCE_TOKEN=<token> --project kakunin-project --config prd
 *   3. doppler secrets set BETTER_STACK_SOURCE_TOKEN=<token> --project kakunin-project --config stg
 */

import { waitUntil } from '@vercel/functions';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function toContext(payload: unknown): Record<string, unknown> {
  if (payload === undefined || payload === null) return {};
  if (payload instanceof Error) return { error: payload.message, stack: payload.stack };
  if (typeof payload === 'string') return { detail: payload };
  if (typeof payload === 'object') return payload as Record<string, unknown>;
  return { value: String(payload) };
}

// Scrub secret-bearing keys before logs leave the process (RA-155).
// Matches common credential key names at any depth; values become [REDACTED].
const SENSITIVE_KEY_RE =
  /(secret|token|password|passwd|credential|authorization|api[_-]?key|bot[_-]?token|routing[_-]?key|private[_-]?key|access[_-]?key|auth[_-]?token)/i;

function redact(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY_RE.test(k) ? '[REDACTED]' : redact(v, depth + 1);
  }
  return out;
}

function send(level: LogLevel, message: string, context?: unknown): void {
  const token = process.env.BETTER_STACK_SOURCE_TOKEN;
  const ctx = redact(toContext(context)) as Record<string, unknown>;

  if (!token) {
    const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    fn(`[${level.toUpperCase()}]`, message, Object.keys(ctx).length ? ctx : '');
    return;
  }

  // waitUntil keeps the Vercel function alive until the fetch resolves,
  // even after the HTTP response has been sent to the client.
  waitUntil(
    fetch('https://in.logs.betterstack.com', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dt: new Date().toISOString(),
        level,
        message,
        ...ctx,
      }),
    }).catch(() => {
      // Fallback to console when Better Stack ingest is unreachable — ensures
      // log data is captured in Vercel function logs even if the primary drain fails.
      const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
      fn(`[${level.toUpperCase()}]`, message, Object.keys(ctx).length ? ctx : '');
    }),
  );
}

export const log = {
  debug: (message: string, context?: unknown) => send('debug', message, context),
  info:  (message: string, context?: unknown) => send('info',  message, context),
  warn:  (message: string, context?: unknown) => send('warn',  message, context),
  error: (message: string, context?: unknown) => send('error', message, context),
};
