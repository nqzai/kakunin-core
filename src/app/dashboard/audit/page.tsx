import { Suspense } from 'react';
import Link from 'next/link';
import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AuditFilters } from './AuditFilters';

/**
 * /dashboard/audit — read-only audit log viewer.
 *
 * Filters and pagination live in URL search params — server renders
 * the correct slice. No edit/delete affordances (append-only by DB rule).
 *
 * RA-32 acceptance criteria:
 * ✓ Filter combinations return correct results (server-side, composable)
 * ✓ Pagination works (25 rows/page, count-based prev/next)
 * ✓ No edit/delete affordances present
 */
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

// ── Event type labels ──────────────────────────────────────────────────────

const EVENT_LABELS: Record<string, string> = {
  'certificate.issued':              'Certificate Issued',
  'certificate.revoked':             'Certificate Revoked',
  'certificate.rotated':             'Certificate Rotated',
  'agent.created':                   'Agent Registered',
  'agent.updated':                   'Agent Updated',
  'agent.suspended':                 'Agent Suspended',
  'agent.halted':                    'Agent Halted',
  'api_key.created':                 'API Key Created',
  'api_key.revoked':                 'API Key Revoked',
  'api_key.rotated':                 'API Key Rotated',
  'tenant.created':                  'Tenant Created',
  'tenant.trial_started':            'Trial Started',
  'tenant.converted':                'Trial Converted',
  'tenant.suspended':                'Tenant Suspended',
  'billing.subscription.updated':    'Subscription Updated',
  'billing.subscription.cancelled':  'Subscription Cancelled',
  'billing.payment_recovered':       'Payment Recovered',
  'verify.rate_limited':             'Rate Limited',
};

