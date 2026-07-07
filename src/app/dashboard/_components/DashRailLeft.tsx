import Link from 'next/link';

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

interface DashRailLeftProps {
  userEmail: string;
  userName: string;
  tenantName: string | null;
  alertCount: number;
  totalAgents: number;
  activeCerts: number;
  eventsToday: number;
  activeAgents: Array<{ id: string; name: string; status: string; created_at: string }>;
}

export function DashRailLeft({
  userEmail,
  userName,
  tenantName,
  alertCount,
  totalAgents,
  activeCerts,
  eventsToday,
  activeAgents,
}: DashRailLeftProps) {
  const userInitials = initials(userName);
  const tenantInitials = initials(tenantName ?? 'T');

  const tenantScore = eventsToday > 0
    ? Math.max(0, Math.min(1, 1 - (alertCount / eventsToday) * 0.5))
    : 1.0;
  const tenantScoreDisplay = tenantScore.toFixed(2);
  const tenantScorePct = Math.round(tenantScore * 100);

  return (
    <aside className="rail-left">
      <div className="profile-card">
        <div className="profile-banner" />
        <div className="profile-body">
          <div className="profile-avatar">{userInitials}</div>
          <div className="profile-name">
            {userName}
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
              <path d="m9 12 2 2 4-4" stroke="white" fill="none" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="profile-role">Trust Operator · Issuer Admin</div>
          <div className="profile-org">{userEmail}</div>
          <div className="profile-tenant">
            <div className="tenant-mark">{tenantInitials}</div>
            <div className="shrink">
              <div style={{ fontWeight: 500 }}>{tenantName ?? 'My Tenant'}</div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                tenant · prod-eu
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-block">
        <div className="stat-row">
          <span className="sk">Agents under management</span>
          <span className="sv">{totalAgents.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="sk">Active certificates</span>
          <span className="sv">{activeCerts.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="sk">High-risk events today</span>
          <span className={`sv${alertCount > 0 ? ' neg' : ''}`}>{alertCount}</span>
        </div>
      </div>

      <div className="stat-block">
        <div className="trust-mini">
          <div className="tm-row">
            <span className="tm-lbl">Tenant trust</span>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--green-deep)' }}>LIVE</span>
          </div>
          <div className="tm-score">
            {tenantScoreDisplay}<span className="of">/1.00</span>
          </div>
          <div className="trust-bar" style={{ marginTop: '10px' }}>
            <div className="fill" style={{ width: `${tenantScorePct}%` }} />
          </div>
          <div className="tm-meta">
            <span>BASED ON 24H EVENTS</span>
            <span>{eventsToday} EVENTS</span>
          </div>
        </div>
      </div>

      <div className="fleet-list">
        <div className="fleet-head">
          <span className="fl-ttl">
            My agents{' '}
            <span style={{ fontFamily: 'var(--ff-mono)', color: 'var(--ink-3)', fontSize: '11px' }}>
              ({totalAgents})
            </span>
          </span>
          <Link href="/dashboard/agents" className="fl-count">manage →</Link>
        </div>
        {activeAgents.length === 0 && (
          <div style={{ padding: '16px 18px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
            No active agents yet.
          </div>
        )}
        {activeAgents.map((agent, i) => {
          const colors = ['var(--green-deep)', 'var(--ink)', 'var(--green)', 'var(--amber)'];
          return (
            <Link key={agent.id} href={`/dashboard/agents/${agent.id}`} className="fleet-row">
              <div className="fleet-mark" style={{ background: colors[i % colors.length] }}>
                {initials(agent.name)}
              </div>
              <div className="shrink">
                <div className="fl-name">{agent.name}</div>
                <div className="fl-sub">{agent.status} · {relativeTime(agent.created_at)}</div>
              </div>
              <span className="pill-mini">ok</span>
            </Link>
          );
        })}
        <Link href="/dashboard/agents" className="fleet-foot">
          <span>SHOW ALL AGENTS</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
