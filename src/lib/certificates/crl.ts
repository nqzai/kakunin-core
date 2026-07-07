/**
 * CRL Generation
 *
 * Builds a Certificate Revocation List (RFC 5280 v2) signed by KMS_CA_KEY_ARN.
 * The CRL covers all certificates with status='revoked' across all tenants.
 *
 * Key flows:
 *   generateAndStoreCrl() → builds TBSCertList → KMS sign → upsert crl_cache
 *   getCurrentCrl()       → reads crl_cache row 1; returns null if not yet generated
 *
 * Triggered by:
 *   - POST /v1/crl/generate (QStash worker, called from revoke route + 24h cron)
 */

import {
  KMSClient,
  SignCommand,
  SigningAlgorithmSpec,
} from '@aws-sdk/client-kms';
import * as forge from 'node-forge';
import { createServiceClient } from '@/lib/supabase/server';
import { getCaCertPem } from './ca';

export interface CrlResult {
  derHex: string;
  generatedAt: string;
  nextUpdateAt: string;
  revokedCount: number;
}

/** SHA-256 with RSA OID */
const SHA256_WITH_RSA_OID = '1.2.840.113549.1.1.11';

export async function generateAndStoreCrl(): Promise<CrlResult> {
  const caKeyArn = process.env.KMS_CA_KEY_ARN;
  const region = process.env.AWS_REGION;
  if (!caKeyArn || !region) throw new Error('KMS_CA_KEY_ARN and AWS_REGION must be set');

  const caCertPem = getCaCertPem();
  const caCert = forge.pki.certificateFromPem(caCertPem);

  const supabase = createServiceClient();

  const { data: revokedRows, error } = await supabase
    .from('certificates')
    .select('serial_number, revoked_at')
    .eq('status', 'revoked')
    .not('revoked_at', 'is', null);

  if (error) throw error;

  const now = new Date();
  // nextUpdate 25h from now — gives a 1h buffer before the 24h regeneration fires
  const nextUpdate = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const tbsCertList = buildTbsCertList(caCert, now, nextUpdate, revokedRows ?? []);

  const kms = new KMSClient({ region });
  const tbsDer = forge.asn1.toDer(tbsCertList).getBytes();

  const { Signature } = await kms.send(new SignCommand({
    KeyId: caKeyArn,
    Message: Buffer.from(tbsDer, 'binary'),
    MessageType: 'RAW',
    SigningAlgorithm: SigningAlgorithmSpec.RSASSA_PKCS1_V1_5_SHA_256,
  }));
  if (!Signature) throw new Error('KMS Sign returned empty signature for CRL');

  const sigBytes = Buffer.from(Signature).toString('binary');

  // RFC 5280 CertificateList SEQUENCE
  const algIdAsn1 = buildAlgId();
  const crlAsn1 = forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    tbsCertList,
    algIdAsn1,
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.BITSTRING, false,
      '\x00' + sigBytes),
  ]);

  const derHex = Buffer.from(forge.asn1.toDer(crlAsn1).getBytes(), 'binary').toString('hex');
  const revokedCount = (revokedRows ?? []).length;

  const { error: storeError } = await supabase
    .from('crl_cache')
    .upsert({
      id: 1,
      der_hex: derHex,
      generated_at: now.toISOString(),
      next_update_at: nextUpdate.toISOString(),
      revoked_count: revokedCount,
    });
  if (storeError) throw storeError;

  return { derHex, generatedAt: now.toISOString(), nextUpdateAt: nextUpdate.toISOString(), revokedCount };
}

export async function getCurrentCrl(): Promise<{
  derHex: string;
  generatedAt: string;
  nextUpdateAt: string;
} | null> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('crl_cache')
    .select('der_hex, generated_at, next_update_at')
    .eq('id', 1)
    .single();

  if (!data) return null;
  return {
    derHex: data.der_hex as string,
    generatedAt: data.generated_at as string,
    nextUpdateAt: data.next_update_at as string,
  };
}

// ── ASN.1 helpers ─────────────────────────────────────────────────────────────

function buildAlgId(): forge.asn1.Asn1 {
  return forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.OID, false,
      forge.asn1.oidToDer(SHA256_WITH_RSA_OID).getBytes()),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.NULL, false, ''),
  ]);
}

function buildTbsCertList(
  caCert: forge.pki.Certificate,
  thisUpdate: Date,
  nextUpdate: Date,
  revoked: Array<{ serial_number: string; revoked_at: string | null }>,
): forge.asn1.Asn1 {
  const issuerAsn1 = (
    forge.pki as unknown as {
      distinguishedNameToAsn1: (dn: forge.pki.Certificate['issuer']) => forge.asn1.Asn1;
    }
  ).distinguishedNameToAsn1(caCert.issuer);

  const revokedEntries = revoked.map(({ serial_number, revoked_at }) => {
    const revDate = revoked_at ? new Date(revoked_at) : new Date();
    return forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, [
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false,
        serialHexToBytes(serial_number)),
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false,
        dateToUtcTime(revDate)),
    ]);
  });

  const tbsChildren: forge.asn1.Asn1[] = [
    // version v2(1)
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.INTEGER, false, '\x01'),
    buildAlgId(),
    issuerAsn1,
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false,
      dateToUtcTime(thisUpdate)),
    forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.UTCTIME, false,
      dateToUtcTime(nextUpdate)),
  ];

  if (revokedEntries.length > 0) {
    tbsChildren.push(
      forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, revokedEntries),
    );
  }

  return forge.asn1.create(forge.asn1.Class.UNIVERSAL, forge.asn1.Type.SEQUENCE, true, tbsChildren);
}

function dateToUtcTime(d: Date): string {
  const p = (n: number) => n.toString().padStart(2, '0');
  const yy = d.getUTCFullYear().toString().slice(-2);
  return `${yy}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
}

function serialHexToBytes(hex: string): string {
  const cleanHex = hex.replace(/[:\s]/g, '');
  const bytes = Buffer.from(cleanHex, 'hex').toString('binary');
  // Ensure positive INTEGER — prepend 0x00 if high bit set
  return bytes.charCodeAt(0) > 127 ? '\x00' + bytes : bytes;
}
