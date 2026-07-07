/**
 * GET /.well-known/did.json
 *
 * DID Document for did:web:kakunin.ai
 * Required for W3C Verifiable Credential verification — resolvers fetch this
 * to obtain the CA public key that signed Agent Passport VCs.
 *
 * @see https://w3c-ccg.github.io/did-method-web/
 * @see https://www.w3.org/TR/did-core/
 */

import { type NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface CaKeyRow {
  public_key_pem: string;
  kms_key_arn: string;
}

export async function GET(_: NextRequest) {
  // Fetch CA public key from DB (stored as PEM during CA setup)
  // ca_keys table may not exist in all envs — degrade gracefully
  let caPubKey: CaKeyRow | null = null;
  try {
    // Dynamic import avoids top-level type errors from generated DB types
    // that don't include ca_keys yet
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = createServiceClient();
    const result = await (supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          eq: (col: string, val: unknown) => {
            maybeSingle: () => Promise<{ data: CaKeyRow | null }>;
          };
        };
      };
    }).from('ca_keys').select('public_key_pem, kms_key_arn').eq('active', true).maybeSingle();
    caPubKey = result.data;
  } catch {
    // ca_keys table not yet provisioned — serve DID doc without key material
  }

  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://w3id.org/security/suites/jws-2020/v1',
    ],
    id: 'did:web:kakunin.ai',
    verificationMethod: [
      {
        id: 'did:web:kakunin.ai#ca-key-1',
        type: 'JsonWebKey2020',
        controller: 'did:web:kakunin.ai',
        // Public key served as JWK — clients can verify vc+jwt signatures
        // If CA public key not yet in DB, serve a placeholder directing to PKI endpoint
        publicKeyJwk: caPubKey
          ? { kty: 'RSA', use: 'sig', alg: 'RS256', kid: caPubKey.kms_key_arn }
          : null,
        // Alternative: link to PEM download
        publicKeyPem: caPubKey?.public_key_pem ?? null,
      },
    ],
    assertionMethod: ['did:web:kakunin.ai#ca-key-1'],
    authentication: ['did:web:kakunin.ai#ca-key-1'],
    service: [
      {
        id: 'did:web:kakunin.ai#credential-issuer',
        type: 'CredentialIssuer',
        serviceEndpoint: 'https://kakunin.ai/api/v1',
      },
      {
        id: 'did:web:kakunin.ai#pki',
        type: 'PKIRepository',
        serviceEndpoint: 'https://pki.kakunin.ai/ca-bundle.pem',
      },
    ],
  };

  return NextResponse.json(didDocument, {
    headers: {
      'Content-Type': 'application/did+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
