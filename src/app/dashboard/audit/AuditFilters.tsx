'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useTransition } from 'react';

const EVENT_TYPES = [
  'certificate.issued',
  'certificate.revoked',
  'certificate.rotated',
  'agent.created',
  'agent.updated',
  'agent.suspended',
  'api_key.created',
  'api_key.revoked',
  'api_key.rotated',
  'verify.rate_limited',
  'compliance_report.generated',
  'behavior_event.high_risk',
];

const ACTOR_TYPES = ['user', 'agent', 'system'];

/**
 * Client component — manages filter form state via URL search params.
 * Server component re-renders with new params on every change.
 * No local data — just URL manipulation.
 */
export function AuditFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      // Reset to page 1 on filter change
      next.delete('page');
      startTransition(() => {
        router.push(`${pathname}?${next.toString()}`);
      });
    },
    [params, pathname, router]
  );

  const q          = params.get('q') ?? '';
  const eventType  = params.get('event_type') ?? '';
  const actorType  = params.get('actor_type') ?? '';
  const fromDate   = params.get('from') ?? '';
  const toDate     = params.get('to') ?? '';

  const hasFilters = q || eventType || actorType || fromDate || toDate;

  const inputStyle = {
    padding: '8px 10px',
    background: 'var(--paper-warm)',
    border: '1px solid transparent',
    borderRadius: 'var(--r-sm)',
    fontFamily: 'var(--ff-body)',
    fontSize: '13px',
    color: 'var(--ink)',
    outline: 'none',
    width: '100%',
  } as const;

  const focusStyle = {
    background: 'var(--card)',
    borderColor: 'var(--green)',
  };

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--hairline)',
      borderRadius: 'var(--r-md)',
      padding: '16px 18px',
      marginBottom: '20px',
      display: 'grid',
      gridTemplateColumns: '1fr 180px 140px 130px 130px auto',
      gap: '10px',
      alignItems: 'end',
      opacity: pending ? 0.7 : 1,
      transition: 'opacity 0.15s',
    }}>
      {/* Search */}
      <div>
        <label style={{
          display: 'block', marginBottom: '4px',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          Search
        </label>
        <div style={{ position: 'relative' }}>
          <svg viewBox="0 0 24 24" style={{
            position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)',
            width: '13px', height: '13px',
            stroke: 'var(--ink-3)', fill: 'none', strokeWidth: '1.8',
            strokeLinecap: 'round', strokeLinejoin: 'round', pointerEvents: 'none',
          }}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="text"
            placeholder="Search description…"
            defaultValue={q}
            style={{ ...inputStyle, paddingLeft: '28px' }}
            onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
            onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
            onChange={(e) => update('q', e.target.value)}
          />
        </div>
      </div>

      {/* Event type */}
      <div>
        <label style={{
          display: 'block', marginBottom: '4px',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          Event type
        </label>
        <select
          value={eventType}
          onChange={(e) => update('event_type', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <option value="">All events</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Actor type */}
      <div>
        <label style={{
          display: 'block', marginBottom: '4px',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          Actor
        </label>
        <select
          value={actorType}
          onChange={(e) => update('actor_type', e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
        >
          <option value="">All actors</option>
          {ACTOR_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* From date */}
      <div>
        <label style={{
          display: 'block', marginBottom: '4px',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          From
        </label>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => update('from', e.target.value)}
          style={{ ...inputStyle }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
        />
      </div>

      {/* To date */}
      <div>
        <label style={{
          display: 'block', marginBottom: '4px',
          fontFamily: 'var(--ff-mono)', fontSize: '10px',
          letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)',
        }}>
          To
        </label>
        <input
          type="date"
          value={toDate}
          onChange={(e) => update('to', e.target.value)}
          style={{ ...inputStyle }}
          onFocus={(e) => Object.assign(e.currentTarget.style, focusStyle)}
          onBlur={(e) => { e.currentTarget.style.background = 'var(--paper-warm)'; e.currentTarget.style.borderColor = 'transparent'; }}
        />
      </div>

      {/* Clear */}
      {hasFilters && (
        <button
          onClick={() => {
            startTransition(() => router.push(pathname));
          }}
          style={{
            padding: '8px 12px',
            background: 'transparent',
            border: '1px solid var(--hairline-2)',
            borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--ff-mono)', fontSize: '11px',
            color: 'var(--ink-2)', cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
