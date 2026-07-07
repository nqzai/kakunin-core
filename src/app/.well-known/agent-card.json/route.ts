import { NextResponse } from 'next/server';

// A2A Agent Card — a2a-protocol.org spec v0.2.6
// Describes Kakunin as a compliance verification agent for agent-to-agent discovery.
// Checked by isitagentready.com for a2aAgentCard compliance.
export const dynamic = 'force-static';

const BASE = 'https://kakunin.ai';

export function GET() {
  const agentCard = {
    // A2A spec v0.2.6 required fields
    protocolVersion: '0.2.6',
    name: 'Kakunin Compliance Agent',
    version: '1.0.0',
    description:
      'Kakunin provides cryptographic identity (X.509 certificates), behavioral risk scoring, and regulator-ready audit trails for autonomous AI agents. Operates as a compliance verification agent for EU AI Act (Articles 12, 13) and MiCA requirements.',
    url: `${BASE}/api/v1`,
    documentationUrl: `${BASE}/docs`,
    iconUrl: `${BASE}/logo.png`,
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['application/json'],
    contact: {
      email: 'ai@kakunin.ai',
    },
    provider: {
      organization: 'Kakunin',
      url: BASE,
    },
    capabilities: {
      streaming: false,
      pushNotifications: false,
      stateTransitionHistory: true,
      multimodal: false,
    },
    skills: [
      {
        id: 'verify-agent-certificate',
        name: 'Verify Agent Certificate',
        description:
          'Verify the X.509 certificate of an autonomous agent. Returns certificate validity, scope permissions, and revocation status.',
        tags: ['compliance', 'identity', 'x509', 'verification'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
        examples: [
          'Verify the certificate for agent did:kakunin:trader-001',
          'Check if agent session abc123 has permission to execute financial trades',
        ],
      },
      {
        id: 'get-compliance-report',
        name: 'Generate Compliance Report',
        description:
          'Generate a regulator-ready compliance audit report for an agent session, mapping actions to EU AI Act Article 12 logging requirements.',
        tags: ['compliance', 'audit', 'eu-ai-act', 'mica', 'reporting'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json', 'application/pdf'],
        examples: [
          'Generate an Article 12 compliance report for agent session xyz789',
          'Export audit logs for the last 30 days for compliance officer review',
        ],
      },
      {
        id: 'check-agent-scope',
        name: 'Check Agent Action Scope',
        description:
          'Determine whether a specific agent action is within the permitted scope defined in its active certificate before execution.',
        tags: ['compliance', 'authorization', 'scope', 'guardrails'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
        examples: [
          'Can agent did:kakunin:agent-001 execute a financial_trade action?',
          'Is the data_write action authorized for this agent certificate?',
        ],
      },
      {
        id: 'risk-score-check',
        name: 'Behavioral Risk Score Check',
        description:
          'Return the current behavioral risk score for an agent. Scores above 0.85 trigger automatic certificate throttling.',
        tags: ['risk', 'behavioral-monitoring', 'safety', 'operational'],
        inputModes: ['text/plain', 'application/json'],
        outputModes: ['application/json'],
        examples: [
          'What is the current risk score for agent trader-001?',
          'Is agent fleet abc showing anomalous behavior?',
        ],
      },
    ],
    supportedInterfaces: [
      {
        type: 'REST',
        url: `${BASE}/api/v1`,
        documentation: `${BASE}/docs/api`,
      },
      {
        type: 'MCP',
        url: `${BASE}/api/mcp`,
        documentation: `${BASE}/docs/mcp`,
      },
    ],
    authentication: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'API key passed as Authorization: Bearer <key>. Obtain at https://kakunin.ai/dashboard.',
        },
      },
      required: ['bearerAuth'],
    },
    legal: {
      privacyPolicy: `${BASE}/privacy`,
      termsOfService: `${BASE}/terms`,
      licenseUrl: null,
    },
    standards: ['EU AI Act Article 12', 'MiCA Article 72', 'W3C DID Core', 'X.509 RFC 5280', 'A2A Protocol v0.2.6'],
  };

  return new NextResponse(JSON.stringify(agentCard, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
