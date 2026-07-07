/**
 * GET /v1/verify/chain/:id — public chain integrity verification.
 *
 * No auth required. Recomputes the chain hash from the stored event IDs and
 * compares it against the stored chain_hash. Returns verified: true if they match.
 *
 * Regulators use this endpoint to verify that a decision chain was not tampered
 * with after closure — without needing a platform account.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: chain, error: chainError } = await supabase
    .from('decision_chains')
    .select('id, name, status, chain_hash, event_count, created_at, closed_at')
    .eq('id', id)
    .single();

  if (chainError || !chain) {
    return NextResponse.json({ error: 'Chain not found' }, { status: 404 });
  }

  if (chain.status !== 'closed' || !chain.chain_hash) {
    return NextResponse.json({
      data: {
        chain_id: id,
        name: chain.name,
        status: chain.status,
        verified: null,
        note: 'Chain is open — verification only available on closed chains',
      },
    });
  }

  // Recompute hash from stored events to verify integrity
  const { data: events } = await supabase
    .from('behavior_events')
    .select('id, occurred_at')
    .eq('chain_id', id)
    .order('occurred_at', { ascending: true });

  const orderedIds = (events ?? []).map((e) => e.id);
  const recomputedHash = createHash('sha256')
    .update(orderedIds.join(':'))
    .digest('hex');

  const verified = recomputedHash === chain.chain_hash;

  const response = NextResponse.json({
    data: {
      chain_id: id,
      name: chain.name,
      status: 'closed',
      chain_hash: chain.chain_hash,
      event_count: chain.event_count,
      verified,
      created_at: chain.created_at,
      closed_at: chain.closed_at,
    },
  });

  // Cache verified closed chains for 5 minutes
  response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  return response;
}
