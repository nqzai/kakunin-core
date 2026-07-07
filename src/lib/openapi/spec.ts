/**
 * OpenAPI 3.0 spec generator.
 *
 * Uses @asteasolutions/zod-to-openapi to derive schemas from the same Zod
 * definitions used in route handlers. Run via `npx tsx scripts/generate-openapi.ts`
 * or served live at GET /api/v1/openapi.json.
 */

import { z } from 'zod';
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

const registry = new OpenAPIRegistry();

// ── Shared components ─────────────────────────────────────────────────────────

const ErrorResponse = registry.register(
  'ErrorResponse',
  z.object({ error: z.string() }).openapi('ErrorResponse'),
);

const AgentStatus = z.enum(['pending', 'active', 'suspended', 'retired']).openapi('AgentStatus');

const FinancialScope = registry.register(
  'FinancialScope',
  z.object({
    max_single_trade_usd: z.number().positive(),
    daily_limit_usd: z.number().positive(),
    permitted_instruments: z.array(z.string()),
    permitted_venues: z.array(z.string()),
    leverage_permitted: z.boolean(),
    max_leverage_ratio: z.number().positive().optional(),
  }).openapi('FinancialScope'),
);

const Agent = registry.register(
  'Agent',
  z.object({
    id: z.string().uuid(),
    tenant_id: z.string().uuid(),
    name: z.string(),
    model: z.string().nullable(),
    model_hash: z.string(),
    version: z.string().nullable(),
    status: AgentStatus,
    inbox_address: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  }).openapi('Agent'),
);

const Certificate = registry.register(
  'Certificate',
  z.object({
    id: z.string().uuid(),
    agent_id: z.string().uuid(),
    serial_number: z.string(),
    kms_key_arn: z.string(),
    certificate_pem: z.string(),
    status: z.enum(['active', 'revoked', 'expired']),
    issued_at: z.string().datetime(),
    expires_at: z.string().datetime(),
    revoked_at: z.string().datetime().nullable(),
    revocation_reason: z.string().nullable(),
  }).openapi('Certificate'),
);

const BehaviorEvent = registry.register(
  'BehaviorEvent',
  z.object({
    id: z.string().uuid(),
    agent_id: z.string().uuid(),
    action_type: z.enum([
      'api_call',
      'authentication_attempt',
      'authentication_failure',
      'data_access',
      'data_mutation',
      'transaction_initiated',
      'transaction_anomaly',
      'unauthorized_access_attempt',
      'message_signed',
      'message_verification_failed',
    ]),
    risk_score: z.number().min(0).max(1),
    risk_band: z.enum(['low', 'medium', 'high']),
    occurred_at: z.string().datetime(),
    details: z.record(z.string(), z.unknown()),
  }).openapi('BehaviorEvent'),
);

const Webhook = registry.register(
  'Webhook',
  z.object({
    id: z.string().uuid(),
    url: z.string().url(),
    events: z.array(z.enum(['certificate.issued', 'certificate.revoked', 'risk.alert', 'agent.halted'])),
    active: z.boolean(),
    created_at: z.string().datetime(),
  }).openapi('Webhook'),
);

const AuditLog = registry.register(
  'AuditLog',
  z.object({
    id: z.string().uuid(),
    event_type: z.string(),
    actor_type: z.enum(['user', 'agent', 'system']),
    actor_id: z.string(),
    description: z.string().nullable(),
    affected_id: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).nullable(),
    created_at: z.string().datetime(),
  }).openapi('AuditLog'),
);

const bearerAuth = registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  description: 'API key (kak_live_... or kak_test_...)',
});

// ── Agents ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/v1/agents',
  summary: 'Register an AI agent',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().min(1).max(255).openapi({ example: 'RiskEngine-v2' }),
            model_hash: z.string().min(1).openapi({ example: 'sha256:abc123...' }),
            model: z.string().optional().openapi({ example: 'gpt-4o' }),
            version: z.string().optional().openapi({ example: '2.1.0' }),
            description: z.string().optional(),
            financial_scope: FinancialScope.optional(),
            metadata: z.record(z.string(), z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Agent registered', content: { 'application/json': { schema: z.object({ data: Agent }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Agents'],
});

registry.registerPath({
  method: 'get',
  path: '/v1/agents/{id}',
  summary: 'Get agent by ID',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: { description: 'Agent', content: { 'application/json': { schema: z.object({ data: Agent }) } } },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Agents'],
});

// ── Certificates ──────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/v1/agents/{id}/certify',
  summary: 'Issue X.509 certificate for agent',
  description: 'Issues an RSA-2048 certificate via AWS KMS. Fails if agent already has an active certificate.',
  security: [{ [bearerAuth.name]: [] }],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    201: { description: 'Certificate issued', content: { 'application/json': { schema: z.object({ data: Certificate }) } } },
    404: { description: 'Agent not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Agent already has active certificate', content: { 'application/json': { schema: ErrorResponse } } },
    422: { description: 'Agent is retired or invalid state', content: { 'application/json': { schema: ErrorResponse } } },
    503: { description: 'KMS not configured', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Certificates'],
});

