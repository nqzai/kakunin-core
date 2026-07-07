/**
 * Certificate Service
 *
 * Issues X.509 certificates for AI agents via AWS KMS (RSA_2048).
 * Private key material never leaves KMS — only the public key and ARN are returned.
 *
 * Key flows:
 *   issueCertificate() → KMS CreateKey → KMS GetPublicKey → build X.509 → KMS Sign → store ARN in DB
 *   revokeCertificate() → update status + write audit_log (CRL not yet implemented)
 *
 * MiCA Art. 70: 365-day certificate validity for AI agent operators.
 *
 * @see https://docs.kakunin.ai/certificates
 */

import {
  KMSClient,
  CreateKeyCommand,
  GetPublicKeyCommand,
  SignCommand,
  KeyUsageType,
  KeySpec,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import type { Json } from '@/types/database';
import * as forge from 'node-forge';
import { CA_CHAIN_URL, getCaChainPem, getSigningKeyArn, getIssuerDn, getIntermediateCaPem } from './ca';

export interface FinancialScope {
  max_single_trade_usd: number;
  daily_limit_usd: number;
  permitted_instruments: string[];
  permitted_venues: string[];
  leverage_permitted: boolean;
  max_leverage_ratio?: number;
}

export interface AgentRecord {
  id: string;
  tenant_id: string;
  name: string;
  model_hash: string;
  model: string | null;
  version: string | null;
  metadata?: Json | null;
}

export interface CertResult {
  certificatePem: string;
  kmsKeyArn: string;
  serialNumber: string;
  issuedAt: Date;
  expiresAt: Date;
}

function getKmsClient(): KMSClient {
  if (!process.env.AWS_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS KMS credentials not configured. Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY.');
  }
  return new KMSClient({ region: process.env.AWS_REGION });
}

function getFinancialScope(agent: AgentRecord): FinancialScope | null {
  const meta = agent.metadata as { financial_scope?: FinancialScope } | null;
  return meta?.financial_scope ?? null;
}

const FINANCIAL_SCOPE_OID = '1.3.6.1.4.1.99999.3';

/**
 * Extracts the financial scope from the signed X.509 extension rather than
 * agent.metadata — metadata is tenant-editable after issuance, so callers
 * doing authorization checks (e.g. WebMCP verify-scope) must read the value
 * that was actually signed by KMS, not the current mutable DB row.
 */
export function getFinancialScopeFromCertificatePem(certificatePem: string): FinancialScope | null {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const ext = cert.extensions.find((e) => e.id === FINANCIAL_SCOPE_OID);
    if (!ext?.value) return null;

    const asn1 = forge.asn1.fromDer(ext.value as string);
    const json = asn1.value as string;
    return JSON.parse(json) as FinancialScope;
  } catch {
    return null;
  }
}

function generateSerialNumber(): string {
  const bytes = forge.random.getBytesSync(16);
  return Buffer.from(bytes, 'binary').toString('hex').toUpperCase();
}

/**
 * Issues an X.509 certificate for an AI agent via AWS KMS.
 * Private key material never leaves KMS — only the ARN is returned.
 *
 * @param agent - Agent record from the database
 * @returns Certificate PEM, KMS key ARN, serial number, and validity window
 * @throws {Error} If KMS credentials missing or KMS operation fails
 */