function eventLabel(type: string): string {
  if (EVENT_LABELS[type]) return EVENT_LABELS[type];
  // Fallback: snake_case → Title Case
  return type
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Event type styling ─────────────────────────────────────────────────────

const EVENT_STYLES: Record<string, { dot: string; bg: string; color: string }> = {
  'certificate.issued':   { dot: 'var(--green)',      bg: 'var(--green-paper)', color: 'var(--green-deep)' },
  'certificate.revoked':  { dot: 'var(--red)',         bg: 'var(--red-soft)',    color: '#7C201D' },
  'certificate.rotated':  { dot: 'var(--green-bright)',bg: 'var(--green-paper)', color: 'var(--green-deep)' },
  'agent.created':        { dot: 'var(--green)',       bg: 'var(--green-paper)', color: 'var(--green-deep)' },
  'agent.updated':        { dot: 'var(--amber)',       bg: 'var(--amber-soft)',  color: '#7E5314' },
  'agent.suspended':      { dot: 'var(--red)',         bg: 'var(--red-soft)',    color: '#7C201D' },
  'api_key.created':      { dot: 'var(--green)',       bg: 'var(--green-paper)', color: 'var(--green-deep)' },
  'api_key.revoked':      { dot: 'var(--red)',         bg: 'var(--red-soft)',    color: '#7C201D' },
  'api_key.rotated':      { dot: 'var(--amber)',       bg: 'var(--amber-soft)',  color: '#7E5314' },
  'verify.rate_limited':  { dot: 'var(--amber)',       bg: 'var(--amber-soft)',  color: '#7E5314' },
};

function eventStyle(type: string) {
  // Prefix match fallback
  const exact = EVENT_STYLES[type];
  if (exact) return exact;
  if (type.includes('revok')) return { dot: 'var(--red)',   bg: 'var(--red-soft)',    color: '#7C201D' };
  if (type.includes('creat')) return { dot: 'var(--green)', bg: 'var(--green-paper)', color: 'var(--green-deep)' };
  return { dot: 'var(--ink-3)', bg: 'var(--paper-warm)', color: 'var(--ink-2)' };
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

// ── Page ───────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const sp = await searchParams;

  const q         = typeof sp.q         === 'string' ? sp.q.trim()         : '';
  const eventType = typeof sp.event_type === 'string' ? sp.event_type.trim() : '';
  const actorType = typeof sp.actor_type === 'string' ? sp.actor_type.trim() : '';
  const fromDate  = typeof sp.from      === 'string' ? sp.from             : '';
  const toDate    = typeof sp.to        === 'string' ? sp.to               : '';
  const page      = Math.max(1, parseInt(typeof sp.page === 'string' ? sp.page : '1', 10));
  const offset    = (page - 1) * PAGE_SIZE;

  const context = await getDashboardRequestContext();
  if (!context?.tenantId) return null;

  const db = createServiceClient();

  // Build query — composable filters
  let query = db
    .from('audit_log')
    .select('*', { count: 'exact' })
    .eq('tenant_id', context.tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q)         query = query.ilike('description', `%${q}%`);
  if (eventType) query = query.eq('event_type', eventType);
  if (actorType) query = query.eq('actor_type', actorType);
  if (fromDate)  query = query.gte('created_at', `${fromDate}T00:00:00.000Z`);
  if (toDate)    query = query.lte('created_at', `${toDate}T23:59:59.999Z`);

  const { data: events, count } = await query;
  const rows = events ?? [];
  const total = count ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  function pageUrl(p: number) {
    const next = new URLSearchParams();
    if (q)         next.set('q', q);
    if (eventType) next.set('event_type', eventType);
    if (actorType) next.set('actor_type', actorType);
    if (fromDate)  next.set('from', fromDate);
    if (toDate)    next.set('to', toDate);
    if (p > 1)     next.set('page', String(p));
    const qs = next.toString();
    return `/dashboard/audit${qs ? `?${qs}` : ''}`;
  }

  const hasFilters = q || eventType || actorType || fromDate || toDate;

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">Audit Log</h1>
          <p className="dash-sub">
            Append-only · {total.toLocaleString()} event{total !== 1 ? 's' : ''}
            {hasFilters ? ' matching filters' : ' total'}
            {totalPages > 1 && ` · page ${page} of ${totalPages}`}
          </p>
        </div>
        {/* Append-only badge — no edit/delete affordance */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px',
          background: 'var(--paper-warm)',
          border: '1px dashed var(--paper-edge)',
          borderRadius: 'var(--r-sm)',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          color: 'var(--ink-3)', letterSpacing: '0.06em',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }} aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          READ-ONLY · APPEND-ONLY
        </div>
      </div>

      {/* Filters — client component, Suspense required for useSearchParams */}
      <Suspense fallback={<div style={{ height: '72px', background: 'var(--card)', border: '1px solid var(--hairline)', borderRadius: 'var(--r-md)', marginBottom: '20px' }} />}>
        <AuditFilters />
      </Suspense>

      {/* Log table */}
      <div style={{
        background: 'var(--card)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)',
        overflow: 'hidden',
      }}>
        {rows.length === 0 ? (
          <div>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--paper-edge)', fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              {hasFilters ? 'No events match these filters.' : 'Audit events appear here once you register agents and start issuing certificates.'}
            </div>
            <div style={{ opacity: 0.4, pointerEvents: 'none' }}>
              {[
                { evt: 120, desc: 220, actor: 90, aff: 70 },
                { evt: 140, desc: 180, actor: 80, aff: 80 },
                { evt: 100, desc: 200, actor: 100, aff: 60 },
                { evt: 130, desc: 160, actor: 85, aff: 75 },
                { evt: 115, desc: 190, actor: 95, aff: 65 },
              ].map((s, i) => (
                <div key={i} className="skel-row">
                  <div className="skel skel-badge" style={{ width: s.evt }} />
                  <div className="skel skel-line-lg" style={{ width: s.desc, flex: 1 }} />
                  <div className="skel skel-line-sm" style={{ width: s.actor }} />
                  <div className="skel skel-line-xs" style={{ width: s.aff }} />
                  <div className="skel skel-line-xs" style={{ width: 100 }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--paper-edge)' }}>
                {['Event', 'Description', 'Actor', 'Affected ID', 'Timestamp'].map((h) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--ink-3)', fontWeight: 500,
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((ev) => {
                const es = eventStyle(ev.event_type);
                return (
                  <tr
                    key={ev.id}
                    style={{ borderBottom: '1px solid var(--paper-edge)' }}
                  >
                    {/* Event type pill */}
                    <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                          width: '6px', height: '6px', borderRadius: '50%',
                          background: es.dot, flexShrink: 0,
                        }} />
                        <span
                          title={ev.event_type}
                          style={{
                            fontFamily: 'var(--ff-mono)', fontSize: '11px',
                            background: es.bg, color: es.color,
                            padding: '2px 7px', borderRadius: 'var(--r-pill)',
                            whiteSpace: 'nowrap', cursor: 'default',
                          }}
                        >
                          {eventLabel(ev.event_type)}
                        </span>
                      </div>
                    </td>

                    {/* Description */}
                    <td style={{ padding: '11px 16px', color: 'var(--ink-2)', maxWidth: '320px' }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.description}
                      </div>
                    </td>

                    {/* Actor */}
                    <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
                        <span style={{
                          background: 'var(--paper-warm)',
                          padding: '2px 6px', borderRadius: '4px',
                          marginRight: '4px',
                        }}>
                          {ev.actor_type}
                        </span>
                        <span style={{ color: 'var(--ink-3)' }}>
                          {ev.actor_id.slice(0, 8)}…
                        </span>
                      </div>
                    </td>

                    {/* Affected ID */}
                    <td style={{ padding: '11px 16px' }}>
                      {ev.affected_id ? (
                        <span style={{
                          fontFamily: 'var(--ff-mono)', fontSize: '11px',
                          color: 'var(--ink-3)',
                        }}>
                          {ev.affected_id.slice(0, 12)}…
                        </span>
                      ) : (
                        <span style={{ color: 'var(--ink-3)', opacity: 0.4 }}>—</span>
                      )}
                    </td>

                    {/* Timestamp */}
                    <td style={{
                      padding: '11px 16px',
                      fontFamily: 'var(--ff-mono)', fontSize: '11px',
                      color: 'var(--ink-3)', whiteSpace: 'nowrap',
                    }}>
                      {fmtDate(ev.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: '16px',
          fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)',
        }}>
          <span>
            {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total.toLocaleString()}
          </span>

          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            {/* First */}
            {page > 2 && (
              <Link href={pageUrl(1)} style={pageLinkStyle(false)}>«</Link>
            )}
            {/* Prev */}
            {page > 1 && (
              <Link href={pageUrl(page - 1)} style={pageLinkStyle(false)}>‹ Prev</Link>
            )}
            {/* Page numbers — window of 5 */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return (
                <Link key={p} href={pageUrl(p)} style={pageLinkStyle(p === page)}>
                  {p}
                </Link>
              );
            })}
            {/* Next */}
            {page < totalPages && (
              <Link href={pageUrl(page + 1)} style={pageLinkStyle(false)}>Next ›</Link>
            )}
            {/* Last */}
            {page < totalPages - 1 && (
              <Link href={pageUrl(totalPages)} style={pageLinkStyle(false)}>»</Link>
            )}
          </div>
        </div>
      )}

      {/* Immutability note */}
      <div style={{
        marginTop: '20px', padding: '12px 16px',
        background: 'var(--paper-warm)',
        border: '1px dashed var(--paper-edge)',
        borderRadius: 'var(--r-sm)',
        fontFamily: 'var(--ff-mono)', fontSize: '10px',
        color: 'var(--ink-3)', letterSpacing: '0.04em',
        display: 'flex', alignItems: 'center', gap: '8px',
      }}>
        <svg viewBox="0 0 24 24" style={{ width: '12px', height: '12px', stroke: 'currentColor', fill: 'none', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', flexShrink: 0 }} aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        Audit log is append-only by database rule — no row may be updated or deleted.
        Retained per MiCA Art. 72 compliance requirement.
      </div>
    </main>
  );
}

function pageLinkStyle(active: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '32px',
    height: '32px',
    padding: '0 8px',
    borderRadius: 'var(--r-sm)',
    background: active ? 'var(--ink)' : 'var(--card)',
    color: active ? 'var(--paper)' : 'var(--ink-2)',
    border: `1px solid ${active ? 'var(--ink)' : 'var(--hairline-2)'}`,
    fontFamily: 'var(--ff-mono)',
    fontSize: '11px',
    textDecoration: 'none',
    fontWeight: active ? 600 : 400,
  };
}
