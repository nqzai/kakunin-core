import { NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { issueCertificate } from '@/lib/certificates/issue';
import { issueVerifiableCredential } from '@/lib/certificates/vc';
import { enqueue } from '@/lib/queue/qstash';
import { dispatchWebhookEvent } from '@/lib/webhooks/dispatch';
import { dispatchEmail } from '@/lib/email/dispatch';
import { writeAuditLogStrict } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';

interface CertifyContext {
  supabase: SupabaseClient;
  tenantId: string;
  agentId: string;
  actorType: 'system' | 'user';
  actorId: string;
  issueVC?: boolean;
  logPrefix: string;
}

/**
 * Shared certificate issuance logic used by both the v1 API route and the
 * dashboard route. Handles agent validation, cert issuance via KMS, DB
 * persistence, audit logging, webhook dispatch, email, and inbox provisioning.
 */
export async function certifyAgent(ctx: CertifyContext): Promise<NextResponse> {
  const {
    supabase, tenantId, agentId, actorType, actorId,
    issueVC = false, logPrefix,
  } = ctx;

  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, tenant_id, name, model, model_hash, version, status, inbox_address, metadata')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (agentError || !agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (agent.status === 'retired') {
    return NextResponse.json({ error: 'Cannot certify a retired agent' }, { status: 422 });
  }

  if (!agent.model_hash) {
    return NextResponse.json(
      { error: 'Agent is missing model_hash. Update the agent with a SHA-256 model hash before certifying.' },
      { status: 422 },
    );
  }

  const { data: existingCert } = await supabase
    .from('certificates')
    .select('id, expires_at')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  if (existingCert) {
    return NextResponse.json(
      { error: 'Agent already has an active certificate', data: { certificate_id: existingCert.id } },
      { status: 409 },
    );
  }

  const modelHash = agent.model_hash as string;

  let certResult;
  let vcJwt: string | null = null;
  try {
    certResult = await issueCertificate({ ...agent, model_hash: modelHash });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'KMS error';
    log.error(`[${logPrefix}] KMS failure`, message);
    if (message.includes('credentials not configured')) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    return NextResponse.json({ error: 'Certificate issuance failed' }, { status: 500 });
  }

  if (issueVC) {
    try {
      vcJwt = await issueVerifiableCredential({
        agentId,
        agentName: agent.name as string,
        tenantId,
        modelHash,
        model: agent.model as string,
        version: agent.version as string,
        serialNumber: certResult.serialNumber,
        kmsKeyArn: certResult.kmsKeyArn,
        issuedAt: certResult.issuedAt,
        expiresAt: certResult.expiresAt,
      });
    } catch (err) {
      log.warn(`[${logPrefix}] VC issuance failed \u2014 X.509 still issued`, (err as Error).message);
    }
  }

  const certInsert = {
    tenant_id: tenantId,
    agent_id: agentId,
    serial_number: certResult.serialNumber,
    kms_key_arn: certResult.kmsKeyArn,
    certificate_pem: certResult.certificatePem,
    status: 'active',
    issued_at: certResult.issuedAt.toISOString(),
    expires_at: certResult.expiresAt.toISOString(),
    ...(vcJwt ? { vc_jwt: vcJwt } : {}),
  };

  const { data: certificate, error: certError } = await supabase
    .from('certificates')
    .insert(certInsert)
    .select()
    .single();

  if (certError || !certificate) {
    log.error(`[${logPrefix}] DB insert failed`, certError);
    return NextResponse.json({ error: 'Failed to store certificate' }, { status: 500 });
  }

  const activatedFromPending = agent.status === 'pending';
  if (activatedFromPending) {
    const { error: activateError } = await supabase
      .from('agents')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);
    if (activateError) {
      log.error(`[${logPrefix}] agent activation failed`, { agentId, error: activateError.message });
    }
  }

  // Fail closed: an unaudited certificate must not exist. If the audit row
  // cannot be written, roll back the issuance (delete cert, revert agent
  // status) and fail the request. Webhook/email below only fire after the
  // audit row is durable.
  try {
    await writeAuditLogStrict(supabase, {
      tenant_id: tenantId,
      event_type: 'certificate.issued',
      actor_type: actorType,
      actor_id: actorId,
      description: `X.509 certificate issued for agent "${agent.name}"${actorType === 'user' ? ' via dashboard' : ''}`,
      affected_id: certificate.id,
      metadata: {
        agent_id: agentId,
        serial_number: certResult.serialNumber,
        kms_key_arn: certResult.kmsKeyArn,
        expires_at: certResult.expiresAt.toISOString(),
      },
    });
  } catch (err) {
    log.error(`[${logPrefix}] audit write failed — rolling back issuance`, {
      certificate_id: certificate.id,
      serial_number: certResult.serialNumber,
      kms_key_arn: certResult.kmsKeyArn, // orphaned KMS key — needs manual cleanup
      error: (err as Error).message,
    });
    await supabase
      .from('certificates')
      .delete()
      .eq('id', certificate.id)
      .eq('tenant_id', tenantId);
    if (activatedFromPending) {
      await supabase
        .from('agents')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', agentId)
        .eq('tenant_id', tenantId);
    }
    return NextResponse.json(
      { error: 'Certificate issuance failed: audit log unavailable' },
      { status: 500 },
    );
  }

  dispatchWebhookEvent({
    tenantId,
    eventType: 'certificate.issued',
    payload: {
      agent_id: agentId,
      certificate_id: certificate.id,
      serial_number: certResult.serialNumber,
      expires_at: certResult.expiresAt.toISOString(),
    },
  }).catch((err: unknown) => {
    log.warn(`[${logPrefix}] webhook dispatch failed:`, (err as Error).message);
  });

  const { data: tenant } = await supabase
    .from('tenants')
    .select('email')
    .eq('id', tenantId)
    .single();

  if (tenant?.email) {
    dispatchEmail({
      template: 'certificate.issued',
      to: tenant.email,
      data: {
        tenantId,
        agentName: agent.name,
        agentId,
        certSerial: certResult.serialNumber,
        validUntil: certResult.expiresAt.toISOString(),
      },
    }).catch((err: unknown) => {
      log.warn(`[${logPrefix}] email dispatch failed`, { error: (err as Error).message });
    });
  }

  if (!agent.inbox_address) {
    try {
      await enqueue({
        path: 'provision-inbox',
        body: { tenantId, agentId, agentName: agent.name },
      });
    } catch (err) {
      log.warn(`[${logPrefix}] QStash inbox provision skipped:`, (err as Error).message);
    }
  }

  return NextResponse.json({ data: certificate }, { status: 201 });
}
