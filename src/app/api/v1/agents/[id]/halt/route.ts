/**
 * POST /v1/agents/:id/halt
 *
 * Cryptographic kill switch for a certified AI agent.
 *
 * Unlike standard revocation (which only marks a cert invalid), halt:
 *   1. Records a kill_switch_activated behavioral event
 *   2. Writes an agent.halted audit log entry with halt_event_id
 *   3. Signs a halt receipt using the KMS CA key (verifiable by any party)
 *   4. Revokes the certificate (so inter-agent message verification fails)
 *   5. Stores the halt receipt on the certificate record
 *   6. Returns the signed receipt — regulators verify this for Audit Test #8
 *
 * The receipt_signature is produced by the KYC-AI CA key (KMS_CA_KEY_ARN),
 * allowing independent verification using the published CA public cert.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createHash } from 'crypto';
import { KMSClient, SignCommand, SigningAlgorithmSpec } from '@aws-sdk/client-kms';
import { randomUUID } from 'crypto';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { dispatchEmail } from '@/lib/email/dispatch';
import { scoreEvent } from '@/lib/monitoring/risk-engine';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

const haltBodySchema = z.object({
  reason: z.enum([
    'kill_switch_activated',
    'risk_threshold_exceeded',
    'regulatory_order',
    'operator_initiated',
  ]),
  operator_note: z.string().max(1000).optional(),
});

function getKmsClient(): KMSClient {
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS KMS credentials not configured.');
  }
  return new KMSClient({ region: process.env.AWS_REGION });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id } = await params;

  const body = haltBodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { reason, operator_note } = body.data;

  const supabase = createServiceClient();

  // Verify agent belongs to tenant
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (agent.status === 'retired') {
    return NextResponse.json({ error: 'Agent is already retired' }, { status: 409 });
  }

  // Get the active certificate
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, serial_number, status, kms_key_arn')
    .eq('agent_id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (certError) {
    log.error('[agents.halt] cert lookup failed', certError);
    return NextResponse.json({ error: 'Failed to look up agent certificate' }, { status: 500 });
  }

  const haltedAt = new Date().toISOString();
  const haltEventId = randomUUID();

  // 1. Record kill_switch_activated behavioral event
  const { score, band, factors } = scoreEvent({ actionType: 'kill_switch_activated' });
  const { error: eventInsertError } = await supabase.from('behavior_events').insert({
    tenant_id: tenantId,
    agent_id: id,
    action_type: 'kill_switch_activated',
    risk_score: score,
    risk_band: band,
    factors,
    payload: {
      reason,
      halt_event_id: haltEventId,
      ...(operator_note ? { operator_note } : {}),
    } as Json,
  });

  if (eventInsertError) {
    log.error('[agents.halt] behavior_events insert failed', { agentId: id, error: eventInsertError.message });
  }

  // 2. Write agent.halted to audit log. Deliberately NOT fail-closed: a kill
  // switch must never be blocked by audit infrastructure. Failure is surfaced
  // via audit_logged=false on the receipt instead.
  const auditResult = await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.halted',
    actor_type: 'user',
    actor_id: tenantId,
    description: `Agent "${agent.name}" halted — reason: ${reason}`,
    affected_id: id,
    metadata: {
      halt_event_id: haltEventId,
      halted_at: haltedAt,
      reason,
      certificate_serial: cert?.serial_number ?? null,
      operator_note: operator_note ?? null,
    } as Json,
  });

  // 3. Sign halt receipt with KMS CA key (proof the halt happened at this timestamp)
  let receiptSignature: string | null = null;
  const caKeyArn = process.env.KMS_CA_KEY_ARN;

  if (caKeyArn) {
    try {
      const receiptData = `${id}:${cert?.serial_number ?? 'no-cert'}:${haltedAt}:${haltEventId}`;
      const receiptHash = createHash('sha256').update(receiptData).digest();

      const kms = getKmsClient();
      const signResult = await kms.send(new SignCommand({
        KeyId: caKeyArn,
        Message: receiptHash,
        MessageType: 'DIGEST',
        SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
      }));

      if (signResult.Signature) {
        receiptSignature = Buffer.from(signResult.Signature).toString('base64');
      }
    } catch (err) {
      // KMS CA signing failure is non-fatal — halt still proceeds, receipt unsigned
      log.warn('[agents.halt] CA signing failed:', (err as Error).message);
    }
  }

  const haltReceipt = {
    agent_id: id,
    certificate_serial: cert?.serial_number ?? null,
    halted_at: haltedAt,
    halt_event_id: haltEventId,
    reason,
    receipt_signature: receiptSignature,
    signed_by_ca: receiptSignature !== null,
    audit_logged: auditResult !== null,
  };

  // 4. Revoke certificate + store halt receipt + suspend agent — parallel
  if (cert) {
    const [revokeResult, suspendResult] = await Promise.all([
      supabase
        .from('certificates')
        .update({
          status: 'revoked',
          revoked_at: haltedAt,
          revocation_reason: `kill_switch: ${reason}`,
          halt_receipt: haltReceipt as unknown as Json,
        })
        .eq('id', cert.id)
        .eq('tenant_id', tenantId),
      supabase
        .from('agents')
        .update({ status: 'suspended', updated_at: haltedAt })
        .eq('id', id)
        .eq('tenant_id', tenantId),
    ]);
    if (revokeResult.error) {
      log.error('[agents.halt] certificate revocation failed', { certId: cert.id, error: revokeResult.error.message });
    }
    if (suspendResult.error) {
      log.error('[agents.halt] agent suspension failed', { agentId: id, error: suspendResult.error.message });
    }
  } else {
    // No active cert — just suspend the agent
    const { error: suspendError } = await supabase
      .from('agents')
      .update({ status: 'suspended', updated_at: haltedAt })
      .eq('id', id)
      .eq('tenant_id', tenantId);
    if (suspendError) {
      log.error('[agents.halt] agent suspension failed', { agentId: id, error: suspendError.message });
    }
  }

  // 5. Fire agent.halted webhook — fire-and-forget
  dispatchWebhookEvent({
    tenantId,
    eventType: 'agent.halted',
    payload: {
      agent_id: id,
      halt_event_id: haltEventId,
      reason,
      halted_at: haltedAt,
      certificate_serial: cert?.serial_number ?? null,
    },
  }).catch((err: unknown) => {
    log.warn('[agents.halt] webhook dispatch failed:', (err as Error).message);
  });

  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'agent.halted',
      to: tenant.email,
      data: {
        tenantId,
        agentId: id,
        agentName: agent.name,
        reason,
        haltedAt,
      },
    }).catch((err: unknown) => {
      log.warn('[agents.halt] email dispatch failed', { error: (err as Error).message });
    });
  }

  return NextResponse.json({ data: { halt_receipt: haltReceipt } }, { status: 200 });
}
