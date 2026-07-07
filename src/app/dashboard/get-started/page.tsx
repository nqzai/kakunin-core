import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { GetStartedClient } from './GetStartedClient';
import { PromptGenerator } from './PromptGenerator';

/**
 * /dashboard/get-started
 *
 * 4-step onboarding guide that auto-tracks progress against real DB state.
 * Accessible even during trial (middleware skip-list includes this route).
 *
 * Steps (auto-completed when DB state confirms action taken):
 *   1. Create API key     → api_keys table has ≥1 active key
 *   2. Register agent     → agents table has ≥1 agent
 *   3. Issue certificate  → certificates table has ≥1 certificate
 *   4. Send first event   → behavior_events table has ≥1 event
 */
export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

const SNIPPETS = {
  registerAgent: {
    curl: `curl -X POST ${BASE_URL}/api/v1/agents \\
  -H "Authorization: Bearer {YOUR_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-first-agent",
    "description": "Production customer-facing agent"
  }'`,
    ts: `import { KakuninClient } from '@kakunin/sdk';

const kakunin = new KakuninClient({ apiKey: '{YOUR_API_KEY}' });

const agent = await kakunin.agents.create({
  name: 'my-first-agent',
  description: 'Production customer-facing agent',
});
console.log(agent.id); // store this agent ID`,
    python: `import kakunin

client = kakunin.Client(api_key="{YOUR_API_KEY}")

agent = client.agents.create(
    name="my-first-agent",
    description="Production customer-facing agent",
)
print(agent.id)  # store this agent ID`,
  },

  issueCert: {
    curl: `# Replace <agent_id> with the ID returned in step 2
curl -X POST ${BASE_URL}/api/v1/certificates \\
  -H "Authorization: Bearer {YOUR_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{ "agent_id": "<agent_id>" }'`,
    ts: `// Replace agentId with the ID returned in step 2
const cert = await kakunin.certificates.issue({ agentId });

console.log(cert.pem);        // X.509 PEM — attach to TLS context
console.log(cert.serialNumber); // for audit trails
console.log(cert.validUntil);  // expires in 365 days`,
    python: `# Replace agent_id with the ID returned in step 2
cert = client.certificates.issue(agent_id=agent_id)

print(cert.pem)          # X.509 PEM — attach to TLS context
print(cert.serial_number)  # for audit trails
print(cert.valid_until)    # expires in 365 days`,
  },

  sendEvent: {
    curl: `# Replace <agent_id> with your agent ID from step 2
curl -X POST ${BASE_URL}/api/v1/events \\
  -H "Authorization: Bearer {YOUR_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "<agent_id>",
    "action": "data_access",
    "resource": "customer-records",
    "metadata": { "records_accessed": 50 }
  }'`,
    ts: `// Instrument your agent to emit events
await kakunin.events.record({
  agentId,
  action: 'data_access',
  resource: 'customer-records',
  metadata: { records_accessed: 50 },
});
// Risk score computed automatically — high-risk events trigger alerts`,
    python: `# Instrument your agent to emit events
client.events.record(
    agent_id=agent_id,
    action="data_access",
    resource="customer-records",
    metadata={"records_accessed": 50},
)
# Risk score computed automatically — high-risk events trigger alerts`,
  },
};

export default async function GetStartedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const checkoutSuccess = sp.checkout === 'success';

  const context = await getDashboardRequestContext();
  if (!context) return null;

  const db = createServiceClient();

  // Default everything to not-done when tenant not found yet
  let hasApiKey = false;
  let hasAgent = false;
  let hasCert = false;
  let hasEvent = false;
  let apiKeyPrefix: string | null = null;

  if (context.tenantId) {
    const [apiKeyResult, agentResult, certResult, eventResult] = await Promise.all([
      db
        .from('api_keys')
        .select('id, key_prefix')
        .eq('tenant_id', context.tenantId)
        .is('revoked_at', null)
        .limit(1),
      db
        .from('agents')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId)
        .neq('status', 'deleted'),
      db
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId),
      db
        .from('behavior_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', context.tenantId),
    ]);

    hasApiKey = (apiKeyResult.data?.length ?? 0) > 0;
    hasAgent = (agentResult.count ?? 0) > 0;
    hasCert = (certResult.count ?? 0) > 0;
    hasEvent = (eventResult.count ?? 0) > 0;
    apiKeyPrefix = (apiKeyResult.data?.[0] as { key_prefix?: string } | undefined)?.key_prefix ?? null;
  }

  const steps = [
    {
      id: 1,
      title: 'Create an API key',
      description: 'Generate a key to authenticate SDK calls from your application.',
      done: hasApiKey,
      href: '/dashboard/api-keys',
      hrefLabel: 'Go to API Keys',
      snippets: {
        curl: `# API keys are created in the Console — no API endpoint required.
# Navigate to API Keys → "Create key", then copy the key shown once.
# Store it securely (e.g. AWS Secrets Manager, Doppler, or Vault).`,
        ts: `// API keys are created in the Console — no API endpoint required.
// Navigate to API Keys → "Create key", then copy the key shown once.
// Store it securely — e.g. in process.env.KAKUNIN_API_KEY`,
        python: `# API keys are created in the Console — no API endpoint required.
# Navigate to API Keys → "Create key", then copy the key shown once.
# Store it securely — e.g. in os.environ["KAKUNIN_API_KEY"]`,
      },
    },
    {
      id: 2,
      title: 'Register your first agent',
      description: 'Assign a cryptographic identity to each AI agent in your system.',
      done: hasAgent,
      href: '/dashboard/agents',
      hrefLabel: 'Go to Agents',
      snippets: SNIPPETS.registerAgent,
    },
    {
      id: 3,
      title: 'Issue an X.509 certificate',
      description: 'Bind a 365-day certificate to your agent — signed by Kakunin CA via AWS KMS.',
      done: hasCert,
      snippets: SNIPPETS.issueCert,
    },
    {
      id: 4,
      title: 'Send your first behaviour event',
      description: 'Stream agent actions — risk scores computed automatically, alerts fire on anomalies.',
      done: hasEvent,
      snippets: SNIPPETS.sendEvent,
    },
  ];

  return (
    <main className="dash-inner">
      <div className="dash-inner-head" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="dash-h1">Get started</h1>
          <p className="dash-sub">
            Four steps to issue your first X.509 certificate and start monitoring agent behaviour.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <PromptGenerator apiKeyPrefix={apiKeyPrefix} baseUrl={BASE_URL} />
      </div>

      <GetStartedClient
        steps={steps}
        checkoutSuccess={checkoutSuccess}
        apiKeyPrefix={apiKeyPrefix}
      />
    </main>
  );
}
