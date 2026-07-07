import { NextResponse } from 'next/server';

// MCP Server Card — SEP-1649 / modelcontextprotocol.io
// Advertises Kakunin's agent verification capabilities to AI IDEs and orchestrators.
// Checked by isitagentready.com and consumed by Cursor, Claude, Copilot, etc.
export const dynamic = 'force-static';

const BASE = 'https://www.kakunin.ai';

export function GET() {
  const serverCard = {
    serverInfo: {
      name: 'Kakunin Compliance Agent',
      version: '1.0.0',
      description:
        'AI agent identity verification and compliance infrastructure. Issues X.509 certificates to autonomous agents, checks behavioral risk scores, and produces regulator-ready audit trails for the EU AI Act and MiCA.',
      homepage: BASE,
      documentation: `${BASE}/docs`,
      contact: 'ai@kakunin.ai',
    },
    url: `${BASE}/api/mcp`,
    transport: {
      type: 'streamable-http',
      endpoint: `${BASE}/api/mcp`,
    },
    capabilities: {
      tools: true,
      resources: false,
      prompts: false,
    },
    tools: [
      {
        name: 'verify_agent_certificate',
        description:
          'Verify the X.509 certificate of an autonomous agent. Returns certificate status, scope, expiry, and revocation state.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: {
              type: 'string',
              description: 'The DID or certificate serial number of the agent to verify.',
            },
          },
          required: ['agent_id'],
        },
      },
      {
        name: 'get_compliance_report',
        description:
          'Retrieve a regulator-ready compliance audit report for an agent session. Includes behavior logs, risk score history, and EU AI Act Article 12 audit records.',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: {
              type: 'string',
              description: 'The agent session ID to fetch the compliance report for.',
            },
            format: {
              type: 'string',
              enum: ['json', 'pdf'],
              description: 'Output format for the compliance report.',
            },
          },
          required: ['session_id'],
        },
      },
      {
        name: 'check_agent_scope',
        description:
          'Check whether a specific agent action is within the permitted scope defined in its active certificate.',
        inputSchema: {
          type: 'object',
          properties: {
            agent_id: { type: 'string', description: 'Agent DID or certificate serial.' },
            action: {
              type: 'string',
              description: 'The action to check, e.g. "financial_trade", "data_read", "api_call".',
            },
          },
          required: ['agent_id', 'action'],
        },
      },
    ],
    authentication: {
      type: 'bearer',
      description: 'API key passed as Authorization: Bearer <key>. Obtain at https://kakunin.ai/dashboard.',
    },
    legal: {
      privacyPolicy: `${BASE}/privacy`,
      termsOfService: `${BASE}/terms`,
    },
  };

  return new NextResponse(JSON.stringify(serverCard, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}
