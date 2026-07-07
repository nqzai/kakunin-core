'use client';

import { useState, useRef, useEffect } from 'react';
import './sandbox.css';

const RADIUS = 80;
const CIRC = 2 * Math.PI * RADIUS;
const HALF_CIRC = CIRC / 2;

interface Action {
  id: string;
  label: string;
  delta: number;
  severity: 'medium' | 'high' | 'critical';
  desc: string;
}

const ACTIONS: Action[] = [
  { id: 'tx',    label: 'Unauthorized Transfer', delta: 0.15, severity: 'critical', desc: 'Attempted SWIFT transfer to unregistered external account outside permitted scope' },
  { id: 'exfil', label: 'Data Exfiltration',     delta: 0.18, severity: 'critical', desc: 'POSTed 2,847 customer PII records to unregistered external endpoint' },
  { id: 'scope', label: 'Scope Violation',        delta: 0.10, severity: 'high',     desc: 'Called write:payments — action not in certificate SAN extension' },
  { id: 'auth',  label: 'Auth Failures ×3',       delta: 0.08, severity: 'high',     desc: '3 consecutive authentication failures within 60s session window' },
  { id: 'rate',  label: 'Rate Limit Breach',      delta: 0.06, severity: 'medium',   desc: 'Exceeded 1,000 req/min on trading-api.fintech.com' },
];

interface LogEntry {
  id: number;
  ts: string;
  label: string;
  desc: string;
  severity: 'medium' | 'high' | 'critical' | 'system' | 'revoke';
  score: number;
}

let _uid = 1;
function uid() { return _uid++; }
function nowTs() { return new Date().toISOString().replace('T', ' ').slice(11, 23) + 'Z'; }

const INIT_SCORE = 0.18;

function makeInitLog(): LogEntry[] {
  return [{
    id: 0,
    ts: nowTs(),
    label: 'Certificate issued',
    desc: 'CN=trading-agent-003, O=demo-fintech, OU=agent-fleet | serial #4A:1B:9C:D3:88 | RSA-2048 KMS | valid 365d',
    severity: 'system',
    score: INIT_SCORE,
  }];
}

