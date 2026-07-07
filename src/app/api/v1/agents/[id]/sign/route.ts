/**
 * POST /v1/agents/:id/sign
 *
 * Signs an arbitrary JSON payload using the agent's KMS-backed RSA-2048 key.
 * No key material leaves KMS. The signature can be verified by any party via
 * POST /v1/verify/message using only the agent's public certificate.
 *
 * Used by trading AI systems for inter-agent message authentication (RCM C-F1).
 * Enables Audit Test #6: Spoofed "risk approved" messages are cryptographically rejected.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createHash } from 'crypto';
import { KMSClient, SignCommand, SigningAlgorithmSpec } from '@aws-sdk/client-kms';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLogStrict } from '@/lib/audit/audit-log';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';

const signBodySchema = z.object({
  payload: z.record(z.string(), z.unknown()),
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

  const body = signBodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

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

  if (agent.status !== 'active') {
    return NextResponse.json(
      { error: 'Only active agents can sign messages' },
      { status: 422 }
    );
  }

  // Get the agent's active certificate for the KMS key ARN
  const { data: cert, error: certError } = await supabase
    .from('certificates')
    .select('id, serial_number, kms_key_arn, expires_at')
    .eq('agent_id', id)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .order('issued_at', { ascending: false })
    .limit(1)
    .single();

  if (certError || !cert) {
    return NextResponse.json(
      { error: 'Agent has no active certificate. Issue a certificate before signing.' },
      { status: 422 }
    );
  }

  // Check cert not expired
  if (new Date(cert.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Agent certificate is expired' }, { status: 422 });
  }

  // Deterministically serialize + hash the payload
  const payloadJson = JSON.stringify(body.data.payload);
  const payloadHash = createHash('sha256').update(payloadJson).digest();
  const payloadHashHex = payloadHash.toString('hex');

  let signature: string;
  try {
    const kms = getKmsClient();
    const result = await kms.send(new SignCommand({
      KeyId: cert.kms_key_arn,
      Message: payloadHash,
      MessageType: 'DIGEST',
      SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
    }));

    if (!result.Signature) {
      throw new Error('KMS Sign returned empty signature');
    }
    signature = Buffer.from(result.Signature).toString('base64');
  } catch (err) {
    log.error('[agents.sign] KMS failure', (err as Error).message);
    return NextResponse.json({ error: 'Message signing failed' }, { status: 500 });
  }

  const signedAt = new Date().toISOString();

  // Fail closed: the audit row is the non-repudiation record for this
  // signature. If it cannot be written, do not hand the signature out.
  try {
    await writeAuditLogStrict(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.message.signed',
    actor_type: 'agent',
    actor_id: id,
    description: `Agent "${agent.name}" signed a message`,
    affected_id: cert.id,
    metadata: {
      payload_hash: payloadHashHex,
      certificate_serial: cert.serial_number,
      signed_at: signedAt,
    } as Json,
    });
  } catch (err) {
    log.error('[agents.sign] audit write failed — signature withheld', {
      certificate_serial: cert.serial_number,
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: 'Message signing failed: audit log unavailable' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    data: {
      signature,
      algorithm: 'RSASSA_PKCS1_V1_5_SHA_256',
      certificate_serial: cert.serial_number,
      payload_hash: payloadHashHex,
      signed_at: signedAt,
    },
  });
}
