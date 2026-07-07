import Link from 'next/link';

interface DashRailRightProps {
  alertCount: number;
  trustSignals: Array<{
    title: string;
    url: string;
    source: string | null;
    published_at: string | null;
    risk_cls: string | null;
  }>;
  activeCerts: number;
  totalAgents: number;
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

export function DashRailRight({
  alertCount,
  trustSignals,
  activeCerts,
  totalAgents,
}: DashRailRightProps) {
  return (
    <aside className="rail-right">
      <div className="signals-card">
        <div className="signals-head">
          <span className="sg-ttl">Trust signals</span>
          <span className="sg-info">i</span>
        </div>
        <div className="signals-sub">TOP STORIES · ECOSYSTEM</div>

        {trustSignals.length === 0 ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
          }}>
            Loading signals… refreshes every 6h
          </div>
        ) : trustSignals.map((s) => {
          const cls = s.risk_cls === 'critical' ? 'is-red'
            : s.risk_cls === 'warning' ? 'is-amber' : '';
          const age = s.published_at ? relativeTime(s.published_at) : '';
          const meta = [age, s.source].filter(Boolean).join(' · ');
          return (
            <a key={s.url} href={s.url} className={`signal-row${cls ? ` ${cls}` : ''}`}
              target="_blank" rel="noopener noreferrer">
              <span className="sg-glyph" />
              <div>
                <div className="sg-ttl">{s.title}</div>
                {meta && <div className="sg-meta">{meta}</div>}
              </div>
            </a>
          );
        })}

        <Link href="/docs" className="signals-foot">
          Show more signals
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
        </Link>
      </div>

      <div className="pending-card">
        <div className="pending-head">Awaiting review</div>
        {alertCount === 0 ? (
          <div className="pending-empty">No pending reviews · all clear</div>
        ) : (
          <Link href="/dashboard/alerts" className="pending-row review">
            <div className="pending-mark">⚑</div>
            <div className="shrink">
              <div className="pr-ttl">{alertCount} high-risk event{alertCount !== 1 ? 's' : ''}</div>
              <div className="pr-meta">SLA · 4h · review required</div>
            </div>
            <span className="pr-cta">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </Link>
        )}
        {activeCerts === 0 && totalAgents > 0 && (
          <Link href="/dashboard/agents" className="pending-row">
            <div className="pending-mark">∎</div>
            <div className="shrink">
              <div className="pr-ttl">Agents without certificates</div>
              <div className="pr-meta">{totalAgents} agent{totalAgents !== 1 ? 's' : ''} · issue passports</div>
            </div>
            <span className="pr-cta">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
              </svg>
            </span>
          </Link>
        )}
      </div>

      <div className="promo">
        <div className="promo-eyebrow">EXPLORE · QUICK START</div>
        <h4>Register your first AI agent</h4>
        <p>Issue an X.509 identity, scope capabilities, and start behavioral monitoring in under 2 minutes.</p>
        <Link href="/dashboard/agents/new" className="promo-cta">
          Register agent
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
          </svg>
        </Link>
      </div>

      <div className="footnav">
        <Link href="/docs">Docs</Link> ·{' '}
        <Link href="/test-results">Test results</Link> ·{' '}
        <Link href="/pricing">Pricing</Link>
        <div className="fn-copy">
          <span className="fn-m">K</span>
          <span>Kakunin · v0.9 · eu-1</span>
        </div>
      </div>
    </aside>
  );
}
