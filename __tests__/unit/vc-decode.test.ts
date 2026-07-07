import { describe, it, expect } from 'vitest';
import { decodeVcJwt } from '@/lib/certificates/vc';

function base64url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

const samplePayload = {
  iss: 'did:web:kakunin.ai',
  sub: 'urn:kakunin:agent:agent-1',
  jti: 'urn:kakunin:cert:SERIAL123',
  iat: 1717200000,
  exp: 1748736000,
  nbf: 1717200000,
  vc: {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    type: ['VerifiableCredential', 'AgentPassport'],
    id: 'urn:kakunin:cert:SERIAL123',
    issuer: 'did:web:kakunin.ai',
    issuanceDate: '2026-06-01T00:00:00.000Z',
    expirationDate: '2027-06-01T00:00:00.000Z',
    nonQualified: true,
    credentialSubject: {
      id: 'urn:kakunin:agent:agent-1',
      agent_name: 'TestBot',
      model_hash: 'abc123',
      model: 'gpt-4',
      version: '1.0',
      tenant_id: 'tenant-1',
      serial_number: 'SERIAL123',
    },
  },
};

function buildJwt(header: object, payload: object): string {
  return `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}.fake-signature`;
}

describe('certificates/vc decodeVcJwt', () => {
  it('decodes a valid vc+jwt payload', () => {
    const jwt = buildJwt({ alg: 'RS256', typ: 'vc+jwt' }, samplePayload);
    const result = decodeVcJwt(jwt);
    expect(result).not.toBeNull();
    expect(result!.iss).toBe('did:web:kakunin.ai');
    expect(result!.sub).toBe('urn:kakunin:agent:agent-1');
    expect(result!.vc.type).toContain('AgentPassport');
    expect(result!.vc.credentialSubject.agent_name).toBe('TestBot');
  });

  it('returns null for invalid JWT (wrong number of parts)', () => {
    expect(decodeVcJwt('only-one-part')).toBeNull();
    expect(decodeVcJwt('two.parts')).toBeNull();
    expect(decodeVcJwt('a.b.c.d')).toBeNull();
  });

  it('returns null for non-JSON payload', () => {
    const badPayload = Buffer.from('not json').toString('base64url');
    expect(decodeVcJwt(`header.${badPayload}.sig`)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(decodeVcJwt('')).toBeNull();
  });

  it('preserves all credential subject fields', () => {
    const jwt = buildJwt({ alg: 'RS256' }, samplePayload);
    const result = decodeVcJwt(jwt);
    expect(result!.vc.credentialSubject.model_hash).toBe('abc123');
    expect(result!.vc.credentialSubject.model).toBe('gpt-4');
    expect(result!.vc.nonQualified).toBe(true);
  });
});
