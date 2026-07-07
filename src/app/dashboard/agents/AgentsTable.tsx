'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CertRow {
  agent_id: string;
  status: string;
  serial_number: string;
  issued_at: string;
  expires_at: string;
}

interface EventRow {
  agent_id: string;
  risk_score: number;
  risk_band: string;
  occurred_at: string;
}

interface AgentRow {
  id: string;
  name: string;
  status: string;
  model: string | null;
  model_hash: string | null;
  version: string | null;
  inbox_address: string | null;
  inbox_status: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface Props {
  agents: AgentRow[];
  certByAgent: Record<string, CertRow>;
  eventByAgent: Record<string, EventRow>;
  bgColors: string[];
}

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  active:       { cls: '',     label: 'active' },
  provisioning: { cls: 'warn', label: 'provisioning' },
  suspended:    { cls: 'fail', label: 'suspended' },
  revoked:      { cls: 'fail', label: 'revoked' },
};

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{
        fontFamily: 'var(--ff-mono)',
        fontSize: '9px',
        letterSpacing: '0.06em',
        padding: '2px 6px',
        border: '1px solid var(--paper-edge)',
        borderRadius: 'var(--r-sm)',
        background: copied ? 'var(--green-paper)' : 'var(--paper)',
        color: copied ? 'var(--green-deep)' : 'var(--ink-3)',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'all 0.15s',
      }}
    >
      {copied ? 'COPIED' : 'COPY'}
    </button>
  );
}

