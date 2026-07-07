import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { Client as QStashClient } from '@upstash/qstash';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { dispatchEmail } from '@/lib/email/dispatch';
import { writeAuditLogStrict } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';

const revokeBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

/**
 * POST /v1/certificates/:id/revoke
 *
 * Manually revoke an active certificate. Also suspends the owning agent
 * so it cannot emit events or request a new cert until reactivated.
 *
 * Returns 409 if already revoked, 422 if expired (can't revoke expired).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const rawBody = await req.json().catch(() => ({}));
  const body = revokeBodySchema.safeParse(rawBody);
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch cert — enforce tenant scope
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, tenant_id, agent_id, status, serial_number')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (certError || !cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  if (cert.status === 'revoked') {
    return NextResponse.json({ error: 'Certificate already revoked' }, { status: 409 });
  }

  if (cert.status === 'expired') {
    return NextResponse.json({ error: 'Cannot revoke an expired certificate' }, { status: 422 });
  }

  const revokedAt = new Date().toISOString();

  // Revoke cert + suspend agent — parallel, both must be tenant-scoped
  const [{ error: revokeError }] = await Promise.all([
    supabase
      .from('certificates')
      .update({
        status: 'revoked',
        revoked_at: revokedAt,
        revocation_reason: body.data.reason,
      })
      .eq('id', id)
      .eq('tenant_id', tenantId),
    supabase
      .from('agents')
      .update({ status: 'suspended', updated_at: revokedAt })
      .eq('id', cert.agent_id)
      .eq('tenant_id', tenantId),
  ]);

  if (revokeError) {
    log.error('[certificates.revoke] DB update failed', revokeError);
    return NextResponse.json({ error: 'Failed to revoke certificate' }, { status: 500 });
  }

  // Regenerate CRL immediately — revoked cert must appear in CRL as fast as
  // possible, regardless of whether the audit write below succeeds.
  const enqueueCrlRegeneration = () => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && process.env.QSTASH_TOKEN) {
      const qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
      qstash.publishJSON({
        url: `${appUrl}/api/v1/crl/generate`,
        body: { trigger: 'revocation', certificate_id: id },
        retries: 3,
      }).catch((err: unknown) => {
        log.warn('[certificates.revoke] CRL regeneration enqueue failed:', (err as Error).message);
      });
    }
  };

  // Fail closed on the audit trail: the revocation itself stands (revoked is
  // the safe state and is never rolled back), but an unaudited revocation is
  // surfaced as a 500 so operators know the compliance record is incomplete.
  try {
    await writeAuditLogStrict(supabase, {
      tenant_id: tenantId,
      event_type: 'certificate.revoked',
      actor_type: 'user',
      actor_id: tenantId,
      description: `Certificate ${cert.serial_number} manually revoked. Reason: ${body.data.reason}`,
      affected_id: id,
      metadata: {
        agent_id: cert.agent_id,
        serial_number: cert.serial_number,
        reason: body.data.reason,
        revoked_at: revokedAt,
      },
    });
  } catch (err) {
    log.error('[certificates.revoke] audit write failed — certificate remains revoked', {
      certificate_id: id,
      serial_number: cert.serial_number,
      error: (err as Error).message,
    });
    enqueueCrlRegeneration();
    return NextResponse.json(
      { error: 'Certificate was revoked but the audit log write failed' },
      { status: 500 }
    );
  }

  // Dispatch certificate.revoked webhook event — fire-and-forget
  dispatchWebhookEvent({
    tenantId,
    eventType: 'certificate.revoked',
    payload: {
      certificate_id: id,
      agent_id: cert.agent_id,
      serial_number: cert.serial_number,
      reason: body.data.reason,
      revoked_at: revokedAt,
    },
  }).catch((err: unknown) => {
    log.warn('[certificates.revoke] webhook dispatch failed:', (err as Error).message);
  });

  // Email tenant admin — fire-and-forget via QStash
  const { data: agentRow } = await supabase
    .from('agents')
    .select('name')
    .eq('id', cert.agent_id)
    .eq('tenant_id', tenantId)
    .single();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'certificate.revoked',
      to: tenant.email,
      data: {
        tenantId,
        agentName: agentRow?.name ?? 'Unknown agent',
        agentId: cert.agent_id,
        reason: body.data.reason ?? 'Manual revocation',
        revokedAt,
      },
    }).catch((err: unknown) => {
      log.warn('[certificates.revoke] email dispatch failed', { error: (err as Error).message });
    });
  }

  enqueueCrlRegeneration();

  return NextResponse.json({
    data: {
      certificate_id: id,
      status: 'revoked',
      revoked_at: revokedAt,
      reason: body.data.reason,
    },
  });
}
