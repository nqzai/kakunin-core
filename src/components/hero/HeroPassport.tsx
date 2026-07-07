'use client';

import { useEffect } from 'react';

/**
 * HeroPassport — live verification pipeline animation.
 * Cycles through 6 region-neutral agent personas; each goes:
 *   VERIFYING → field-by-field tick validation → trust score count-up → VERIFIED seal stamp.
 * Ported from Claude Design: Landing Page v2.html
 */
export function HeroPassport() {
  useEffect(() => {
    const ppEl = document.getElementById('kkn-passport');
    if (!ppEl) return;
    const pp = ppEl as HTMLElement;
    const g = (id: string) => document.getElementById(id) as HTMLElement | null;

    const personas = [
      { name: 'Invoicing Bot',  init: 'IB', meta: 'v3.2 · agt_8f3c2a91d4', op: 'Northwind Trading', scope: 'write:drafts',    valid: '2027 · 04 · 11', serial: 'c4f9 · 17a2', score: 94, delta: '↑ +2 last 7d' },
      { name: 'Trade Executor', init: 'TE', meta: 'v1.8 · agt_61aa09c7e2', op: 'Meridian Capital',  scope: 'execute:trades', valid: '2027 · 02 · 28', serial: '7b21 · 9f0a', score: 91, delta: '↑ +1 last 7d' },
      { name: 'Support Triage', init: 'ST', meta: 'v4.0 · agt_44b1c8d309', op: 'Helio Labs',        scope: 'read:tickets',   valid: '2027 · 06 · 02', serial: 'a3f8 · 22c1', score: 97, delta: '↑ +3 last 7d' },
      { name: 'Data Pipeline',  init: 'DP', meta: 'v2.5 · agt_9e5fb1a740', op: 'Atlas Systems',     scope: 'read:datasets',  valid: '2027 · 05 · 19', serial: 'd0c4 · 18be', score: 88, delta: '↑ +2 last 7d' },
      { name: 'Outreach Agent', init: 'OA', meta: 'v3.1 · agt_3b40992f6c', op: 'Brightwave',        scope: 'send:email',     valid: '2027 · 03 · 07', serial: 'f29a · 5d11', score: 93, delta: '↑ +1 last 7d' },
      { name: 'Ledger Watcher', init: 'LW', meta: 'v2.0 · agt_22b8c0a915', op: 'Summit Robotics',   scope: 'read:ledger',    valid: '2027 · 07 · 14', serial: '5da0 · 14ef', score: 96, delta: '↑ +2 last 7d' },
    ];

    const els = {
      status: g('kkn-ppStatus'), avatar: g('kkn-ppAvatar'), name: g('kkn-ppName'),
      meta:   g('kkn-ppMeta'),   op:     g('kkn-ppOp'),     scope: g('kkn-ppScope'),
      valid:  g('kkn-ppValid'),  serial: g('kkn-ppSerial'), score: g('kkn-ppScore'),
      delta:  g('kkn-ppDelta'),  fill:   g('kkn-ppFill'),   count: g('kkn-issueCount'),
      q1n:    g('kkn-q1Name'),   q1o:    g('kkn-q1Op'),     q2n:   g('kkn-q2Name'),    q2o: g('kkn-q2Op'),
    };

    const fields = pp.querySelectorAll<HTMLElement>('.pp-field');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let idx = 0, count = 12481;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function after(ms: number, fn: () => void) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers.length = 0; }

    function set(el: HTMLElement | null, val: string) { if (el) el.textContent = val; }

    function setData(p: typeof personas[0]) {
      set(els.avatar, p.init); set(els.name, p.name);   set(els.meta,   p.meta);
      set(els.op,     p.op);   set(els.scope, p.scope); set(els.valid,  p.valid);
      set(els.serial, p.serial); set(els.delta, p.delta);
    }

    function setQueue() {
      const n1 = personas[(idx + 1) % personas.length];
      const n2 = personas[(idx + 2) % personas.length];
      set(els.q1n, n1.name); set(els.q1o, n1.op);
      set(els.q2n, n2.name); set(els.q2o, n2.op);
    }

    function countTo(target: number, dur: number) {
      const start = performance.now();
      function step(now: number) {
        const t = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        set(els.score, String(Math.round(target * e)));
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function bump() {
      count += 1 + Math.floor(Math.random() * 4);
      set(els.count, count.toLocaleString('en-US'));
    }

    function cycle() {
      clearTimers();
      const p = personas[idx];
      pp.classList.remove('verified', 'exiting');
      fields.forEach(f => f.classList.remove('ok'));
      set(els.status, 'VERIFYING');
      if (els.fill) (els.fill as HTMLElement).style.width = '0%';
      set(els.score, '0');

      pp.classList.remove('swap');
      void (pp as HTMLElement).offsetWidth; // force reflow for animation restart
      setData(p); setQueue();
      pp.classList.add('swap');

      if (reduce) {
        fields.forEach(f => f.classList.add('ok'));
        pp.classList.add('verified');
        set(els.status, 'VERIFIED');
        if (els.fill) (els.fill as HTMLElement).style.width = p.score + '%';
        set(els.score, String(p.score));
        bump();
        after(4200, next);
        return;
      }

      fields.forEach((f, k) => {
        after(550 + k * 320, () => f.classList.add('ok'));
      });
      after(750,  () => countTo(p.score, 1500));
      after(2150, () => {
        pp.classList.add('verified');
        set(els.status, 'VERIFIED');
        if (els.fill) (els.fill as HTMLElement).style.width = p.score + '%';
        bump();
      });
      after(5300, () => pp.classList.add('exiting'));
      after(5750, next);
    }

    function next() { idx = (idx + 1) % personas.length; cycle(); }

    // Gentle ambient counter drift
    const driftInterval = setInterval(() => {
      if (!reduce && Math.random() < 0.5) {
        count += 1;
        set(els.count, count.toLocaleString('en-US'));
      }
    }, 2400);

    cycle();

    return () => {
      clearTimers();
      clearInterval(driftInterval);
    };
  }, []);

  return (
    <div className="hero-visual">
      <div className="rings">
        <div className="ring r1"></div>
        <div className="ring r2"></div>
        <div className="ring r3"></div>
      </div>

      {/* Live issuance HUD */}
      <div className="issue-hud">
        <span className="dot"></span>
        <span>LIVE</span>
        <b id="kkn-issueCount">12,481</b>
        <span>issued today</span>
      </div>

      {/* Next-in-line preview cards */}
      <div className="queue-card q1">
        <div className="pp-head">
          <span>NEXT IN LINE</span>
          <span>QUEUED</span>
        </div>
        <div className="q-body">
          <div className="q-name" id="kkn-q1Name">Trade Executor</div>
          <div className="q-op"   id="kkn-q1Op">Meridian Capital</div>
          <div className="lineish" style={{ width: '70%' }}></div>
          <div className="lineish" style={{ width: '45%' }}></div>
        </div>
      </div>

      <div className="queue-card q2">
        <div className="pp-head">
          <span>NEXT IN LINE</span>
          <span>QUEUED</span>
        </div>
        <div className="q-body">
          <div className="q-name" id="kkn-q2Name">Support Triage</div>
          <div className="q-op"   id="kkn-q2Op">Helio Labs</div>
          <div className="lineish" style={{ width: '55%' }}></div>
          <div className="lineish" style={{ width: '80%' }}></div>
        </div>
      </div>

      {/* Main passport — live verification slot */}
      <div className="passport" id="kkn-passport">
        <div className="pp-head">
          <span>AGENT PASSPORT &middot; KKN-2026</span>
          <span className="pp-status" id="kkn-ppStatus">VERIFYING</span>
        </div>

        <div className="pp-name">
          <div className="pp-avatar" id="kkn-ppAvatar">IB</div>
          <div className="pp-name-meta">
            <b id="kkn-ppName">Invoicing Bot</b>
            <span id="kkn-ppMeta">v3.2 &middot; agt_8f3c2a91d4</span>
          </div>
        </div>

        <div className="pp-row">
          <div className="pp-field">
            <span className="l">Operator</span>
            <span className="v" id="kkn-ppOp">Northwind Trading</span>
            <span className="tick">✓</span>
          </div>
          <div className="pp-field">
            <span className="l">Scope</span>
            <span className="v green" id="kkn-ppScope">write:drafts</span>
            <span className="tick">✓</span>
          </div>
          <div className="pp-field">
            <span className="l">Valid until</span>
            <span className="v" id="kkn-ppValid">2027 &middot; 04 &middot; 11</span>
            <span className="tick">✓</span>
          </div>
          <div className="pp-field">
            <span className="l">Serial</span>
            <span className="v" id="kkn-ppSerial">c4f9 &middot; 17a2</span>
            <span className="tick">✓</span>
          </div>
        </div>

        <div className="pp-trust">
          <div className="row">
            <span>30-day trust score</span>
            <span id="kkn-ppDelta" style={{ color: 'var(--green-deep)' }}>↑ +2 last 7d</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="score" id="kkn-ppScore">0</span>
            <span style={{ fontFamily: 'var(--ff-mono)', fontSize: '11px', color: 'var(--ink-3)' }}>
              / 100
            </span>
          </div>
          <div className="bar">
            <div className="fill" id="kkn-ppFill"></div>
          </div>
        </div>

        <div className="pp-seal">VERI<br />FIED</div>
      </div>

      <div className="scan-line"></div>
    </div>
  );
}