function ExpandedRow({ agent, cert }: { agent: AgentRow; cert: CertRow | undefined }) {
  const permitted = (agent.metadata as { permitted_actions?: string[] } | null)?.permitted_actions ?? [];
  const verifyUrl = cert ? `curl https://api.kakunin.ai/v1/verify/${cert.serial_number}` : null;

  return (
    <tr>
      <td colSpan={7} style={{ padding: 0, borderBottom: '2px solid var(--paper-edge)' }}>
        <div style={{
          padding: '16px 18px 18px',
          background: 'var(--paper)',
          borderTop: '1px solid var(--paper-edge)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
        }}>

          {/* Certificate block */}
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
              X.509 Certificate
            </div>
            {cert ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Serial — full + copy */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    color: 'var(--ink)', wordBreak: 'break-all', flex: 1 }}>
                    {cert.serial_number}
                  </span>
                  <CopyButton text={cert.serial_number} />
                </div>
                {/* Dates */}
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                  Issued {fmtDate(cert.issued_at)} · Expires {fmtDate(cert.expires_at)}
                </div>
                {/* Status pill */}
                <span className={`pill-mini${cert.status !== 'active' ? ' fail' : ''}`}
                  style={{ width: 'fit-content' }}>
                  {cert.status}
                </span>
              </div>
            ) : (
              <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                No active certificate
              </span>
            )}
          </div>

          {/* Agent identity block */}
          <div>
            <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
              Identity
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-2)' }}>
                <span style={{ color: 'var(--ink-3)' }}>ID · </span>
                {agent.id}
              </div>
              {agent.model_hash && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px',
                    color: 'var(--ink-2)', flex: 1, overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: 'var(--ink-3)' }}>HASH · </span>
                    {agent.model_hash}
                  </span>
                  <CopyButton text={agent.model_hash} />
                </div>
              )}
              {agent.version && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-2)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>VERSION · </span>
                  {agent.version}
                </div>
              )}
              {agent.inbox_address && (
                <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-2)' }}>
                  <span style={{ color: 'var(--ink-3)' }}>INBOX · </span>
                  {agent.inbox_address}
                </div>
              )}
            </div>
          </div>

          {/* Scope block */}
          {permitted.length > 0 && (
            <div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                Permitted Actions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {permitted.map((action) => (
                  <span key={action} style={{
                    fontFamily: 'var(--ff-mono)', fontSize: '9px',
                    padding: '2px 6px',
                    background: 'var(--green-paper)',
                    color: 'var(--green-deep)',
                    borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--green)',
                  }}>
                    {action}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Verify block */}
          {verifyUrl && (
            <div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px', letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: '8px' }}>
                Public Verify
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <pre style={{
                  margin: 0, flex: 1,
                  fontFamily: 'var(--ff-mono)', fontSize: '9px',
                  color: 'var(--ink-2)',
                  background: 'var(--paper-warm)',
                  padding: '6px 8px',
                  borderRadius: 'var(--r-sm)',
                  border: '1px solid var(--paper-edge)',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}>
                  {verifyUrl}
                </pre>
                <CopyButton text={verifyUrl} />
              </div>
              <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '9px',
                color: 'var(--ink-3)', marginTop: '5px' }}>
                No auth required — share with regulators or counterparties
              </div>
            </div>
          )}

          {/* Footer actions */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: '6px' }}>
            <Link
              href={`/dashboard/agents/${agent.id}`}
              className="btn-ghost"
              style={{ fontSize: '12px', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              Full detail →
            </Link>
          </div>

        </div>
      </td>
    </tr>
  );
}

export function AgentsTable({ agents, certByAgent, eventByAgent, bgColors }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="agents-table-wrap">
      <table className="agents-table">
        <thead>
          <tr>
            <th>Agent</th>
            <th>Status</th>
            <th>Certificate</th>
            <th>Risk</th>
            <th>Model</th>
            <th>Registered</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent, i) => {
            const cert = certByAgent[agent.id];
            const evt = eventByAgent[agent.id];
            const sp = STATUS_PILL[agent.status] ?? { cls: '', label: agent.status };
            const riskCls = evt?.risk_band === 'high' ? 'fail'
              : evt?.risk_band === 'medium' ? 'warn' : '';
            const isExpanded = expandedId === agent.id;

            return (
              <>
                <tr
                  key={agent.id}
                  onClick={() => setExpandedId(isExpanded ? null : agent.id)}
                  style={{
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--paper)' : undefined,
                    transition: 'background 0.1s',
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="agent-mark" style={{ background: bgColors[i % bgColors.length] }}>
                        {initials(agent.name)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{agent.name}</div>
                        {agent.inbox_address && agent.inbox_status !== 'failed' && (
                          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                            {agent.inbox_address}
                          </div>
                        )}
                        {agent.inbox_status === 'provisioning' && !agent.inbox_address && (
                          <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--amber)' }}>
                            ◌ inbox provisioning…
                          </div>
                        )}
                        {agent.inbox_status === 'failed' && (
                          <div style={{
                            fontFamily: 'var(--ff-mono)', fontSize: '10px',
                            color: '#7C201D', background: 'var(--red-soft)',
                            padding: '1px 6px', borderRadius: '3px', display: 'inline-block',
                          }}>
                            ⚠ inbox failed
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td><span className={`pill-mini${sp.cls ? ` ${sp.cls}` : ''}`}>{sp.label}</span></td>
                  <td>
                    {cert ? (
                      <div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px' }}>
                          {cert.serial_number.slice(0, 12)}…
                        </div>
                        <div style={{ fontFamily: 'var(--ff-mono)', fontSize: '10px', color: 'var(--ink-3)' }}>
                          exp {new Date(cert.expires_at).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    ) : (
                      <span className="pill-mini warn">no cert</span>
                    )}
                  </td>
                  <td>
                    {evt ? (
                      <span className={`pill-mini${riskCls ? ` ${riskCls}` : ''}`}>
                        {evt.risk_score.toFixed(2)} · {evt.risk_band}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--ink-3)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-2)' }}>
                    {agent.model ?? '—'}
                  </td>
                  <td style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
                    {relativeTime(agent.created_at)}
                  </td>
                  <td>
                    <span style={{
                      fontFamily: 'var(--ff-mono)', fontSize: '10px',
                      color: 'var(--ink-3)',
                      transition: 'transform 0.15s',
                      display: 'inline-block',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    }}>
                      ›
                    </span>
                  </td>
                </tr>
                {isExpanded && (
                  <ExpandedRow key={`${agent.id}-expand`} agent={agent} cert={cert} />
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
