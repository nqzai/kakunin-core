/**
 * v2 live smoke suite.
 *
 * Exercises the v2 API surface against a running deployment: RFC 8693
 * delegation issue+verify, content-risk submission, forensics export, and the
 * OTLP connection lifecycle (connect → status → delete). Writes a public-safe
 * artifact to public/smoke-results.json that the /test-results page merges in.
 *
 * SAFETY: read-mostly. Delegation tokens are stateless; content-risk uses a
 * benign message (scores below the persist threshold, so nothing is written);
 * the OTLP connection is created and immediately deleted. The GitHub cert gate
 * is NOT run by default — it can revoke a cert + suspend the agent on a hard
 * fail — set KAKUNIN_SMOKE_RUN_GATE=1 to include it (use a throwaway agent).
 *
 * Env:
 *   KAKUNIN_API_BASE      default https://www.kakunin.ai
 *   KAKUNIN_API_KEY       required — a tenant API key (Bearer)
 *   KAKUNIN_TEST_AGENT_ID required — an agent UUID in that tenant
 *   KAKUNIN_SMOKE_RUN_GATE optional — '1' to also run the (mutating) cert gate
 *
 * Usage:  doppler run -- npx tsx scripts/v2-smoke.ts
 *         (or set the env vars manually)
 */

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Status = 'pass' | 'fail' | 'skip';
interface Check {
  name: string;
  status: Status;
  detail: string;
  ms: number;
}

const BASE = (process.env.KAKUNIN_API_BASE ?? 'https://www.kakunin.ai').replace(/\/$/, '');
const API_KEY = process.env.KAKUNIN_API_KEY ?? '';
const AGENT_ID = process.env.KAKUNIN_TEST_AGENT_ID ?? '';
const RUN_GATE = process.env.KAKUNIN_SMOKE_RUN_GATE === '1';

const checks: Check[] = [];

