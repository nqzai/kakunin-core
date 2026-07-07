import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { DeveloperClient } from './DeveloperClient';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';

/**
 * /dashboard/developer — developer quickstart, MCP config, webhooks, API reference.
 * Persists across navigation (unlike get-started which disappears after onboarding).
 */
export default async function DeveloperPage() {
  const context = await getDashboardRequestContext();
  if (!context) return null;

  const db = createServiceClient();

  let apiKeyPrefix: string | null = null;
  let agentId: string | null = null;
  let webhookSecret: string | null = null;

  if (context.tenantId) {
    const [keyResult, agentResult, webhookResult] = await Promise.all([
      db
        .from('api_keys')
        .select('key_prefix')
        .eq('tenant_id', context.tenantId)
        .is('revoked_at', null)
        .limit(1),
      db
        .from('agents')
        .select('id')
        .eq('tenant_id', context.tenantId)
        .neq('status', 'deleted')
        .limit(1),
      db
        .from('webhooks')
        .select('signing_secret')
        .eq('tenant_id', context.tenantId)
        .limit(1),
    ]);

    apiKeyPrefix = (keyResult.data?.[0] as { key_prefix?: string } | undefined)?.key_prefix ?? null;
    agentId = (agentResult.data?.[0] as { id?: string } | undefined)?.id ?? null;
    webhookSecret = (webhookResult.data?.[0] as { signing_secret?: string } | undefined)?.signing_secret ?? null;
  }

  return (
    <main className="dash-inner">
      <div className="dash-inner-head" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="dash-h1">Developer</h1>
          <p className="dash-sub">
            SDK quickstart · MCP server config · Webhook verification · API reference
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <a
            href="/api-docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--ff-mono)', fontSize: '11px',
              color: 'var(--ink-2)', textDecoration: 'none',
              border: '1px solid var(--hairline-2)', padding: '8px 14px',
              borderRadius: 'var(--r-sm)', background: 'var(--card)',
            }}
          >
            OpenAPI →
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--ff-mono)', fontSize: '11px',
              color: 'var(--paper)', textDecoration: 'none',
              border: 'none', padding: '8px 14px',
              borderRadius: 'var(--r-sm)', background: 'var(--green)',
            }}
          >
            Full docs →
          </a>
        </div>
      </div>

      {/* SDK install strip */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)', padding: '14px 20px',
        marginBottom: '24px',
        display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap',
      }}>
        {[
          { pkg: '@kakunin/sdk', desc: 'TypeScript / Node.js SDK', cmd: 'npm install @kakunin/sdk' },
          { pkg: '@kakunin/mcp', desc: 'MCP server (Claude Desktop, Cursor)', cmd: 'npm install @kakunin/mcp' },
          { pkg: '@kakunin/sdk/verify', desc: 'Acceptance-side middleware', cmd: 'npm install @kakunin/sdk' },
        ].map(({ pkg, desc, cmd }) => (
          <div key={pkg} style={{ display: 'flex', gap: '12px', alignItems: 'center', flex: '1 1 260px' }}>
            <div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink)', fontWeight: 600 }}>
                {pkg}
              </div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px' }}>
                {desc}
              </div>
            </div>
            <div style={{
              marginLeft: 'auto',
              background: '#0f1117', borderRadius: 'var(--r-xs)',
              padding: '6px 12px',
              fontFamily: 'var(--ff-mono)', fontSize: '11px', color: '#86efac',
              whiteSpace: 'nowrap',
            }}>
              {cmd}
            </div>
          </div>
        ))}
      </div>

      <DeveloperClient
        apiKeyPrefix={apiKeyPrefix}
        agentId={agentId}
        baseUrl={BASE_URL}
        webhookSecret={webhookSecret}
      />
    </main>
  );
}
