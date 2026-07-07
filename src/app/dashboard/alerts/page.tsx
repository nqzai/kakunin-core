import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type AlertEventRow = Pick<
  Database['public']['Tables']['behavior_events']['Row'],
  'id' | 'agent_id' | 'action_type' | 'risk_score' | 'risk_band' | 'occurred_at'
> & {
  agent: { name: string } | null;
};

const BAND_COLOR: Record<string, string> = {
  high:   'var(--red)',
  medium: 'var(--amber)',
  low:    'var(--green)',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default async function AlertsPage() {
  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();

  // Last 7 days of high + medium risk events
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: events } = await db
    .from('behavior_events')
    .select('id, agent_id, action_type, risk_score, risk_band, occurred_at, agent:agents(name)')
    .eq('tenant_id', context.tenantId)
    .in('risk_band', ['high', 'medium'])
    .gte('occurred_at', since)
    .order('occurred_at', { ascending: false })
    .limit(100);

  const alertEvents = (events ?? []) as AlertEventRow[];
  const highCount = alertEvents.filter((event) => event.risk_band === 'high').length;
  const medCount  = alertEvents.filter((event) => event.risk_band === 'medium').length;

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Alerts</h1>
          <p className="dash-sub">High and medium risk behavior events · last 7 days</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {highCount > 0 && (
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: 'var(--red-soft)', color: 'var(--red)',
              fontFamily: 'var(--ff-mono)', fontSize: '11px', fontWeight: 600,
            }}>
              {highCount} high
            </span>
          )}
          {medCount > 0 && (
            <span style={{
              padding: '4px 12px', borderRadius: '20px',
              background: 'var(--paper-warm)', color: 'var(--amber)',
              fontFamily: 'var(--ff-mono)', fontSize: '11px', fontWeight: 600,
            }}>
              {medCount} medium
            </span>
          )}
        </div>
      </div>

      {alertEvents.length === 0 ? (
        <div>
          <div style={{
            marginBottom: '16px', padding: '14px 18px',
            background: 'var(--green-paper)', border: '1px solid var(--green)',
            borderRadius: 'var(--r-md)', display: 'flex', gap: '12px', alignItems: 'center',
          }}>
            <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--green)', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
            </svg>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--green-deep)' }}>
              <strong>All clear</strong> — no high or medium risk events in the last 7 days.
              Alerts appear here when agent behaviour exceeds risk thresholds.
            </div>
          </div>
          <div className="agents-table-wrap" style={{ opacity: 0.4, pointerEvents: 'none' }}>
            <table className="agents-table">
              <thead>
                <tr>
                  {['Risk', 'Action type', 'Agent', 'Score', 'When'].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { band: 'high',   color: 'var(--red)',   bw: 38, aw: 120, sw: 40, tw: 60 },
                  { band: 'medium', color: 'var(--amber)', bw: 55, aw: 100, sw: 40, tw: 55 },
                  { band: 'high',   color: 'var(--red)',   bw: 38, aw: 110, sw: 40, tw: 70 },
                  { band: 'medium', color: 'var(--amber)', bw: 55, aw: 130, sw: 40, tw: 50 },
                ].map((s, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                        <div className="skel skel-line-sm" style={{ width: s.bw }} />
                      </div>
                    </td>
                    <td><div className="skel skel-line-lg" style={{ width: s.aw }} /></td>
                    <td><div className="skel skel-line-sm" style={{ width: 90 }} /></td>
                    <td><div className="skel skel-line-xs" style={{ width: s.sw }} /></td>
                    <td><div className="skel skel-line-xs" style={{ width: s.tw }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="agents-table-wrap">
          <table className="agents-table">
            <thead>
              <tr>
                <th>Risk</th>
                <th>Action type</th>
                <th>Agent</th>
                <th>Score</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {alertEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      fontFamily: 'var(--ff-mono)', fontSize: '11px',
                      color: BAND_COLOR[event.risk_band] ?? 'var(--ink-2)',
                      fontWeight: 600,
                    }}>
                      <span style={{
                        width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                        background: BAND_COLOR[event.risk_band] ?? 'var(--ink-3)',
                      }} />
                      {event.risk_band.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px' }}>
                    {event.action_type}
                  </td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
                    {event.agent?.name ?? event.agent_id.slice(0, 8) + '…'}
                  </td>
                  <td style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '12px',
                    color: event.risk_score >= 0.85 ? 'var(--red)' : 'var(--amber)',
                    fontWeight: 600,
                  }}>
                    {event.risk_score.toFixed(3)}
                  </td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                    {relativeTime(event.occurred_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
