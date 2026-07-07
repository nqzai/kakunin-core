import Link from 'next/link';
import { getDashboardOverviewData, getDashboardRequestContext } from '@/lib/dashboard/server';

/**
 * Dashboard Console — main overview page.
 *
 * Topbar is rendered by dashboard/layout.tsx.
 * Left/right rails are rendered by DashRailLeft/DashRailRight in layout.tsx.
 * This page owns: center feed only.
 */
export const dynamic = 'force-dynamic';

// ── Helpers ────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
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

function eventIcon(eventType: string): { bg: string; color: string; symbol: string; led: string } {
  if (eventType.startsWith('certificate.')) {
    return { bg: 'var(--green)', color: 'var(--paper)', symbol: 'K', led: 'var(--green)' };
  }
  if (eventType.startsWith('agent.')) {
    return { bg: 'var(--ink)', color: 'var(--green-bright)', symbol: 'AG', led: 'var(--green)' };
  }
  if (eventType.includes('revok')) {
    return { bg: 'var(--red-soft)', color: '#7C201D', symbol: 'RV', led: 'var(--red)' };
  }
  if (eventType.startsWith('verify.rate_limited')) {
    return { bg: 'var(--amber-soft)', color: '#7E5314', symbol: 'RL', led: 'var(--amber)' };
  }
  return { bg: 'var(--paper-warm)', color: 'var(--ink)', symbol: '◆', led: 'var(--green)' };
}

