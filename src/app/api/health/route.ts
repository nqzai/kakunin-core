import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/health
 *
 * Uptime check endpoint monitored by Better Stack.
 * Verifies DB connectivity — not just process liveness.
 * Returns 200 + latency on success, 503 on DB failure.
 */
export async function GET() {
  const start = Date.now();

  try {
    const supabase = createServiceClient();
    // Lightweight query — just checks DB round-trip
    const { error } = await supabase.from('tenants').select('id').limit(1);

    if (error) {
      return NextResponse.json(
        { status: 'degraded', error: 'DB query failed' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      status: 'ok',
      db: 'connected',
      latency_ms: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { status: 'error', error: 'Health check failed' },
      { status: 503 }
    );
  }
}
