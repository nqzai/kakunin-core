/**
 * W3C Verifiable Credential — Agent Passport
 *
 * Issues a JWT-encoded W3C VC (vc+jwt, RFC 7519 + W3C VC Data Model v1.1)
 * for an AI agent alongside its X.509 certificate.
 *
 * Signing: KMS RSA_2048 / RSASSA_PKCS1_V1_5_SHA_256 (same CA key as X.509).
 * Private key never leaves KMS.
 *
 * DID method: did:web:kakunin.ai — resolved via /.well-known/did.json
 *
 * Non-qualified: explicitly not QES. Marked as such in credential.
 *
 * @see https://www.w3.org/TR/vc-data-model/
 * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
 */

import {
  KMSClient,
  SignCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import { getSigningKeyArn } from './ca';

const KAKUNIN_ISSUER_DID = 'did:web:kakunin.ai';
const VC_CONTEXT = [
  'https://www.w3.org/2018/credentials/v1',
  'https://kakunin.ai/credentials/v1',  // Kakunin extension context
];

export interface AgentPassportInput {
  agentId: string;
  agentName: string;
  tenantId: string;
  modelHash: string;
  model: string | null;
  version: string | null;
  serialNumber: string;
  kmsKeyArn: string;
  issuedAt: Date;
  expiresAt: Date;
}

/** W3C VC Data Model v1.1 — AgentPassport credential type */
interface AgentPassportVC {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;
  expirationDate: string;
  /** explicitly non-qualified — not QES */
  nonQualified: true;
  credentialSubject: {
    id: string;            // urn:kakunin:agent:{agentId}
    agent_name: string;
    model_hash: string;
    model: string | null;
    version: string | null;
    tenant_id: string;
    serial_number: string; // links to the X.509 cert
  };
}

/** JWT payload — W3C VC Data Model as JWT claims (RFC 7519 mapping) */
interface VcJwtPayload {
  iss: string;   // issuer DID
  sub: string;   // subject URN
  jti: string;   // credential ID (unique per issuance)
  iat: number;   // issuance unix timestamp
  exp: number;   // expiry unix timestamp
  nbf: number;   // not before
  vc: AgentPassportVC;
}

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input;
  return buf.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Issue a W3C Verifiable Credential (vc+jwt) for an AI agent.
 *
 * Signs with the Kakunin CA KMS key — same key that signs X.509 certs.
 * Returns the compact JWT string: base64url(header).base64url(payload).base64url(sig)
 *
 * @throws {Error} If KMS signing fails
 */
export async function issueVerifiableCredential(
  input: AgentPassportInput,
): Promise<string> {
  const caKeyArn = getSigningKeyArn();
  const kms = new KMSClient({ region: process.env.AWS_REGION });

  const credentialId = `urn:kakunin:cert:${input.serialNumber}`;
  const subjectId = `urn:kakunin:agent:${input.agentId}`;

  const vc: AgentPassportVC = {
    '@context': VC_CONTEXT,
    type: ['VerifiableCredential', 'AgentPassport'],
    id: credentialId,
    issuer: KAKUNIN_ISSUER_DID,
    issuanceDate: input.issuedAt.toISOString(),
    expirationDate: input.expiresAt.toISOString(),
    nonQualified: true,
    credentialSubject: {
      id: subjectId,
      agent_name: input.agentName,
      model_hash: input.modelHash,
      model: input.model,
      version: input.version,
      tenant_id: input.tenantId,
      serial_number: input.serialNumber,
    },
  };

  const payload: VcJwtPayload = {
    iss: KAKUNIN_ISSUER_DID,
    sub: subjectId,
    jti: credentialId,
    iat: Math.floor(input.issuedAt.getTime() / 1000),
    exp: Math.floor(input.expiresAt.getTime() / 1000),
    nbf: Math.floor(input.issuedAt.getTime() / 1000),
    vc,
  };

  // JWT header — kid references the KMS CA key ARN so verifiers can locate the public key
  const header = {
    alg: 'RS256',
    typ: 'vc+jwt',
    kid: caKeyArn,
  };

  const headerEncoded = base64url(JSON.stringify(header));
  const payloadEncoded = base64url(JSON.stringify(payload));
  const signingInput = `${headerEncoded}.${payloadEncoded}`;

  const kmsSign = await kms.send(new SignCommand({
    KeyId: caKeyArn,
    Message: Buffer.from(signingInput, 'utf8'),
    MessageType: 'RAW',
    SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
  }));

  if (!kmsSign.Signature) {
    throw new Error('[vc] KMS Sign returned empty signature');
  }

  const sigEncoded = base64url(Buffer.from(kmsSign.Signature));
  return `${signingInput}.${sigEncoded}`;
}

/**
 * Decode a vc+jwt without signature verification (for display/inspection).
 * Use the KMS public key + standard JWT library for full verification.
 */
export function decodeVcJwt(vcJwt: string): VcJwtPayload | null {
  try {
    const parts = vcJwt.split('.');
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload) as VcJwtPayload;
  } catch {
    return null;
  }
}