export function SandboxDemo() {
  const [score, setScore] = useState(INIT_SCORE);
  const [log, setLog] = useState<LogEntry[]>(makeInitLog);
  const logRef = useRef<HTMLDivElement>(null);

  const phase: 'active' | 'warning' | 'revoked' =
    score >= 0.85 ? 'revoked' : score >= 0.75 ? 'warning' : 'active';

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  function trigger(action: Action) {
    if (phase === 'revoked') return;

    setScore(prev => {
      const next = parseFloat(Math.min(1, prev + action.delta).toFixed(3));
      const entries: LogEntry[] = [];

      entries.push({
        id: uid(),
        ts: nowTs(),
        label: action.label,
        desc: action.desc,
        severity: action.severity,
        score: next,
      });

      if (prev < 0.75 && next >= 0.75 && next < 0.85) {
        entries.push({
          id: uid(),
          ts: nowTs(),
          label: 'Pre-revocation warning dispatched',
          desc: 'Risk score ≥ 0.75 threshold crossed. Notification pushed to /api/v1/notifications. Auto-revocation fires at 0.85.',
          severity: 'system',
          score: next,
        });
      }

      if (prev < 0.85 && next >= 0.85) {
        entries.push({
          id: uid(),
          ts: nowTs(),
          label: 'CERTIFICATE REVOKED',
          desc: 'Serial #4A:1B:9C:D3:88 revoked. CRL updated. Webhook dispatched. Agent blocked at gateway layer. KMS key scheduled for deletion.',
          severity: 'revoke',
          score: next,
        });
      }

      setLog(l => [...l, ...entries]);
      return next;
    });
  }

  function reset() {
    _uid = 1;
    setScore(INIT_SCORE);
    setLog(makeInitLog());
  }

  const fillLength = HALF_CIRC * Math.min(score, 1);
  const scoreInt = Math.round(score * 100);
  const strokeColor =
    phase === 'revoked' ? '#D8514B' :
    phase === 'warning'  ? '#D29329' : '#2B934F';

  return (
    <div className="sb-shell">
      {/* macOS-style top bar */}
      <div className="sb-topbar">
        <span className="sb-topbar-dot sb-dot-red" />
        <span className="sb-topbar-dot sb-dot-amber" />
        <span className="sb-topbar-dot sb-dot-green" />
        <span className="sb-topbar-title">kakunin-sandbox — compliance monitor</span>
      </div>

      <div className="sb-body">
        {/* ---- Left: agent cert card ---- */}
        <div className="sb-panel sb-panel--cert">
          <div className="sb-label">AGENT IDENTITY</div>

          <div className={`sb-status-badge sb-status--${phase}`}>
            {phase === 'active'  && '● ACTIVE'}
            {phase === 'warning' && '▲ WARNING'}
            {phase === 'revoked' && '✕ REVOKED'}
          </div>

          {[
            ['CN',          'trading-agent-003'],
            ['O',           'demo-fintech'],
            ['OU',          'agent-fleet'],
            ['Serial',      '4A:1B:9C:D3:88'],
            ['Issuer',      'Kakunin CA'],
            ['Key',         'RSA-2048 (KMS)'],
            ['Valid until', phase === 'revoked' ? '——' : '2027-05-24'],
            ['Scope',       'read:accounts, read:market-data'],
          ].map(([k, v]) => (
            <div className="sb-cert-field" key={k}>
              <span className="sb-cert-key">{k}</span>
              <span className="sb-cert-val" style={k === 'Valid until' && phase === 'revoked' ? { color: '#D8514B' } : undefined}>
                {v}
              </span>
            </div>
          ))}

          {phase === 'revoked' && (
            <div className="sb-revoked-overlay">
              <span>REVOKED</span>
            </div>
          )}
        </div>

        {/* ---- Center: risk gauge ---- */}
        <div className="sb-panel sb-panel--gauge">
          <div className="sb-label">RISK SCORE</div>

          <div className="sb-gauge-wrap">
            <svg viewBox="0 0 200 110" className="sb-gauge-svg" aria-hidden="true">
              {/* background arc */}
              <circle
                cx="100" cy="100" r={RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${HALF_CIRC} ${CIRC}`}
                strokeDashoffset={HALF_CIRC}
              />
              {/* fill arc */}
              <circle
                cx="100" cy="100" r={RADIUS}
                fill="none"
                stroke={strokeColor}
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={`${fillLength} ${CIRC}`}
                strokeDashoffset={HALF_CIRC}
                style={{ transition: 'stroke-dasharray 0.35s ease, stroke 0.35s ease' }}
              />
              {/* 0.75 marker */}
              <circle
                cx={100 + RADIUS * Math.cos(Math.PI * (1 - 0.75))}
                cy={100 - RADIUS * Math.sin(Math.PI * (1 - 0.75))}
                r="4"
                fill="#D29329"
                opacity="0.6"
              />
              {/* 0.85 marker */}
              <circle
                cx={100 + RADIUS * Math.cos(Math.PI * (1 - 0.85))}
                cy={100 - RADIUS * Math.sin(Math.PI * (1 - 0.85))}
                r="4"
                fill="#D8514B"
                opacity="0.6"
              />
            </svg>
            <div className="sb-gauge-num" style={{ color: strokeColor }}>
              {scoreInt}<span className="sb-gauge-pct">%</span>
            </div>
          </div>

          <div className="sb-gauge-band">
            {phase === 'revoked' ? 'HIGH RISK — REVOKED' :
             phase === 'warning'  ? 'HIGH RISK — PRE-REVOCATION' :
             'WITHIN THRESHOLD'}
          </div>

          <div className="sb-thresholds">
            <span>▲ 0.75 warn</span>
            <span>✕ 0.85 revoke</span>
          </div>

          {phase === 'warning' && (
            <div className="sb-alert sb-alert--warning">
              ▲ Pre-revocation warning active. One more breach triggers auto-revoke.
            </div>
          )}
          {phase === 'revoked' && (
            <div className="sb-alert sb-alert--revoked">
              ✕ Certificate revoked. Agent blocked at gateway. Reset to issue a new credential.
            </div>
          )}
        </div>

        {/* ---- Right: event log ---- */}
        <div className="sb-panel sb-panel--log">
          <div className="sb-label">EVENT LOG — {log.length} entries</div>
          <div className="sb-log-stream" ref={logRef}>
            {log.map(entry => (
              <div key={entry.id} className={`sb-log-entry sb-log--${entry.severity}`}>
                <div className="sb-log-meta">
                  <span className="sb-log-ts">{entry.ts}</span>
                  <span className={`sb-log-sev sb-sev--${entry.severity}`}>
                    {entry.severity === 'system' ? 'SYSTEM' :
                     entry.severity === 'revoke' ? 'REVOKE' :
                     entry.severity.toUpperCase()}
                  </span>
                  <span className="sb-log-score">risk:{(entry.score * 100).toFixed(0)}%</span>
                </div>
                <div className="sb-log-label">{entry.label}</div>
                <div className="sb-log-desc">{entry.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Actions bar ---- */}
      <div className="sb-actions">
        <div className="sb-actions-label">TRIGGER BEHAVIOR — click to simulate rogue agent actions</div>
        <div className="sb-action-btns">
          {ACTIONS.map(action => (
            <button
              key={action.id}
              className={`sb-action-btn sb-action--${action.severity}${phase === 'revoked' ? ' sb-action--disabled' : ''}`}
              onClick={() => trigger(action)}
              disabled={phase === 'revoked'}
            >
              <span className="sb-action-label">{action.label}</span>
              <span className="sb-action-delta">+{Math.round(action.delta * 100)}%</span>
            </button>
          ))}

          {phase === 'revoked' && (
            <button className="sb-action-btn sb-action--reset" onClick={reset}>
              ↺ Issue New Certificate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