function authHeaders(): Record<string, string> {
  return { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' };
}

async function api(method: string, path: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: authHeaders(),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { status: res.status, json };
}

/** Run one named check; record pass/fail + a public-safe one-line detail. */
async function check(name: string, fn: () => Promise<string>): Promise<void> {
  const started = Date.now();
  try {
    const detail = await fn();
    checks.push({ name, status: 'pass', detail, ms: Date.now() - started });
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${name} — ${detail}`);
  } catch (err) {
    const detail = (err as Error).message;
    checks.push({ name, status: 'fail', detail, ms: Date.now() - started });
    // eslint-disable-next-line no-console
    console.log(`  ✗ ${name} — ${detail}`);
  }
}

function skip(name: string, detail: string): void {
  checks.push({ name, status: 'skip', detail, ms: 0 });
  // eslint-disable-next-line no-console
  console.log(`  – ${name} — ${detail}`);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

function data(json: unknown): Record<string, unknown> {
  const d = (json as { data?: unknown })?.data;
  return (d ?? {}) as Record<string, unknown>;
}

async function main(): Promise<void> {
  if (!API_KEY || !AGENT_ID) {
    // eslint-disable-next-line no-console
    console.error('KAKUNIN_API_KEY and KAKUNIN_TEST_AGENT_ID are required.');
    // Write a stub artifact so the CI git-add never fails on a missing file
    const dest = join(process.cwd(), 'public', 'smoke-results.json');
    writeFileSync(dest, JSON.stringify({
      ran_at: new Date().toISOString(),
      base_url: BASE,
      passed: 0, failed: 0, skipped: 0,
      error: 'KAKUNIN_API_KEY or KAKUNIN_TEST_AGENT_ID not set — smoke skipped',
      checks: [],
    }, null, 2) + '\n');
    process.exit(2);
  }

  // eslint-disable-next-line no-console
  console.log(`v2 smoke → ${BASE} (agent ${AGENT_ID.slice(0, 8)}…)`);

  // ── Delegation: issue → verify (RFC 8693 round-trip) ───────────────────────
  await check('delegation: issue + verify round-trip', async () => {
    const issued = await api('POST', `/api/v1/agents/${AGENT_ID}/delegation`, {
      chain: [
        { sub: 'smoke@kakunin.ai', type: 'human' },
        { sub: 'agent:smoke', type: 'agent' },
      ],
      scope: 'smoke:test',
      ttl_seconds: 120,
    });
    assert(issued.status === 200, `issue HTTP ${issued.status}`);
    const token = data(issued.json).token as string | undefined;
    assert(typeof token === 'string' && token.split('.').length === 3, 'no compact JWT returned');

    const verified = await api('POST', '/api/v1/delegation/verify', { token });
    assert(verified.status === 200, `verify HTTP ${verified.status}`);
    const v = data(verified.json);
    assert(v.valid === true, `token did not verify: ${String(v.reason ?? 'unknown')}`);
    const chain = (v.chain ?? []) as unknown[];
    assert(chain.length === 2, `chain length ${chain.length} (expected 2)`);
    return `valid token, ${chain.length}-link chain`;
  });

  // ── Delegation: a tampered token must be rejected ──────────────────────────
  await check('delegation: rejects a tampered token', async () => {
    const verified = await api('POST', '/api/v1/delegation/verify', { token: 'aaa.bbb.ccc' });
    assert(verified.status === 200, `HTTP ${verified.status}`);
    assert(data(verified.json).valid === false, 'tampered token was accepted');
    return 'rejected as expected';
  });

  // ── Content-risk: benign submission accepted (async, 202) ──────────────────
  await check('content-risk: accepts a submission (202)', async () => {
    const res = await api('POST', `/api/v1/agents/${AGENT_ID}/content-risk`, {
      text: 'Your certificate renews automatically next month; no action is needed on your part.',
      source: 'smoke',
    });
    assert(res.status === 202, `HTTP ${res.status} (expected 202 Accepted)`);
    assert(data(res.json).accepted === true, 'not accepted');
    return 'enqueued (benign text → scored async, below persist threshold)';
  });

  // ── Forensics: signed proof export (read-only) ─────────────────────────────
  await check('forensics: returns a signed proof', async () => {
    const res = await api('GET', `/api/v1/agents/${AGENT_ID}/forensics`);
    assert(res.status === 200, `HTTP ${res.status}`);
    const d = data(res.json);
    assert('proof' in d || 'timeline' in d || 'events' in d, 'no forensics payload');
    return 'forensics export OK';
  });

  // ── OTLP: connection lifecycle (connect → status → delete) ─────────────────
  await check('otlp: connect → status → delete lifecycle', async () => {
    const connect = await api('POST', '/api/v1/integrations/otlp', {
      endpoint_url: 'https://example.com/otlp',
    });
    assert(connect.status === 200, `connect HTTP ${connect.status}`);

    const status = await api('GET', '/api/v1/integrations/otlp');
    assert(data(status.json).configured === true, 'status not configured after connect');

    const del = await api('DELETE', '/api/v1/integrations/otlp');
    assert(del.status === 200, `delete HTTP ${del.status}`);
    assert(data(del.json).disabled === true, 'not disabled after delete');
    return 'connect/status/delete all OK (cleaned up)';
  });

  // ── GitHub cert gate (MUTATING — opt-in) ───────────────────────────────────
  if (RUN_GATE) {
    await check('github gate: returns a decision', async () => {
      const res = await api('POST', '/api/v1/integrations/github/gate', {
        agentId: AGENT_ID,
        commitSha: 'smoke',
        windowDays: 7,
      });
      assert(res.status === 200, `HTTP ${res.status}`);
      const decision = data(res.json).decision as string | undefined;
      assert(['pass', 'action_required', 'fail'].includes(decision ?? ''), `bad decision ${decision}`);
      return `decision=${decision} (note: a 'fail' would revoke the cert + suspend the agent)`;
    });
  } else {
    skip('github gate: returns a decision', 'mutating — set KAKUNIN_SMOKE_RUN_GATE=1 (throwaway agent only)');
  }

  // ── Summary + artifact ─────────────────────────────────────────────────────
  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const skipped = checks.filter((c) => c.status === 'skip').length;

  const artifact = {
    ran_at: new Date().toISOString(),
    base_url: BASE,
    passed,
    failed,
    skipped,
    checks,
  };
  const dest = join(process.cwd(), 'public', 'smoke-results.json');
  writeFileSync(dest, JSON.stringify(artifact, null, 2) + '\n');

  // eslint-disable-next-line no-console
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped → ${dest}`);
  process.exit(failed > 0 ? 1 : 0);
}

void main();