registry.registerPath({
  method: 'post',
  path: '/v1/certificates/{id}/revoke',
  summary: 'Revoke a certificate',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({ reason: z.string().min(1).max(500) }),
        },
      },
    },
  },
  responses: {
    200: { description: 'Revoked', content: { 'application/json': { schema: z.object({ data: z.object({ certificate_id: z.string(), status: z.literal('revoked'), revoked_at: z.string(), reason: z.string() }) }) } } },
    404: { description: 'Certificate not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Already revoked', content: { 'application/json': { schema: ErrorResponse } } },
    422: { description: 'Certificate is expired', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Certificates'],
});

registry.registerPath({
  method: 'get',
  path: '/v1/verify/{serial}',
  summary: 'Verify agent certificate by serial number',
  description: 'Public endpoint — no auth required. Rate limited: 100 req/60s per IP.',
  request: { params: z.object({ serial: z.string().openapi({ example: 'AABBCCDDEEFF00112233' }) }) },
  responses: {
    200: { description: 'Certificate status', content: { 'application/json': { schema: z.object({ data: z.object({ serial_number: z.string(), status: z.enum(['active', 'revoked', 'expired']), agent_id: z.string().uuid(), issued_at: z.string(), expires_at: z.string() }) }) } } },
    404: { description: 'Certificate not found', content: { 'application/json': { schema: ErrorResponse } } },
    429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Certificates'],
});

// ── Events ────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/v1/events',
  summary: 'Ingest behavioral event',
  description: 'Records an agent action and computes a risk score. High-risk events (≥0.85) trigger auto-revocation after 3 in 15 min.',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            agentId: z.string().uuid(),
            actionType: z.enum(['api_call', 'authentication_attempt', 'authentication_failure', 'data_access', 'data_mutation', 'transaction_initiated', 'transaction_anomaly', 'unauthorized_access_attempt', 'message_signed', 'message_verification_failed']),
            chainId: z.string().uuid().optional(),
            sessionId: z.string().optional(),
            occurredAt: z.string().datetime().optional(),
            details: z.record(z.string(), z.unknown()).optional(),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Event recorded', content: { 'application/json': { schema: z.object({ data: BehaviorEvent }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'Agent not found', content: { 'application/json': { schema: ErrorResponse } } },
    429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Events'],
});

// ── Webhooks ──────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/v1/webhooks',
  summary: 'Register a webhook endpoint',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    body: {
      required: true,
      content: {
        'application/json': {
          schema: z.object({
            url: z.string().url().openapi({ example: 'https://yourservice.com/webhooks/kakunin' }),
            events: z.array(z.enum(['certificate.issued', 'certificate.revoked', 'risk.alert'])).min(1),
          }),
        },
      },
    },
  },
  responses: {
    201: { description: 'Webhook registered. Secret shown once — store it securely.', content: { 'application/json': { schema: z.object({ data: Webhook.extend({ secret: z.string(), secret_hint: z.string() }) }) } } },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Webhooks'],
});

registry.registerPath({
  method: 'get',
  path: '/v1/webhooks',
  summary: 'List webhooks',
  security: [{ [bearerAuth.name]: [] }],
  responses: {
    200: { description: 'Webhooks list', content: { 'application/json': { schema: z.object({ data: z.array(Webhook) }) } } },
  },
  tags: ['Webhooks'],
});

// ── Audit log ─────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/v1/audit-log',
  summary: 'Query audit log',
  security: [{ [bearerAuth.name]: [] }],
  request: {
    query: z.object({
      event_type: z.string().optional(),
      actor_type: z.enum(['user', 'agent', 'system']).optional(),
      before: z.string().datetime().optional(),
      limit: z.coerce.number().min(1).max(100).optional(),
    }),
  },
  responses: {
    200: { description: 'Audit log entries', content: { 'application/json': { schema: z.object({ data: z.array(AuditLog), next_cursor: z.string().nullable() }) } } },
  },
  tags: ['Audit'],
});

// ── CRL ───────────────────────────────────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/v1/crl',
  summary: 'Get Certificate Revocation List',
  description: 'Returns current CRL. Accept: application/pkix-crl for DER, text/plain for PEM.',
  responses: {
    200: { description: 'CRL in requested format' },
    503: { description: 'CRL not yet generated', content: { 'application/json': { schema: ErrorResponse } } },
  },
  tags: ['Certificates'],
});

// ── Generator ─────────────────────────────────────────────────────────────────

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'Kakunin API',
      version: '1.0.0',
      description: 'KYC compliance infrastructure for AI agents. Issues X.509 certificates, monitors behavioral events, and generates MiCA/EU AI Act compliance reports.',
      contact: { name: 'Kakunin Support', email: 'support@kakunin.ai', url: 'https://docs.kakunin.ai' },
      license: { name: 'Commercial', url: 'https://kakunin.ai/terms' },
    },
    externalDocs: {
      description: 'TypeScript SDK (@kakunin/sdk) — npm install @kakunin/sdk',
      url: 'https://www.npmjs.com/package/@kakunin/sdk',
    },
    servers: [
      { url: 'https://api.kakunin.ai', description: 'Production' },
      { url: 'http://localhost:3000', description: 'Local dev' },
    ],
    tags: [
      { name: 'Agents', description: 'Register and manage AI agents' },
      { name: 'Certificates', description: 'Issue, verify, and revoke X.509 certificates' },
      { name: 'Events', description: 'Ingest behavioral events and risk scores' },
      { name: 'Webhooks', description: 'Register and manage webhook endpoints' },
      { name: 'Audit', description: 'Query append-only audit log' },
    ],
  });
}
