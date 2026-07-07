'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
}

interface Report {
  id: string;
  title: string;
  status: string;
  period_start: string;
  period_end: string;
  created_at: string;
  pdf_url: string | null;
  agent_id: string | null;
}

interface Props {
  agents: Agent[];
  reports: Report[];
  reportsEnabled: boolean;
  reportsPerAgent: number;
}

const STATUS_STYLE: Record<string, { color: string; label: string; dot: string }> = {
  ready:      { color: 'var(--green-deep)', label: 'Ready',      dot: 'var(--green)' },
  generating: { color: '#7E5314',           label: 'Generating', dot: 'var(--amber)' },
  failed:     { color: '#7C201D',           label: 'Failed',     dot: 'var(--red)' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function ReportsClient({ agents, reports: initialReports, reportsEnabled, reportsPerAgent }: Props) {
  const [reports, setReports] = useState<Report[]>(initialReports);
  const [selectedAgent, setSelectedAgent] = useState<string>(agents[0]?.id ?? '');
  const [windowDays, setWindowDays] = useState<number>(30);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function generate() {
    if (!selectedAgent) { setError('Select an agent first.'); return; }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: selectedAgent, windowDays }),
        });
        const json = await res.json() as { data?: { report_id: string }; error?: string };
        if (!res.ok) {
          setError(json.error ?? 'Failed to start report generation.');
          return;
        }
        setSuccess(`Report queued (ID: ${json.data?.report_id ?? ''}). Refresh in ~30s to see results.`);
        // Optimistically add a generating row
        const agent = agents.find(a => a.id === selectedAgent);
        const now = new Date().toISOString();
        setReports((prev) => [{
          id: json.data?.report_id ?? 'pending',
          title: `Compliance Report — ${agent?.name ?? 'Agent'} — ${now.slice(0, 10)}`,
          status: 'generating',
          period_start: new Date(Date.now() - windowDays * 86400_000).toISOString(),
          period_end: now,
          created_at: now,
          pdf_url: null,
          agent_id: selectedAgent,
        }, ...prev]);
      } catch (err) {
        setError((err as Error).message);
      }
    });
  }

  const agentName = new Map(agents.map(a => [a.id, a.name]));

  return (
    <div>
      {/* Generate form */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--hairline)',
        borderRadius: 'var(--r-md)', padding: '20px 24px', marginBottom: '24px',
      }}>
        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '16px' }}>
          Generate compliance report
        </div>

        {!reportsEnabled ? (
          <div style={{
            padding: '14px 18px', background: 'var(--paper-warm)',
            border: '1px dashed var(--paper-edge)', borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)',
          }}>
            Compliance reports are available on the <strong>Pro</strong> plan and above.{' '}
            <a href="/dashboard/billing" style={{ color: 'var(--green)', textDecoration: 'none' }}>
              Upgrade →
            </a>
          </div>
        ) : agents.length === 0 ? (
          <div style={{
            padding: '14px 18px', background: 'var(--paper-warm)',
            border: '1px dashed var(--paper-edge)', borderRadius: 'var(--r-sm)',
            fontFamily: 'var(--ff-mono)', fontSize: '12px', color: 'var(--ink-3)',
          }}>
            Register an agent first before generating a report.{' '}
            <Link href="/dashboard/agents/new" style={{ color: 'var(--green)', textDecoration: 'none' }}>
              Register agent →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '1 1 200px' }}>
              <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                AGENT
              </label>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                style={{
                  padding: '9px 12px',
                  background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
                  borderRadius: 'var(--r-sm)', fontFamily: 'var(--ff-mono)', fontSize: '12px',
                  color: 'var(--ink)', outline: 'none', cursor: 'pointer',
                }}
              >
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: '0 0 160px' }}>
              <label style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                WINDOW
              </label>
              <select
                value={windowDays}
                onChange={(e) => setWindowDays(Number(e.target.value))}
                style={{
                  padding: '9px 12px',
                  background: 'var(--paper-warm)', border: '1px solid var(--hairline)',
                  borderRadius: 'var(--r-sm)', fontFamily: 'var(--ff-mono)', fontSize: '12px',
                  color: 'var(--ink)', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={60}>Last 60 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>

            <button
              onClick={generate}
              disabled={isPending || !selectedAgent}
              style={{
                padding: '9px 20px', height: '38px',
                background: isPending ? 'var(--paper-warm)' : 'var(--green)',
                border: 'none', borderRadius: 'var(--r-sm)',
                cursor: isPending ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--ff-mono)', fontSize: '12px', fontWeight: 600,
                color: isPending ? 'var(--ink-3)' : 'var(--paper)',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'background 0.15s',
                flexShrink: 0,
              }}
            >
              {isPending ? (
                <>
                  <svg viewBox="0 0 24 24" style={{ width: '14px', height: '14px', stroke: 'currentColor', fill: 'none', strokeWidth: '2', animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Queuing…
                </>
              ) : (
                <>Generate report →</>
              )}
            </button>
          </div>
        )}

        {reportsEnabled && reportsPerAgent < Infinity && (
          <div style={{ marginTop: '10px', fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
            {reportsPerAgent} report{reportsPerAgent !== 1 ? 's' : ''} per agent per month on your plan.
          </div>
        )}

        {error && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'var(--red-soft)', border: '1px solid var(--red)',
            borderRadius: 'var(--r-sm)', fontFamily: 'var(--ff-mono)', fontSize: '12px',
            color: '#7C201D',
          }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{
            marginTop: '12px', padding: '10px 14px',
            background: 'var(--green-paper)', border: '1px solid var(--green)',
            borderRadius: 'var(--r-sm)', fontFamily: 'var(--ff-mono)', fontSize: '12px',
            color: 'var(--green-deep)',
          }}>
            {success}
          </div>
        )}
      </div>

      {/* Reports list */}
      <div className="agents-table-wrap">
        {reports.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ opacity: 0.4, marginBottom: '8px' }}>
              <svg viewBox="0 0 24 24" style={{ width: '28px', height: '28px', stroke: 'var(--ink-3)', fill: 'none', strokeWidth: '1.5', strokeLinecap: 'round', strokeLinejoin: 'round', margin: '0 auto' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p style={{ margin: 0, fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              No reports generated yet. Generate your first report above.
            </p>
          </div>
        ) : (
          <table className="agents-table">
            <thead>
              <tr>
                {['Report', 'Agent', 'Period', 'Status', 'Generated', ''].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => {
                const ss = STATUS_STYLE[r.status] ?? STATUS_STYLE['failed'];
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'var(--ff-body)', fontSize: '13px', fontWeight: 500 }}>
                      {r.title}
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
                      {r.agent_id ? (agentName.get(r.agent_id) ?? r.agent_id.slice(0, 8) + '…') : '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                      {fmtDate(r.period_start)} – {fmtDate(r.period_end)}
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        fontFamily: 'var(--ff-mono)', fontSize: '11px',
                        color: ss.color, fontWeight: 600,
                      }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ss.dot, flexShrink: 0 }} />
                        {ss.label}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                      {fmtDate(r.created_at)}
                    </td>
                    <td>
                      {r.pdf_url ? (
                        <a
                          href={r.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="row-action"
                        >
                          Download PDF
                          <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      ) : r.status === 'generating' ? (
                        <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--amber)' }}>
                          ◌ generating…
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
