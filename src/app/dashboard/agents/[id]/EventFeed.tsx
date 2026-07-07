'use client';

import { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';

type BehaviorEvent = Database['public']['Tables']['behavior_events']['Row'];

interface EventFeedProps {
  agentId: string;
  /** Server-fetched initial events (most recent first) */
  initialEvents: BehaviorEvent[];
}

const BAND_STYLES: Record<string, { bg: string; color: string; cls: string }> = {
  low:    { bg: 'var(--green-paper)', color: 'var(--green-deep)', cls: '' },
  medium: { bg: 'var(--amber-soft)',  color: '#7E5314',           cls: 'warn' },
  high:   { bg: 'var(--red-soft)',    color: '#7C201D',           cls: 'fail' },
};

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

/**
 * Live behavior event feed for a single agent.
 * Subscribes to Supabase Realtime — updates without page refresh.
 * Accepts server-fetched initial events; new events prepend to the list.
 */
export function EventFeed({ agentId, initialEvents }: EventFeedProps) {
  const [events, setEvents] = useState<BehaviorEvent[]>(initialEvents);
  const [connected, setConnected] = useState(false);
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserSupabaseClient>['channel']> | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel(`agent-events-${agentId}`)
      .on<BehaviorEvent>(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'behavior_events',
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => {
          setEvents((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agentId]);

  const style = (band: string) => BAND_STYLES[band] ?? BAND_STYLES.low;

  return (
    <div className="card">
      <div className="card-head">
        <h3>Live Event Feed</h3>
        <span className="more" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span
            style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--amber)',
              display: 'inline-block',
            }}
          />
          {connected ? 'LIVE' : 'CONNECTING…'}
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '32px 18px', textAlign: 'center', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
          NO EVENTS YET · WAITING FOR REALTIME…
        </div>
      ) : (
        <div>
          {events.map((ev) => {
            const s = style(ev.risk_band);
            return (
              <div
                key={ev.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: '12px',
                  alignItems: 'start',
                  padding: '12px 18px',
                  borderTop: '1px solid var(--paper-edge)',
                }}
              >
                {/* Risk band indicator */}
                <div
                  style={{
                    marginTop: '2px',
                    width: '8px', height: '8px',
                    borderRadius: '50%',
                    background: ev.risk_band === 'high' ? 'var(--red)'
                      : ev.risk_band === 'medium' ? 'var(--amber)'
                      : 'var(--green)',
                    flexShrink: 0,
                  }}
                />

                {/* Event details */}
                <div>
                  <div style={{ fontWeight: 500, fontSize: '13px' }}>{ev.action_type}</div>
                  {ev.source_ip && (
                    <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', marginTop: '2px' }}>
                      {ev.source_ip}
                    </div>
                  )}
                  <div style={{ marginTop: '4px' }}>
                    <span className={`pill-mini${s.cls ? ` ${s.cls}` : ''}`}>
                      {ev.risk_score.toFixed(2)} · {ev.risk_band}
                    </span>
                  </div>
                </div>

                {/* Timestamp */}
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                  {relativeTime(ev.occurred_at)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
