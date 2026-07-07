import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { EventFeed } from './EventFeed';
import { CertifyButton } from './CertifyButton';

/**
 * /dashboard/agents/[id] — agent detail page.
 *
 * Server component fetches: agent, latest cert, recent behavior events,
 * then hands behavior events to the client-side EventFeed for Realtime.
 *
 * Acceptance criteria (RA-31):
 * - Realtime feed updates without page refresh (EventFeed client component)
 * - Risk gauge reflects latest behavior_event risk_score
 * - Cert revocation reflects immediately (force-dynamic)
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

function riskColor(band: string) {
  if (band === 'high') return 'var(--red)';
  if (band === 'medium') return 'var(--amber)';
  return 'var(--green)';
}

function riskPillCls(band: string) {
  if (band === 'high') return 'fail';
  if (band === 'medium') return 'warn';
  return '';
}

function certStatusStyle(status: string): { bg: string; color: string } {
  if (status === 'active') return { bg: 'var(--green-paper)', color: 'var(--green-deep)' };
  if (status === 'revoked') return { bg: 'var(--red-soft)', color: '#7C201D' };
  return { bg: 'var(--amber-soft)', color: '#7E5314' };
}

function initials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default async function AgentDetailPage({ params }: PageProps) {
  const { id } = await params;

  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();

  // Fetch agent — enforce tenant scope
  const { data: agent } = await db
    .from('agents')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (!agent) return notFound();

  // Parallel: latest active cert + recent behavior events
  const [certRes, eventsRes, allCertsCountRes] = await Promise.all([
    db.from('certificates')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', context.tenantId)
      .order('issued_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.from('behavior_events')
      .select('*')
      .eq('agent_id', id)
      .eq('tenant_id', context.tenantId)
      .order('occurred_at', { ascending: false })
      .limit(20),
    db.from('certificates')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', id)
      .eq('tenant_id', context.tenantId),
  ]);

  const cert = certRes.data;
  const recentEvents = eventsRes.data ?? [];
  const totalCerts = allCertsCountRes.count ?? 0;

  const latestEvent = recentEvents[0];
  const riskScore = latestEvent?.risk_score ?? null;
  const riskBand = latestEvent?.risk_band ?? 'low';
  // riskPct reserved for future progress bar enhancement

  const agentInitials = initials(agent.name);

  // Redact PEM — show first + last line only
  function redactPem(pem: string): string {
    const lines = pem.trim().split('\n');
    if (lines.length <= 3) return pem;
    return `${lines[0]}\n  … ${lines.length - 2} lines redacted …\n${lines[lines.length - 1]}`;
  }

  return (
    <main className="dash-inner">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/dashboard">Console</Link>
        <span>›</span>
        <Link href="/dashboard/agents">Agents</Link>
        <span>›</span>
        <span>{agent.name}</span>
      </div>

      {/* Agent header */}
      <div className="agent-hero">
        <div className="agent-hero-av" style={{
          background: agent.status === 'active' ? 'var(--green)' : 'var(--ink)',
        }}>
          {agentInitials}
          <span className="agent-hero-led" style={{
            background: agent.status === 'active' ? 'var(--green)' : 'var(--red)',
          }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="dash-h1" style={{ margin: 0 }}>{agent.name}</h1>
            <span className={`pill-mini${agent.status !== 'active' ? ' fail' : ''}`}>
              {agent.status}
            </span>
            {agent.version && (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                v{agent.version}
              </span>
            )}
          </div>
          {agent.description && (
            <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', fontSize: '14px' }}>
              {agent.description}
            </p>
          )}
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', flexWrap: 'wrap' }}>
            {agent.model && (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                MODEL · {agent.model}
              </span>
            )}
            {agent.inbox_address && agent.inbox_status !== 'failed' && (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                INBOX · {agent.inbox_address}
              </span>
            )}
            {agent.inbox_status === 'provisioning' && !agent.inbox_address && (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--amber)' }}>
                ◌ INBOX PROVISIONING…
              </span>
            )}
            {agent.inbox_status === 'failed' && (
              <span style={{
                fontFamily: 'var(--ff-mono)', fontSize: '11px',
                color: '#7C201D', background: 'var(--red-soft)',
                padding: '2px 8px', borderRadius: '4px',
              }}>
                ⚠ INBOX PROVISIONING FAILED — check audit log
              </span>
            )}
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              ID · {agent.id.slice(0, 12)}…
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <Link href="/dashboard/agents" className="btn-ghost">← Back</Link>
          <button className="btn-danger" disabled>Revoke</button>
        </div>
      </div>

      {/* 2-col detail layout */}
      <div className="detail-grid">

        {/* LEFT: Cert + Risk */}
        <div style={{ display: 'grid', gap: '20px' }}>

          {/* Certificate card */}
          <div className="card">
            <div className="card-head">
              <h3>X.509 Certificate</h3>
              <span className="more">{totalCerts} total</span>
            </div>

            {!cert ? (
              <div style={{ padding: '24px 18px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 16px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
                  NO ACTIVE CERTIFICATE · ISSUE PASSPORT TO REGISTER
                </p>
                <CertifyButton agentId={agent.id} />
              </div>
            ) : (
              <div>
                {/* Status row */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 18px', background: 'var(--paper)',
                  borderBottom: '1px solid var(--paper-edge)',
                }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
                    STATUS
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600,
                      color: certStatusStyle(cert.status).color,
                    }}
                  >
                    {cert.status.toUpperCase()}
                  </span>
                </div>

                {/* Cert fields */}
                {[
                  { k: 'Serial', v: cert.serial_number },
                  { k: 'Issued', v: fmtDate(cert.issued_at) },
                  { k: 'Expires', v: fmtDate(cert.expires_at) },
                  { k: 'KMS ARN', v: cert.kms_key_arn.replace(/^arn:aws:kms:[^:]+:[^:]+:key\/(.{8}).*/, 'arn:aws:kms:…/$1…') },
                ].map(({ k, v }) => (
                  <div key={k} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr',
                    gap: '12px', padding: '10px 18px',
                    borderBottom: '1px dashed var(--paper-edge)',
                    fontFamily: 'var(--ff-mono)', fontSize: '12px',
                  }}>
                    <span style={{ color: 'var(--ink-3)', textTransform: 'uppercase',
                      fontSize: '10px', letterSpacing: '0.06em', paddingTop: '1px' }}>
                      {k}
                    </span>
                    <span style={{ color: 'var(--ink)', wordBreak: 'break-all' }}>{v}</span>
                  </div>
                ))}

                {/* PEM — redacted */}
                <div style={{ padding: '12px 18px', borderTop: '1px solid var(--paper-edge)' }}>
                  <div style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: 'var(--ink-3)', marginBottom: '8px',
                  }}>
                    Certificate PEM (redacted)
                  </div>
                  <pre style={{
                    margin: 0, padding: '10px 12px',
                    background: 'var(--paper)',
                    borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    color: 'var(--ink-2)', lineHeight: 1.5,
                    whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                    border: '1px solid var(--paper-edge)',
                  }}>
                    {redactPem(cert.certificate_pem)}
                  </pre>
                </div>

                {cert.revoked_at && (
                  <div style={{
                    padding: '10px 18px',
                    background: 'rgba(216,81,75,0.06)',
                    borderTop: '1px solid var(--red-soft)',
                    fontFamily: 'var(--ff-mono)', fontSize: '11px',
                    color: 'var(--red)',
                  }}>
                    REVOKED · {fmtDate(cert.revoked_at)}
                    {cert.revocation_reason && ` · ${cert.revocation_reason}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Risk gauge */}
          <div className="card">
            <div className="card-head">
              <h3>Risk Score</h3>
              <span className="more">latest event</span>
            </div>

            {riskScore === null ? (
              <div style={{ padding: '24px 18px', textAlign: 'center',
                color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
                NO BEHAVIOR EVENTS YET
              </div>
            ) : (
              <div style={{ padding: '18px' }}>
                {/* Score circle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                    <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                      <circle cx="50" cy="50" r="42"
                        stroke="rgba(20,24,27,0.08)" strokeWidth="8" fill="none" />
                      <circle cx="50" cy="50" r="42"
                        stroke={riskColor(riskBand)} strokeWidth="8" fill="none"
                        strokeDasharray={`${(riskScore * 264).toFixed(0)} 264`}
                        strokeLinecap="round" />
                    </svg>
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'grid', placeItems: 'center',
                      fontFamily: 'var(--ff-display)', fontSize: '18px',
                      letterSpacing: '-0.02em',
                      color: riskColor(riskBand),
                    }}>
                      {riskScore.toFixed(2)}
                    </div>
                  </div>

                  <div>
                    <div style={{ marginBottom: '8px' }}>
                      <span className={`pill-mini${riskPillCls(riskBand) ? ` ${riskPillCls(riskBand)}` : ''}`}>
                        {riskBand} risk
                      </span>
                    </div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                      {latestEvent?.action_type}
                    </div>
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', marginTop: '4px' }}>
                      {latestEvent ? fmtDate(latestEvent.occurred_at) : ''}
                    </div>
                  </div>
                </div>

                {/* Track bars for last 5 events */}
                <div style={{ display: 'grid', gap: '6px' }}>
                  {recentEvents.slice(0, 5).map((ev, idx) => (
                    <div key={ev.id} style={{
                      display: 'grid', gridTemplateColumns: '80px 1fr 44px',
                      alignItems: 'center', gap: '10px',
                      fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)',
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '10px' }}>
                        {idx === 0 ? 'LATEST' : `EVENT -${idx}`}
                      </span>
                      <div style={{ height: '6px', background: 'var(--paper-warm)', borderRadius: 'var(--r-pill)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.round(ev.risk_score * 100)}%`,
                          background: riskColor(ev.risk_band),
                          borderRadius: 'var(--r-pill)',
                        }} />
                      </div>
                      <span style={{ color: riskColor(ev.risk_band), textAlign: 'right' }}>
                        {ev.risk_score.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Inbox — show card for any non-null inbox_status */}
          {(agent.inbox_address || agent.inbox_status) && (
            <div className="card">
              <div className="card-head"><h3>Agent Inbox</h3></div>
              <div style={{ padding: '14px 18px' }}>
                {agent.inbox_status === 'failed' && (
                  <div style={{
                    padding: '12px 14px', marginBottom: '12px',
                    background: 'var(--red-soft)',
                    border: '1px solid var(--red)',
                    borderRadius: 'var(--r-sm)',
                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                  }}>
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>⚠</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#7C201D', marginBottom: '2px' }}>
                        Inbox provisioning failed
                      </div>
                      <div style={{ fontSize: '12px', color: '#7C201D', lineHeight: 1.5 }}>
                        All retry attempts exhausted. Check the audit log for details.
                        Contact support if the issue persists.
                      </div>
                    </div>
                  </div>
                )}
                {agent.inbox_status === 'provisioning' && (
                  <div style={{
                    padding: '12px 14px', marginBottom: '12px',
                    background: 'var(--amber-soft)',
                    border: '1px solid var(--amber)',
                    borderRadius: 'var(--r-sm)',
                    fontFamily: 'var(--ff-mono)', fontSize: '12px', color: '#7E5314',
                  }}>
                    ◌ Provisioning inbox… refresh in a moment.
                  </div>
                )}
                {agent.inbox_address && agent.inbox_status === 'active' && (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '12px 14px',
                      background: 'var(--paper)',
                      borderRadius: 'var(--r-sm)',
                      border: '1px solid var(--paper-edge)',
                    }}>
                      <svg viewBox="0 0 24 24" style={{ width: '16px', height: '16px', stroke: 'var(--green)', fill: 'none', strokeWidth: '1.7', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }} aria-hidden="true">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="m2 7 10 7 10-7" />
                      </svg>
                      <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink)' }}>
                        {agent.inbox_address}
                      </span>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--ink-3)' }}>
                      Autonomous inbox active. Send messages to this address to interact with the agent.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: Realtime event feed */}
        <div>
          <EventFeed agentId={agent.id} initialEvents={recentEvents} />
        </div>
      </div>
    </main>
  );
}