export async function issueCertificate(agent: AgentRecord): Promise<CertResult> {
  const kms = getKmsClient();

  // 1. Create RSA_2048 key in KMS for signing
  const createKey = await kms.send(new CreateKeyCommand({
    KeySpec: KeySpec.RSA_2048,
    KeyUsage: KeyUsageType.SIGN_VERIFY,
    Description: `Kakunin agent cert key — agent:${agent.id} tenant:${agent.tenant_id}`,
    Tags: [
      { TagKey: 'kakunin:agent-id', TagValue: agent.id },
      { TagKey: 'kakunin:tenant-id', TagValue: agent.tenant_id },
      { TagKey: 'kakunin:purpose', TagValue: 'agent-certificate' },
    ],
  }));

  const kmsKeyArn = createKey.KeyMetadata?.Arn;
  const kmsKeyId = createKey.KeyMetadata?.KeyId;
  if (!kmsKeyArn || !kmsKeyId) {
    throw new Error('KMS CreateKey did not return KeyArn');
  }

  // 2. Fetch the RSA public key (DER-encoded) from KMS
  const getPublicKey = await kms.send(new GetPublicKeyCommand({ KeyId: kmsKeyId }));
  if (!getPublicKey.PublicKey) {
    throw new Error('KMS GetPublicKey returned empty payload');
  }

  // 3. Build X.509 certificate using the KMS public key
  const issuedAt = new Date();
  // MiCA Art. 70 requires 365-day certificate validity for AI agent operators
  const expiresAt = new Date(issuedAt.getTime() + 365 * 24 * 60 * 60 * 1000);
  const serialNumber = generateSerialNumber();

  const publicKeyDer = Buffer.from(getPublicKey.PublicKey).toString('binary');
  const publicKeyAsn1 = forge.asn1.fromDer(publicKeyDer);
  const publicKey = forge.pki.publicKeyFromAsn1(publicKeyAsn1);

  const cert = forge.pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = serialNumber;
  cert.validity.notBefore = issuedAt;
  cert.validity.notAfter = expiresAt;

  const issuerDn = getIssuerDn();
  const subject = [
    { name: 'commonName', value: `${agent.name}:${agent.id}` },
    { name: 'organizationName', value: agent.tenant_id },
    { name: 'countryName', value: 'EU' },
  ];
  const issuer = [
    { name: 'commonName', value: issuerDn.commonName },
    { name: 'organizationName', value: issuerDn.organizationName },
    { name: 'countryName', value: issuerDn.countryName },
  ];
  cert.setSubject(subject);
  cert.setIssuer(issuer); // signed by intermediate CA if KMS_INT_KEY_ARN is set, else root CA

  // AIA points to chain endpoint when intermediate CA is active, else root CA endpoint
  const aiaUrl = getIntermediateCaPem() ? CA_CHAIN_URL : 'https://api.kakunin.ai/v1/ca';
  // Build AIA extension DER — points verifiers to the public CA cert URL
  // AIA OID: 1.3.6.1.5.5.7.1.1; caIssuers accessMethod OID: 1.3.6.1.5.5.7.48.2
  const aiaAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      // caIssuers OID 1.3.6.1.5.5.7.48.2
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false,
        forge.asn1.oidToDer('1.3.6.1.5.5.7.48.2').getBytes()),
      // [6] uniformResourceIdentifier (context-specific tag 6)
      forge.asn1.create(forge.asn1.Class.CONTEXT_SPECIFIC, 6, false, aiaUrl),
    ]),
  ]);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
    {
      name: 'extKeyUsage',
      clientAuth: true,
      // OID 1.3.6.1.4.1.99999.1 — Kakunin AI Agent Identity (reserved)
      custom: [{ id: '1.3.6.1.4.1.99999.1' }],
    },
    {
      name: 'subjectAltName',
      altNames: [{ type: 6, value: `urn:kakunin:agent:${agent.id}` }],
    },
    {
      // Authority Information Access — points to public CA cert URL
      id: '1.3.6.1.5.5.7.1.1',
      critical: false,
      value: forge.asn1.toDer(aiaAsn1).getBytes(),
    },
    {
      // OID 1.3.6.1.4.1.99999.2 — Kakunin Model Hash
      // Encodes the SHA-256 hash of the agent's model artifact for audit replay (RCM C-B1)
      id: '1.3.6.1.4.1.99999.2',
      critical: false,
      value: forge.asn1.toDer(
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTF8, false, agent.model_hash)
      ).getBytes(),
    },
    ...(getFinancialScope(agent) ? [{
      // OID 1.3.6.1.4.1.99999.3 — Kakunin Financial Authorization Scope
      // JSON-encoded spending limits and permitted instruments/venues (RCM C-E1)
      id: '1.3.6.1.4.1.99999.3',
      critical: false,
      value: forge.asn1.toDer(
        forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTF8, false, JSON.stringify(getFinancialScope(agent)))
      ).getBytes(),
    }] : []),
  ]);

  // 4. Build TBS (to-be-signed) DER bytes and sign via KMS signing key.
  // Uses intermediate CA key if KMS_INT_KEY_ARN is set, else root CA key.
  // Validate chain PEM is configured before signing (fails fast rather than issuing unchained cert).
  getCaChainPem();
  const caKeyArn = getSigningKeyArn();

  const SHA256_WITH_RSA_OID = '1.2.840.113549.1.1.11';
  const pki = forge.pki as unknown as {
    getTBSCertificate: (c: forge.pki.Certificate) => forge.asn1.Asn1;
    certificateToAsn1: (c: forge.pki.Certificate) => forge.asn1.Asn1;
  };

  // siginfo must be set so getTBSCertificate can encode the signature algorithm in TBS
  cert.siginfo = { algorithmOid: SHA256_WITH_RSA_OID, parameters: forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, '') };

  // Use getTBSCertificate (not certificateToAsn1) — cert.signatureOid is null until after signing
  const tbsDer = forge.asn1.toDer(pki.getTBSCertificate(cert)).getBytes();

  const kmsSign = await kms.send(new SignCommand({
    KeyId: caKeyArn,
    Message: Buffer.from(tbsDer, 'binary'),
    MessageType: 'RAW',
    SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
  }));

  if (!kmsSign.Signature) {
    throw new Error('KMS Sign returned empty signature');
  }

  // Set signature fields so certificateToAsn1 can build the outer DER structure
  const certAny = cert as unknown as Record<string, unknown>;
  certAny.signatureOid = SHA256_WITH_RSA_OID;
  certAny.signatureParameters = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, '');
  certAny.signature = Buffer.from(kmsSign.Signature).toString('binary');

  const certificatePem = forge.pem.encode({
    type: 'CERTIFICATE',
    body: forge.asn1.toDer(pki.certificateToAsn1(cert)).getBytes(),
  });

  return { certificatePem, kmsKeyArn, serialNumber, issuedAt, expiresAt };
}
