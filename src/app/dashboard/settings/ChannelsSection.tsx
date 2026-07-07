'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

type ChannelType = 'slack' | 'pagerduty' | 'sms' | 'whatsapp';

interface ActiveChannel {
  id: string;
  channel_type: string;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  credential_hint?: string;
}

interface Props {
  plan: string;
  activeChannels: ActiveChannel[];
  webhookCount: number;
  userEmail: string;
}

const CHANNEL_META: Record<ChannelType, {
  label: string;
  icon: string;
  credLabel: string;
  credKey: string;
  credPlaceholder: string;
  available: boolean;
}> = {
  slack: {
    label: 'Slack',
    icon: '💬',
    credLabel: 'Incoming Webhook URL',
    credKey: 'webhook_url',
    credPlaceholder: 'https://hooks.slack.com/services/T.../B.../...',
    available: true,
  },
  pagerduty: {
    label: 'PagerDuty',
    icon: '🔔',
    credLabel: 'Events v2 Integration Key',
    credKey: 'integration_key',
    credPlaceholder: '32-character routing key',
    available: true,
  },
  sms: {
    label: 'SMS',
    icon: '📱',
    credLabel: 'Phone number (E.164)',
    credKey: 'phone_number',
    credPlaceholder: '+44...',
    available: false, // coming soon
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: '💚',
    credLabel: 'Phone number (E.164)',
    credKey: 'phone_number',
    credPlaceholder: '+44...',
    available: false, // coming soon
  },
};

const EVENTS = [
  { id: 'risk.alert', label: 'Risk alert', desc: 'Agent risk score breaches threshold' },
  { id: 'certificate.revoked', label: 'Certificate revoked', desc: 'Agent cert revoked by system or user' },
  { id: 'certificate.issued', label: 'Certificate issued', desc: 'New X.509 cert issued' },
  { id: 'agent.created', label: 'Agent registered', desc: 'New agent added to tenant' },
];

