import { log } from '@/lib/logging';

interface RouteTimingOptions {
  durationMs: number;
  route: string;
  status: 'ok' | 'redirect' | 'client_error' | 'server_error';
  sampleRate?: number;
  slowThresholdMs?: number;
  context?: Record<string, unknown>;
}

function shouldLog(durationMs: number, slowThresholdMs: number, sampleRate: number): boolean {
  if (durationMs >= slowThresholdMs) return true;
  return Math.random() < sampleRate;
}

export function trackRouteTiming({
  durationMs,
  route,
  status,
  sampleRate = 0.02,
  slowThresholdMs = 250,
  context = {},
}: RouteTimingOptions): void {
  if (!shouldLog(durationMs, slowThresholdMs, sampleRate)) {
    return;
  }

  log.info('[route.timing]', {
    route,
    status,
    duration_ms: durationMs,
    slow: durationMs >= slowThresholdMs,
    ...context,
  });
}
