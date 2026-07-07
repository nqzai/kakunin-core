/**
 * CA Certificate Management
 *
 * Kakunin operates a single KMS-backed CA key (KMS_CA_KEY_ARN).
 * Agent certificates are signed by this CA, not self-signed.
 * The CA certificate PEM is stored in KAKUNIN_CA_CERT_PEM (Doppler).
 *
 * Key flows:
 *   generateCaCert() → one-time, run via `npx tsx scripts/generate-ca-cert.ts`
 *   getCaCertPem()   → reads KAKUNIN_CA_CERT_PEM from env; throws if missing
 *   getCaDn()        → parses issuer DN from CA cert for agent cert issuance
 *
 * The CA cert is public. It contains no secret material.
 * Store KAKUNIN_CA_CERT_PEM in Doppler; it is safe to log, expose at /v1/ca, etc.
 */

import {
  KMSClient,
  GetPublicKeyCommand,
  SignCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import * as forge from 'node-forge';

export interface CaDn {
  commonName: string;
  organizationName: string;
  countryName: string;
}

const CA_COMMON_NAME = 'Kakunin AI Agent CA';
const CA_ORG_NAME = 'Kakunin';
const CA_COUNTRY = 'EU';

export const CA_DN: CaDn = {
  commonName: CA_COMMON_NAME,
  organizationName: CA_ORG_NAME,
  countryName: CA_COUNTRY,
};

/** The public CA cert URL — embedded as AIA in every agent cert. */
export const CA_CERT_URL = 'https://api.kakunin.ai/v1/ca';

/** The full chain URL — root CA + intermediate CA PEMs concatenated. */
export const CA_CHAIN_URL = 'https://api.kakunin.ai/v1/ca/chain';

/**
 * Returns the intermediate CA certificate PEM from env.
 * Returns null if not configured — cert issuance falls back to root CA.
 *
 * When configured, agent certs are signed by the intermediate CA (KMS_INT_KEY_ARN)
 * instead of the root CA. This allows revoking the intermediate without rotating the root.
 */
export function getIntermediateCaPem(): string | null {
  return process.env.KAKUNIN_INT_CERT_PEM ?? null;
}

/**
 * Returns the active signing key ARN.
 * Uses intermediate CA key (KMS_INT_KEY_ARN) if configured; falls back to root CA key.
 * Throws if neither is set.
 */
export function getSigningKeyArn(): string {
  const intKey = process.env.KMS_INT_KEY_ARN;
  if (intKey) return intKey;
  const rootKey = process.env.KMS_CA_KEY_ARN;
  if (rootKey) return rootKey;
  throw new Error('Neither KMS_INT_KEY_ARN nor KMS_CA_KEY_ARN is set');
}

/**
 * Returns the issuer DN for agent certificates.
 * When intermediate CA is active, agent certs are issued by the intermediate CA.
 * Falls back to root CA DN if no intermediate is configured.
 */
export function getIssuerDn(): CaDn {
  if (process.env.KAKUNIN_INT_CERT_PEM) {
    return {
      commonName: 'Kakunin AI Agent Intermediate CA',
      organizationName: CA_ORG_NAME,
      countryName: CA_COUNTRY,
    };
  }
  return CA_DN;
}

/**
 * Returns the full PEM chain for verifier trust anchor configuration.
 *
 * Format (RFC 4346 convention — leaf first):
 *   - Intermediate CA cert (if configured)
 *   - Root CA cert
 *
 * Used at GET /v1/ca/chain. Verifiers should trust all certs in the chain.
 */
export function getCaChainPem(): string {
  const root = getCaCertPem();
  const intermediate = getIntermediateCaPem();
  return intermediate ? `${intermediate}\n${root}` : root;
}

/**
 * Returns the CA certificate PEM from env.
 * Throws if not configured — checked at cert issuance time so the error is clear.
 */
export function getCaCertPem(): string {
  const pem = process.env.KAKUNIN_CA_CERT_PEM;
  if (!pem) {
    throw new Error(
      'KAKUNIN_CA_CERT_PEM not set. Run `npx tsx scripts/generate-ca-cert.ts` once and store the output in Doppler.'
    );
  }
  return pem;
}

/**
 * Generates a self-signed CA certificate signed by KMS_CA_KEY_ARN.
 * Run once; store the resulting PEM in KAKUNIN_CA_CERT_PEM via Doppler.
 *
 * @returns CA certificate PEM string
 */
export async function generateCaCert(): Promise<string> {
  const caKeyArn = process.env.KMS_CA_KEY_ARN;
  const region = process.env.AWS_REGION;
  if (!caKeyArn || !region) {
    throw new Error('KMS_CA_KEY_ARN and AWS_REGION must be set');
  }

  const kms = new KMSClient({ region });

  // Fetch CA public key from KMS
  const { PublicKey } = await kms.send(new GetPublicKeyCommand({ KeyId: caKeyArn }));
  if (!PublicKey) throw new Error('KMS_CA_KEY_ARN GetPublicKey returned empty');

  const publicKeyDer = Buffer.from(PublicKey).toString('binary');
  const publicKey = forge.pki.publicKeyFromAsn1(forge.asn1.fromDer(publicKeyDer));

  const now = new Date();
  // CA cert valid for 10 years
  const expiry = new Date(now.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);

  const caSerialBytes = forge.random.getBytesSync(16);
  const caSerial = Buffer.from(caSerialBytes, 'binary').toString('hex').toUpperCase();

  const caCert = forge.pki.createCertificate();
  caCert.publicKey = publicKey;
  caCert.serialNumber = caSerial;
  caCert.validity.notBefore = now;
  caCert.validity.notAfter = expiry;

  const caSubject = [
    { name: 'commonName', value: CA_COMMON_NAME },
    { name: 'organizationName', value: CA_ORG_NAME },
    { name: 'countryName', value: CA_COUNTRY },
  ];
  caCert.setSubject(caSubject);
  caCert.setIssuer(caSubject); // self-signed CA

  // sha256WithRSAEncryption — must be set before certificateToAsn1 (forge default is null)
  caCert.siginfo = { algorithmOid: '1.2.840.113549.1.1.11', parameters: forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, '') };

  caCert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
  ]);

  const SHA256_WITH_RSA_OID = '1.2.840.113549.1.1.11';
  const pki = forge.pki as unknown as {
    getTBSCertificate: (c: forge.pki.Certificate) => forge.asn1.Asn1;
    certificateToAsn1: (c: forge.pki.Certificate) => forge.asn1.Asn1;
  };

  // Use getTBSCertificate (not certificateToAsn1) — cert.signatureOid is null until we set it
  const tbsDer = forge.asn1.toDer(pki.getTBSCertificate(caCert)).getBytes();

  const { Signature } = await kms.send(new SignCommand({
    KeyId: caKeyArn,
    Message: Buffer.from(tbsDer, 'binary'),
    MessageType: 'RAW',
    SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
  }));
  if (!Signature) throw new Error('KMS Sign returned empty signature for CA cert');

  // Set signature fields so certificateToAsn1 can build the outer DER structure
  const caCertAny = caCert as unknown as Record<string, unknown>;
  caCertAny.signatureOid = SHA256_WITH_RSA_OID;
  caCertAny.signatureParameters = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, '');
  caCertAny.signature = Buffer.from(Signature).toString('binary');

  return forge.pem.encode({
    type: 'CERTIFICATE',
    body: forge.asn1.toDer(pki.certificateToAsn1(caCert)).getBytes(),
  });
}
