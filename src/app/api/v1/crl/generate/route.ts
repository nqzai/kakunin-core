import { type NextRequest, NextResponse } from 'next/server';
import { Receiver } from '@upstash/qstash';
import { generateAndStoreCrl } from '@/lib/certificates/crl';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * POST /v1/crl/generate
 *
 * QStash worker — generates and stores a fresh CA-signed CRL.
 * Called by:
 *   - POST /v1/certificates/:id/revoke (immediately after each revocation)
 *   - QStash 24h cron schedule
 *
 * Validated by QStash signature — not callable without valid QStash credentials.
 */
export async function POST(req: NextRequest) {
  // Verify QStash signature
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? '',
  });

  const rawBody = await req.text();
  const isValid = await receiver.verify({
    signature: req.headers.get('upstash-signature') ?? '',
    body: rawBody,
  }).catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid QStash signature' }, { status: 401 });
  }

  const result = await generateAndStoreCrl();

  const supabase = createServiceClient();
  await writeAuditLog(supabase, {
    tenant_id: null, // system-level event (actor_type=system)
    event_type: 'crl.generated',
    actor_type: 'system',
    actor_id: 'qstash-cron',
    description: `CRL generated with ${result.revokedCount} revoked certificates`,
    affected_id: null,
    metadata: {
      revoked_count: result.revokedCount,
      generated_at: result.generatedAt,
      next_update_at: result.nextUpdateAt,
    },
  });

  return NextResponse.json({ data: result });
}
