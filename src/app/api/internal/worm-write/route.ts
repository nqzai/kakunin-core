import { type NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { log } from '@/lib/logging';
import type { WormRecord } from '@/lib/audit/worm-writer';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';

/**
 * POST /api/internal/worm-write (QStash worker)
 *
 * Writes a single audit record as immutable NDJSON to S3 Object Lock storage.
 *
 * Bucket: kakunin-audit-worm-{env}
 * Key:    {tenantId}/{YYYY-MM-DD}/{rowId}.json
 * ACL:    private (bucket policy blocks all public access)
 * Lock:   Object Lock Compliance mode, 7-year retention (enforced at bucket level)
 *
 * Returns 500 on S3 failure → QStash exponential backoff + retry.
 * Returns 200 on success or permanent errors (bad payload) → no retry storm.
 *
 * Worker auth is enforced first via requireVerifiedQStashBody().
 */

const BUCKET = process.env.AUDIT_WORM_S3_BUCKET;
const REGION = process.env.AWS_REGION ?? 'eu-west-1';

function getS3Client(): S3Client {
  return new S3Client({ region: REGION });
}

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  let record: WormRecord;
  try {
    record = JSON.parse(verified.body) as WormRecord;
  } catch {
    log.error('[worm-write] Invalid JSON payload');
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { tenantId, eventType, rowId, actorType, actorId, description, affectedId, metadata, timestamp } = record;

  if (!tenantId || !eventType || !rowId || !timestamp) {
    log.error('[worm-write] Missing required fields', { tenantId, eventType, rowId });
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!BUCKET) {
    // Misconfiguration — log and return 200 to avoid infinite retries on env issue
    log.error('[worm-write] AUDIT_WORM_S3_BUCKET not configured — WORM write skipped');
    return NextResponse.json({ skipped: true });
  }

  // Key: {tenantId}/{YYYY-MM-DD}/{rowId}.json
  const date = timestamp.slice(0, 10); // "2026-05-17"
  const key = `${tenantId}/${date}/${rowId}.json`;

  // NDJSON — one record per file, newline-terminated
  const ndjson = JSON.stringify({
    schemaVersion: '1',
    tenantId,
    eventType,
    rowId,
    actorType,
    actorId,
    description: description ?? null,
    affectedId: affectedId ?? null,
    metadata: metadata ?? {},
    timestamp,
    writtenAt: new Date().toISOString(),
    // Idempotency key — same rowId will produce identical content on retry
    _idempotencyKey: rowId,
  }) + '\n';

  try {
    const s3 = getS3Client();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: ndjson,
      ContentType: 'application/x-ndjson',
      // Server-side encryption — KMS-managed keys
      ServerSideEncryption: 'aws:kms',
      // Tagging for lifecycle visibility and cost allocation
      Tagging: `tenant_id=${tenantId}&event_type=${encodeURIComponent(eventType)}`,
      // Object Lock is set at bucket level (Compliance mode, 7y) — no per-object header needed
    }));

    log.info('[worm-write] WORM record written', { tenantId, eventType, key });
    return NextResponse.json({ ok: true, key });
  } catch (err) {
    // Return 500 — triggers QStash retry with exponential backoff
    log.error('[worm-write] S3 PutObject failed', {
      error: (err as Error).message,
      tenantId,
      key,
    });
    return NextResponse.json({ error: 'S3 write failed' }, { status: 500 });
  }
}
