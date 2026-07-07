import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/trust-signals
 *
 * Disabled.
 *
 * The NewsAPI trust-signals cron is no longer scheduled from vercel.json.
 * Keep this handler as a hard stop so any manual or stale invocation returns
 * immediately without hitting NewsAPI or the database.
 */

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'This cron job has been disabled' },
      { status: 410 }
    );
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}
