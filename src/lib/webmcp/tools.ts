/**
 * WebMCP Tool Definitions
 *
 * Exposes 3 Kakunin tools to browser-based AI agents via navigator.modelContext.
 * Calls local /api/webmcp/* routes authenticated by Supabase session cookie —
 * no API key required in the browser.
 *
 * Tools: verify_agent_scope · check_risk_score · audit_log_append
 */

export interface WebMCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => Promise<unknown>;
}

export function buildTools(): WebMCPTool[] {
  return [
    {
      name: 'verify_agent_scope',
      description:
        "Check if an AI agent is authorised to perform a specific action. Returns allowed:true/false based on agent status, certificate status, and financial scope. Call before executing any significant action.",
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Agent ID',
          },
          action: {
            type: 'string',
            description: 'Action to verify',
          },
        },
        required: ['agent_id', 'action'],
      },
      async execute(input: unknown) {
        const { agent_id, action } = input as { agent_id: string; action: string };
        const res = await fetch(
          `/api/webmcp/verify-scope?agent_id=${encodeURIComponent(agent_id)}&action=${encodeURIComponent(action)}`
        );
        return res.json();
      },
    },

    {
      name: 'check_risk_score',
      description:
        'Get the rolling 30-day behavioral risk profile for an AI agent. Returns risk_score (0–1), risk_band (low/medium/high), and canonical raw risk metadata.',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Agent ID',
          },
        },
        required: ['agent_id'],
      },
      async execute(input: unknown) {
        const { agent_id } = input as { agent_id: string };
        const res = await fetch(
          `/api/webmcp/risk-score?agent_id=${encodeURIComponent(agent_id)}`
        );
        return res.json();
      },
    },

    {
      name: 'audit_log_append',
      description:
        'Append a behavioral event to the immutable audit trail. Call after every significant action. Events contribute to the rolling risk score.',
      inputSchema: {
        type: 'object',
        properties: {
          agent_id: {
            type: 'string',
            description: 'Agent ID',
          },
          action_type: {
            type: 'string',
            description: 'Type of action performed',
            enum: [
              'data_access',
              'trade_execution',
              'authentication',
              'report_generation',
              'user_interaction',
              'api_call',
              'model_inference',
              'data_mutation',
              'transaction_initiated',
              'authentication_attempt',
              'transaction_anomaly',
              'unauthorized_access_attempt',
              'message_signed',
              'message_verification_failed',
            ],
          },
          metadata: {
            type: 'object',
            description: 'Additional context about the action',
          },
        },
        required: ['agent_id', 'action_type'],
      },
      async execute(input: unknown) {
        const { agent_id, action_type, metadata = {} } = input as {
          agent_id: string;
          action_type: string;
          metadata?: Record<string, unknown>;
        };
        const res = await fetch('/api/webmcp/audit-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent_id, action_type, metadata }),
        });
        return res.json();
      },
    },
  ];
}
