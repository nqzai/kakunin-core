/**
 * POST /v1/verify/message — public inter-agent message verification endpoint.
 *
 * No auth required — any party can verify whether a message was signed by
 * a specific Kakunin-certified agent. Uses the agent's public key from the
 * certificate PEM (no KMS call needed — public key is in the cert).
 *
 * Audit Test #6 (Inter-Agent Spoofing): A fake "risk approved" message injected
 * into a trading pipeline returns { valid: false } — the execution agent rejects it.
 *
 * If the certificate is revoked or expired, valid is always false regardless of
 * whether the cryptographic signature checks out.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash, createVerify } from 'crypto';
import * as forge from 'node-forge';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';

const verifyMessageSchema = z.object({
  payload: z.record(z.string(), z.unknown()),
  signature: z.string().min(1),
  certificate_serial: z.string().min(1),
});

// Lazy-initialized — skipped if Upstash is not configured (local dev).
// This endpoint is in the middleware public-bypass list (no API key) yet
// performs audit + webhook side effects, so it MUST be rate limited per IP.
let verifyMessageRatelimit: Ratelimit | null = null;

function getVerifyMessageRatelimit(): Ratelimit | null {
  if (verifyMessageRatelimit) return verifyMessageRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  verifyMessageRatelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    // 30 req/60s per IP — stricter than read-only /verify because each call can
    // trigger an audit_log write and a risk.alert webhook on failed verification.
    limiter: Ratelimit.slidingWindow(30, '60 s'),
    prefix: 'kakunin:rl:verify-message',
    analytics: true,
  });
  return verifyMessageRatelimit;
}

export async function POST(req: NextRequest) {
  // ── IP-based rate limit — BEFORE any DB query or side effect ─────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const rl = getVerifyMessageRatelimit();
  if (rl) {
    const { success, limit, reset } = await rl.limit(ip);
    if (!success) {
      log.warn('[verify-message] rate limit hit', { ip });
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  const body = verifyMessageSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { payload, signature, certificate_serial } = body.data;

  const supabase = createServiceClient();

  // Look up cert — no auth, public endpoint
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, serial_number, status, expires_at, revoked_at, certificate_pem, agent_id, tenant_id')
    .eq('serial_number', certificate_serial.toUpperCase())
    .single();

  if (certError || !cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  // Fetch agent details for the response
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, operator_org:metadata->operator_org, permitted_actions:metadata->permitted_actions, model_hash')
    .eq('id', cert.agent_id)
    .eq('tenant_id', cert.tenant_id)
    .single();

  const now = new Date();
  const isExpired = new Date(cert.expires_at) < now;
  const certificateStatus = cert.status === 'active' && isExpired ? 'expired' : cert.status;
  const certIsValid = certificateStatus === 'active';

  // Verify signature cryptographically using the public key from the cert PEM
  let signatureValid = false;
  let verificationError: string | undefined;

  try {
    const forgeCert = forge.pki.certificateFromPem(cert.certificate_pem);
    const publicKeyPem = forge.pki.publicKeyToPem(forgeCert.publicKey);

    const payloadJson = JSON.stringify(payload);
    const payloadHash = createHash('sha256').update(payloadJson).digest();
    const signatureBuffer = Buffer.from(signature, 'base64');

    const verifier = createVerify('RSA-SHA256');
    verifier.update(payloadHash);
    signatureValid = verifier.verify(publicKeyPem, signatureBuffer);
  } catch (err) {
    verificationError = (err as Error).message;
    signatureValid = false;
  }

  // valid = cryptographic check passed AND cert is currently active
  const valid = signatureValid && certIsValid;

  // Log failed verifications as high-risk events — potential spoofing attempt
  if (!valid) {
    const failureReason = !signatureValid
      ? (verificationError ?? 'signature_mismatch')
      : `certificate_${certificateStatus}`;

    // Best-effort — do not block the response on audit log write failures
    writeAuditLog(supabase, {
      tenant_id: cert.tenant_id,
      event_type: 'agent.message.verification.failed',
      actor_type: 'system',
      actor_id: 'public',
      description: `Message verification failed for cert ${certificate_serial}: ${failureReason}`,
      affected_id: cert.id,
      metadata: {
        certificate_serial,
        claimed_agent_id: cert.agent_id,
        failure_reason: failureReason,
        certificate_status: certificateStatus,
      } as Json,
    }).catch((err: unknown) => {
      log.warn('[verify.message] audit log write failed', { error: (err as Error).message });
    });

    // Fire risk.alert webhook for the affected tenant — potential spoofing
    dispatchWebhookEvent({
      tenantId: cert.tenant_id,
      eventType: 'risk.alert',
      payload: {
        alert_type: 'message_verification_failed',
        agent_id: cert.agent_id,
        certificate_serial,
        failure_reason: failureReason,
        certificate_status: certificateStatus,
      },
    }).catch((err: unknown) => {
      log.warn('[verify.message] webhook dispatch failed', { error: (err as Error).message });
    });
  }

  return NextResponse.json({
    data: {
      valid,
      certificate_status: certificateStatus,
      agent_id: cert.agent_id,
      agent_name: agent?.name ?? null,
      model_hash: agent?.model_hash ?? null,
      certificate_serial: cert.serial_number,
      expires_at: cert.expires_at,
      ...(cert.revoked_at ? { revoked_at: cert.revoked_at } : {}),
    },
  });
}
