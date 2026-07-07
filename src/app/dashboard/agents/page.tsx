import Link from 'next/link';
import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AgentsTable } from './AgentsTable';
import type { Database } from '@/types/database';

type CertRow = Pick<Database['public']['Tables']['certificates']['Row'],
  'agent_id' | 'status' | 'serial_number' | 'issued_at' | 'expires_at'>;
type EventRow = Pick<Database['public']['Tables']['behavior_events']['Row'],
  'agent_id' | 'risk_score' | 'risk_band' | 'occurred_at'>;

/**
 * /dashboard/agents — full agent registry table.
 * Server component; topbar is handled by dashboard/layout.tsx.
 */
export const dynamic = 'force-dynamic';


export default async function AgentsPage() {
  const context = await getDashboardRequestContext();
  if (!context) return null;

  const db = createServiceClient();
  const tenantId = context.tenantId;

  const agents = tenantId
    ? (await db
        .from('agents')
        .select('id, name, status, model, model_hash, version, inbox_address, inbox_status, created_at, updated_at, metadata')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
      ).data ?? []
    : [];

  // Fetch latest cert + latest behavior event per agent in parallel
  const agentIds = agents.map((a) => a.id);

  const [certsRes, eventsRes] = agentIds.length > 0
    ? await Promise.all([
        db.from('certificates')
          .select('agent_id, status, serial_number, issued_at, expires_at')
          .in('agent_id', agentIds)
          .eq('status', 'active')
          .order('issued_at', { ascending: false }),
        db.from('behavior_events')
          .select('agent_id, risk_score, risk_band, occurred_at')
          .in('agent_id', agentIds)
          .order('occurred_at', { ascending: false })
          .limit(agentIds.length * 3),
      ])
    : [{ data: [] }, { data: [] }];

  // Index by agent_id (take first — most recent)
  const certByAgent = new Map<string, CertRow>();
  ((certsRes.data ?? []) as CertRow[]).forEach((c) => {
    if (!certByAgent.has(c.agent_id)) certByAgent.set(c.agent_id, c);
  });

  const eventByAgent = new Map<string, EventRow>();
  ((eventsRes.data ?? []) as EventRow[]).forEach((e) => {
    if (!eventByAgent.has(e.agent_id)) eventByAgent.set(e.agent_id, e);
  });

  const bgColors = ['var(--green-deep)', 'var(--ink)', 'var(--green)', 'var(--amber)'];

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Agent Registry</h1>
          <p className="dash-sub">All AI agents under this tenant · {agents.length} total</p>
        </div>
        <Link href="/dashboard/agents/new" className="btn-primary">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
          Register agent
        </Link>
      </div>

      {agents.length === 0 ? (
        /* Skeleton wireframe — shows what the table looks like when populated */
        <div>
          <div style={{
            marginBottom: '16px', padding: '14px 18px',
            background: 'var(--green-paper)', border: '1px solid var(--green)',
            borderRadius: 'var(--r-md)', display: 'flex', gap: '12px', alignItems: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--green)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" />
            </svg>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--green-deep)', marginBottom: '2px' }}>
                No agents yet — here&apos;s what your registry will look like
              </div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--green-deep)', opacity: 0.8 }}>
                Register your first agent to issue an X.509 certificate and start monitoring behaviour.
              </div>
            </div>
            <Link href="/dashboard/agents/new" className="btn-primary" style={{ flexShrink: 0 }}>
              Register first agent
            </Link>
          </div>
          <div className="agents-table-wrap" style={{ opacity: 0.45, pointerEvents: 'none' }}>
            <table className="agents-table">
              <thead>
                <tr>
                  {['Agent', 'Status', 'Certificate', 'Risk', 'Model', 'Registered', ''].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { w1: 140, w2: 80, pill: 60, risk: 70, mdl: 60 },
                  { w1: 110, w2: 95, pill: 55, risk: 80, mdl: 70 },
                  { w1: 130, w2: 75, pill: 65, risk: 60, mdl: 55 },
                  { w1: 100, w2: 85, pill: 50, risk: 75, mdl: 65 },
                ].map((s, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div className="skel skel-avatar" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div className="skel skel-line-lg" style={{ width: s.w1 }} />
                          <div className="skel skel-line-sm" style={{ width: s.w2 }} />
                        </div>
                      </div>
                    </td>
                    <td><div className="skel skel-pill" style={{ width: s.pill }} /></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div className="skel skel-line-sm" />
                        <div className="skel skel-line-xs" />
                      </div>
                    </td>
                    <td><div className="skel skel-pill" style={{ width: s.risk }} /></td>
                    <td><div className="skel skel-line-xs" style={{ width: s.mdl }} /></td>
                    <td><div className="skel skel-line-xs" /></td>
                    <td><div className="skel skel-badge" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <AgentsTable
          agents={agents as Parameters<typeof AgentsTable>[0]['agents']}
          certByAgent={Object.fromEntries(certByAgent.entries())}
          eventByAgent={Object.fromEntries(eventByAgent.entries())}
          bgColors={bgColors}
        />
      )}
    </main>
  );
}