export function ChannelsSection({ plan, activeChannels, webhookCount, userEmail }: Props) {
  const isPro = plan === 'pro';
  const [adding, setAdding] = useState(false);
  const [channelType, setChannelType] = useState<ChannelType>('slack');
  const [credValue, setCredValue] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['risk.alert', 'certificate.revoked']);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high_only'>('all');
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ActiveChannel[]>(activeChannels);
  const [isPending, startTransition] = useTransition();

  const meta = CHANNEL_META[channelType];

  function toggleEvent(id: string) {
    setSelectedEvents((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function handleAdd() {
    setError(null);
    if (!credValue.trim()) { setError('Credential is required'); return; }
    if (selectedEvents.length === 0) { setError('Select at least one event'); return; }

    startTransition(async () => {
      const res = await fetch('/api/settings/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel_type: channelType,
          credentials: { [meta.credKey]: credValue.trim() },
          config: { events: selectedEvents, severity_filter: severityFilter },
        }),
      });
      const json = await res.json() as { data?: ActiveChannel; error?: string };
      if (!res.ok) { setError(json.error ?? 'Failed to save'); return; }
      setChannels((prev) => [...prev, json.data!]);
      setAdding(false);
      setCredValue('');
    });
  }

  async function handleRemove(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/settings/channels?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c.id !== id));
      }
    });
  }

  const sectionHead: React.CSSProperties = {
    fontFamily: 'var(--ff-mono)', fontSize: '10px',
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--ink-3)', marginBottom: '12px',
  };

  const card: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--hairline)',
    borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: '16px',
  };

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid var(--paper-edge)', fontSize: '13px',
  };

  const lbl: React.CSSProperties = {
    fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', minWidth: '140px',
  };

  return (
    <div>
      <p style={{ ...sectionHead, marginTop: '24px' }}>Communication channels</p>

      {/* ── Always-on: Email digest ──────────────────────────────────── */}
      <div style={card}>
        <div style={{ ...row }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>📧</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Email digest</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', marginTop: '1px' }}>
                Daily summary of risk events and cert activity
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              {userEmail}
            </span>
            <span style={{
              fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.04em',
              background: 'var(--green-paper)', color: 'var(--green-deep)',
              border: '1px solid var(--green)', padding: '2px 8px', borderRadius: 'var(--r-pill)',
            }}>
              Active
            </span>
          </div>
        </div>

        {/* ── Webhooks ─────────────────────────────────────────────── */}
        <div style={{ ...row }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>🔗</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>Webhooks</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', marginTop: '1px' }}>
                HTTP POST to your endpoints — HMAC-signed
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              {webhookCount} endpoint{webhookCount !== 1 ? 's' : ''} registered
            </span>
            <Link
              href="/dashboard/developer"
              style={{
                fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--green)',
                textDecoration: 'none', border: '1px solid var(--green)',
                padding: '3px 10px', borderRadius: 'var(--r-xs)',
              }}
            >
              Manage →
            </Link>
          </div>
        </div>

        {/* ── AgentMail inboxes ─────────────────────────────────────── */}
        <div style={{ ...row, borderBottom: 'none' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>📬</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>AgentMail inboxes</div>
              <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', marginTop: '1px' }}>
                Per-agent email addresses — agents send & receive mail
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--ff-mono)', fontSize: '10px',
              background: 'var(--green-paper)', color: 'var(--green-deep)',
              border: '1px solid var(--green)', padding: '2px 8px', borderRadius: 'var(--r-pill)',
            }}>
              Auto-provisioned per agent
            </span>
          </div>
        </div>
      </div>

      {/* ── BYOA alert channels ──────────────────────────────────────── */}
      <p style={sectionHead}>BYOA alert channels</p>

      {!isPro ? (
        /* Locked overlay for Starter */
        <div style={{
          ...card,
          position: 'relative', overflow: 'hidden',
          opacity: 0.7,
        }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(250,250,249,0.75)',
            backdropFilter: 'blur(2px)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: '10px', zIndex: 2,
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
              Available on Pro plan
            </div>
            <div style={{ fontSize: '12px', color: 'var(--ink-3)', marginBottom: '8px' }}>
              Route risk alerts to Slack, PagerDuty, SMS, or WhatsApp
            </div>
            <Link
              href="/dashboard/billing"
              style={{
                padding: '8px 18px', background: 'var(--green)', borderRadius: 'var(--r-sm)',
                fontFamily: 'var(--ff-mono)', fontSize: '12px',
                color: 'var(--paper)', textDecoration: 'none',
              }}
            >
              Upgrade to Pro →
            </Link>
          </div>
          {/* Ghost content underneath */}
          <div style={{ pointerEvents: 'none', filter: 'blur(1px)' }}>
            {(['slack', 'pagerduty', 'sms', 'whatsapp'] as ChannelType[]).map((t) => (
              <div key={t} style={{ ...row, borderBottom: t === 'whatsapp' ? 'none' : '1px solid var(--paper-edge)' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <span style={{ fontSize: '15px' }}>{CHANNEL_META[t].icon}</span>
                  <span style={lbl}>{CHANNEL_META[t].label}</span>
                </div>
                <div style={{ width: '80px', height: '10px', background: 'var(--paper-warm)', borderRadius: '4px' }} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Pro: active channels + add form */
        <div>
          {channels.length > 0 ? (
            <div style={{ ...card, marginBottom: '12px' }}>
              {channels.map((ch, i) => {
                const m = CHANNEL_META[ch.channel_type as ChannelType];
                const evts = (ch.config as { events?: string[] }).events ?? [];
                return (
                  <div key={ch.id} style={{
                    ...row,
                    borderBottom: i === channels.length - 1 ? 'none' : '1px solid var(--paper-edge)',
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '16px', marginTop: '2px' }}>{m?.icon}</span>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                          {m?.label ?? ch.channel_type}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-3)', fontFamily: 'var(--ff-mono)', marginTop: '2px' }}>
                          {ch.credential_hint ?? 'configured'}
                        </div>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {evts.map((e) => (
                            <span key={e} style={{
                              fontFamily: 'var(--ff-mono)', fontSize: '10px',
                              background: 'var(--paper-warm)', color: 'var(--ink-3)',
                              padding: '1px 6px', borderRadius: 'var(--r-pill)', border: '1px solid var(--paper-edge)',
                            }}>
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemove(ch.id)}
                      disabled={isPending}
                      style={{
                        padding: '5px 12px', background: 'transparent',
                        border: '1px solid var(--hairline-2)', borderRadius: 'var(--r-xs)',
                        cursor: 'pointer', fontFamily: 'var(--ff-mono)',
                        fontSize: '11px', color: 'var(--ink-3)',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          {channels.length === 0 && !adding && (
            <div style={{
              ...card,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--ink)', fontWeight: 500, marginBottom: '3px' }}>
                  No channels configured
                </div>
                <div style={{ fontSize: '12px', color: 'var(--ink-3)' }}>
                  Route risk alerts to Slack, PagerDuty, SMS, or WhatsApp
                </div>
              </div>
              <button
                onClick={() => setAdding(true)}
                style={{
                  flexShrink: 0, padding: '8px 16px',
                  background: 'var(--green)', border: 'none', borderRadius: 'var(--r-sm)',
                  cursor: 'pointer', fontFamily: 'var(--ff-mono)',
                  fontSize: '12px', color: 'var(--paper)',
                }}
              >
                + Add channel
              </button>
            </div>
          )}

          {channels.length > 0 && !adding && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                1 channel included on Pro · remove above to change
              </span>
            </div>
          )}

          {adding && (
            <div style={{ ...card, border: '1px solid var(--green)' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Add alert channel
              </div>

              {/* Channel type picker */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {(Object.keys(CHANNEL_META) as ChannelType[]).map((t) => {
                  const m = CHANNEL_META[t];
                  const selected = channelType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => { if (m.available) { setChannelType(t); setCredValue(''); } }}
                      disabled={!m.available}
                      style={{
                        padding: '8px 16px', cursor: m.available ? 'pointer' : 'not-allowed',
                        background: selected ? 'var(--green-paper)' : 'var(--paper-warm)',
                        border: selected ? '1px solid var(--green)' : '1px solid var(--hairline)',
                        borderRadius: 'var(--r-sm)',
                        fontFamily: 'var(--ff-mono)', fontSize: '12px',
                        color: !m.available ? 'var(--ink-3)' : selected ? 'var(--green-deep)' : 'var(--ink)',
                        opacity: m.available ? 1 : 0.5,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      {m.icon} {m.label}
                      {!m.available && (
                        <span style={{ fontSize: '9px', color: 'var(--ink-3)' }}>soon</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Credential field */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ ...lbl, display: 'block', marginBottom: '6px' }}>
                  {meta.credLabel}
                </label>
                <input
                  type="text"
                  value={credValue}
                  onChange={(e) => setCredValue(e.target.value)}
                  placeholder={meta.credPlaceholder}
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '9px 12px', fontFamily: 'var(--ff-mono)', fontSize: '12px',
                    background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
                    borderRadius: 'var(--r-sm)', color: 'var(--ink)',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Event subscriptions */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ ...lbl, marginBottom: '8px' }}>Notify on</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {EVENTS.map((ev) => (
                    <label
                      key={ev.id}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvents.includes(ev.id)}
                        onChange={() => toggleEvent(ev.id)}
                        style={{ accentColor: 'var(--green)', width: '14px', height: '14px' }}
                      />
                      <div>
                        <span style={{ fontSize: '12px', color: 'var(--ink)', fontWeight: 500 }}>{ev.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--ink-3)', marginLeft: '8px' }}>{ev.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Severity filter */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ ...lbl, marginBottom: '6px' }}>Risk filter</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { value: 'all' as const, label: 'All events' },
                    { value: 'high_only' as const, label: 'High risk only' },
                  ].map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setSeverityFilter(value)}
                      style={{
                        padding: '6px 14px',
                        background: severityFilter === value ? 'var(--ink)' : 'var(--paper-warm)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--r-xs)',
                        cursor: 'pointer', fontFamily: 'var(--ff-mono)', fontSize: '11px',
                        color: severityFilter === value ? 'var(--paper)' : 'var(--ink-2)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{
                  marginBottom: '12px', padding: '8px 12px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 'var(--r-xs)',
                  fontFamily: 'var(--ff-mono)', fontSize: '11px', color: '#dc2626',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAdd}
                  disabled={isPending}
                  style={{
                    padding: '9px 20px', background: 'var(--green)',
                    border: 'none', borderRadius: 'var(--r-sm)',
                    cursor: isPending ? 'wait' : 'pointer',
                    fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--paper)',
                    opacity: isPending ? 0.7 : 1,
                  }}
                >
                  {isPending ? 'Saving…' : 'Save channel'}
                </button>
                <button
                  onClick={() => { setAdding(false); setError(null); setCredValue(''); }}
                  style={{
                    padding: '9px 16px', background: 'transparent',
                    border: '1px solid var(--hairline-2)', borderRadius: 'var(--r-sm)',
                    cursor: 'pointer', fontFamily: 'var(--ff-mono)',
                    fontSize: '12px', color: 'var(--ink-3)',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