// ── Page ───────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const context = await getDashboardRequestContext();

  if (!context) return null;

  if (!context.tenantId) {
    return <OnboardingPlaceholder userEmail={context.userEmail} />;
  }

  const overview = await getDashboardOverviewData(context.tenantId);
  const userInitials = initials(context.userName);

  return (
    <section className="dash-main">
        <div className="metric-strip">
          <div className="metric-card">
            <div className="mh">
              AGENTS TOTAL
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 4 7v5c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V7l-8-4Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </div>
            <div className="mv">{overview.totalAgents.toLocaleString()}</div>
            <div className="md">{overview.activeCerts} active certs</div>
            <svg className="spark" viewBox="0 0 60 22" preserveAspectRatio="none">
              <path className="spark-path" d="M0 15 L10 13 L20 11 L30 9 L40 8 L50 7 L60 6" />
            </svg>
          </div>

          <div className="metric-card">
            <div className="mh">
              ACTIVE CERTS
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2v20" /><circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <div className="mv">{overview.activeCerts.toLocaleString()}</div>
            <div className="md">X.509 · KMS-backed</div>
            <svg className="spark" viewBox="0 0 60 22" preserveAspectRatio="none">
              <path className="spark-path" d="M0 14 L10 13 L20 12 L30 11 L40 10 L50 9 L60 8" />
            </svg>
          </div>

          <div className="metric-card">
            <div className="mh">
              EVENTS / 24H
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
              </svg>
            </div>
            <div className="mv">{overview.eventsToday.toLocaleString()}</div>
            <div className="md">behavior events</div>
            <svg className="spark" viewBox="0 0 60 22" preserveAspectRatio="none">
              <path className="spark-path warn" d="M0 11 L10 14 L20 8 L30 13 L40 8 L50 13 L60 11" />
            </svg>
          </div>

          <div className="metric-card">
            <div className="mh">
              HIGH-RISK TODAY
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="m9 9 6 6" /><path d="m15 9-6 6" />
              </svg>
            </div>
            <div className="mv">{overview.highRiskCount}</div>
            <div className={`md${overview.highRiskCount > 0 ? ' neg' : ''}`}>
              {overview.highRiskCount > 0 ? '▲ requires review' : '● all clear'}
            </div>
            <svg className="spark" viewBox="0 0 60 22" preserveAspectRatio="none">
              <path className={`spark-path${overview.highRiskCount > 0 ? ' bad' : ''}`}
                d="M0 11 L10 11 L20 11 L30 11 L40 11 L50 11 L60 11" />
            </svg>
          </div>
        </div>

        <div className="composer">
          <div className="composer-top">
            <div className="composer-av">{userInitials}</div>
            <div className="composer-input">
              <span>Issue a new passport, scope a capability, or run an attestation…</span>
              <span className="chip">DRAG MANIFEST</span>
            </div>
          </div>
          <div className="composer-actions">
            <Link href="/dashboard/agents/new" className="composer-action is-primary">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 4 7v5c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V7l-8-4Z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              Issue passport
            </Link>
            <Link href="/dashboard/agents" className="composer-action is-amber">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <rect x="4" y="6" width="16" height="12" rx="2" /><path d="M4 10h16" />
              </svg>
              Scope capability
            </Link>
            <Link href="/dashboard/audit" className="composer-action">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 4h16v6H4z" /><path d="M4 14h16v6H4z" />
                <circle cx="7" cy="7" r="1" /><circle cx="7" cy="17" r="1" />
              </svg>
              Run attestation
            </Link>
          </div>
        </div>

        <div className="feed-sort">
          <span>LIVE FEED</span>
          <span className="line" />
          <span className="sort">
            Sort by: Recent
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </span>
        </div>

        {overview.auditEvents.length === 0 ? (
          <div className="feed-empty">
            <div className="feed-empty-icon">◆</div>
            <p>NO EVENTS YET · ISSUE YOUR FIRST PASSPORT TO SEE THE FEED</p>
          </div>
        ) : (
          overview.auditEvents.map((ev) => {
            const icon = eventIcon(ev.event_type);
            const isRevoke = ev.event_type.includes('revok');
            const isCert = ev.event_type.startsWith('certificate.');
            return (
              <article key={ev.id} className={`event${isRevoke ? ' is-breach' : ''}`}>
                <div className="event-head">
                  <div className="event-av" style={{ background: icon.bg, color: icon.color }}>
                    {icon.symbol}
                    <span className="led" style={{ background: icon.led }} />
                  </div>
                  <div className="event-meta">
                    <div className="event-name" style={isRevoke ? { color: 'var(--red)' } : {}}>
                      {ev.event_type}
                      {isCert && (
                        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
                          style={{ color: 'var(--green)', width: '12px', height: '12px' }}>
                          <path d="M12 2 4 5v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V5l-8-3Z" />
                        </svg>
                      )}
                    </div>
                    <div className="event-sub">{ev.description}</div>
                    <div className="event-ts">
                      <span>{ev.actor_type}:{ev.actor_id.slice(0, 8)}</span>
                      <span className="dot" />
                      <span>{relativeTime(ev.created_at)}</span>
                    </div>
                  </div>
                </div>

                {isCert && ev.affected_id && (
                  <div className="receipt">
                    <div className={`receipt-strip${isRevoke ? ' breach-strip' : ''}`}>
                      <span>{isRevoke ? 'REVOCATION RECORD · LOCKED' : 'ISSUANCE RECEIPT · KAKUNIN/EU-1'}</span>
                      <span>{ev.affected_id.slice(0, 12)}…</span>
                    </div>
                    <div className="receipt-grid">
                      <div className="receipt-cell">
                        <div className="rk">Event type</div>
                        <div className="rv">{ev.event_type}</div>
                      </div>
                      <div className="receipt-cell">
                        <div className="rk">Actor</div>
                        <div className="rv">{ev.actor_type}</div>
                      </div>
                      <div className="receipt-cell">
                        <div className="rk">Certificate ID</div>
                        <div className="rv">{ev.affected_id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="event-react">
                  <div className="er-left" style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                    LOGGED · KAKUNIN/EU-1
                  </div>
                  <span>{relativeTime(ev.created_at)}</span>
                </div>
                <div className="event-actions">
                  <Link href="/dashboard/audit" className="event-action">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 4h16v16H4z" /><path d="M8 8h8v8H8z" />
                    </svg>
                    Inspect
                  </Link>
                  {/* Only show View agent for agent.* events — affected_id is agent ID */}
                  {ev.affected_id && ev.event_type.startsWith('agent.') && (
                    <Link href={`/dashboard/agents/${ev.affected_id}`} className="event-action">
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="9" cy="9" r="3" /><path d="M3 19c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" />
                      </svg>
                      View agent
                    </Link>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
  );
}

// ── Onboarding placeholder ─────────────────────────────────────────────────

function OnboardingPlaceholder({ userEmail }: { userEmail: string }) {
  return (
    <main style={{ maxWidth: '640px', margin: '0 auto', padding: '120px 24px', textAlign: 'center' }}>
      <div style={{
        fontFamily: 'var(--ff-display)', fontSize: '32px',
        letterSpacing: '-0.02em', textTransform: 'uppercase', marginBottom: '16px',
      }}>
        Welcome to Kakunin
      </div>
      <p style={{ color: 'var(--ink-2)', marginBottom: '32px' }}>
        Signed in as <strong>{userEmail}</strong>. Your tenant account is being set up.
      </p>
      <p style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)' }}>
        If this persists, contact{' '}
        <a href="mailto:ai@kakunin.ai" style={{ color: 'var(--green)' }}>ai@kakunin.ai</a>
      </p>
    </main>
  );
}
