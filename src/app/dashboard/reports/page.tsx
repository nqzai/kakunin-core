import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getLimits } from '@/lib/quota/plan-limits';
import { ReportsClient } from './ReportsClient';

export const dynamic = 'force-dynamic';

/**
 * /dashboard/reports — compliance report management.
 *
 * Lists existing reports, allows generating new ones per plan quota.
 * Reports are LLM-generated (Claude Sonnet via OpenRouter) with rolling
 * 30/60/90-day behavioural analysis mapped to MiCA / ISO 27001 / NIST CSF.
 */
export default async function ReportsPage() {
  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();
  const planTier = context.planTier ?? 'pending';
  const limits = getLimits(planTier);

  const [agentsResult, reportsResult, flagsResult] = await Promise.all([
    db
      .from('agents')
      .select('id, name')
      .eq('tenant_id', context.tenantId)
      .neq('status', 'deleted')
      .order('created_at', { ascending: false }),
    db
      .from('compliance_reports')
      .select('id, title, status, period_start, period_end, created_at, pdf_url, agent_id')
      .eq('tenant_id', context.tenantId)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('feature_flags')
      .select('reports_enabled')
      .eq('tenant_id', context.tenantId)
      .maybeSingle(),
  ]);

  const agents = agentsResult.data ?? [];
  const reports = reportsResult.data ?? [];
  const reportsEnabled = flagsResult.data?.reports_enabled ?? false;

  return (
    <main className="dash-inner">
      <div className="dash-inner-head" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="dash-h1">Compliance Reports</h1>
          <p className="dash-sub">
            AI-generated · MiCA Art. 72 · ISO 27001 · NIST CSF mapping ·{' '}
            {reports.length} report{reports.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{
            padding: '5px 12px',
            background: reportsEnabled ? 'var(--green-paper)' : 'var(--paper-warm)',
            border: `1px solid ${reportsEnabled ? 'var(--green)' : 'var(--hairline)'}`,
            borderRadius: 'var(--r-pill)',
            fontFamily: 'var(--ff-mono)', fontSize: '10px',
            color: reportsEnabled ? 'var(--green-deep)' : 'var(--ink-3)',
            letterSpacing: '0.06em',
          }}>
            {reportsEnabled
              ? `${limits.reportsPerAgent === Infinity ? '∞' : limits.reportsPerAgent}/agent/mo`
              : 'UPGRADE TO UNLOCK'}
          </span>
        </div>
      </div>

      {/* What reports contain */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '12px', marginBottom: '24px',
      }}>
        {[
          { icon: '📊', label: 'Behavioural summary', desc: 'Risk band breakdown over selected window' },
          { icon: '🔐', label: 'Certificate status',  desc: 'Active certs, expiry, revocations' },
          { icon: '⚖️', label: 'MiCA Art. 72',        desc: 'Regulatory mapping + gap analysis' },
          { icon: '📋', label: 'ISO / NIST mapping',  desc: 'Optional standards framework output' },
          { icon: '📄', label: 'PDF export',          desc: 'Downloadable audit-ready document' },
        ].map(({ icon, label, desc }) => (
          <div key={label} style={{
            padding: '14px 16px',
            background: 'var(--card)', border: '1px solid var(--hairline)',
            borderRadius: 'var(--r-md)',
          }}>
            <div style={{ fontSize: '18px', marginBottom: '6px' }}>{icon}</div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '3px' }}>
              {label}
            </div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      <ReportsClient
        agents={agents}
        reports={reports}
        reportsEnabled={reportsEnabled}
        reportsPerAgent={isFinite(limits.reportsPerAgent) ? limits.reportsPerAgent : Infinity}
      />
    </main>
  );
}
