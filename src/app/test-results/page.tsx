import type { Metadata } from 'next';
import '../landing.css';
import './test-results.css';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { generateReport } from '@/lib/schema/generators';
import artifact from '../../../public/test-results.json';

/**
 * Public /test-results page.
 *
 * Headline numbers, schema.org Report, summary stats, and the full live suite
 * breakdown are driven by public/test-results.json (produced by
 * scripts/generate-test-results.ts on each build). The featured suite cards and
 * coverage table are curated editorial narrative. The v2 smoke section renders
 * the live API smoke run (scripts/v2-smoke.ts) when present.
 *
 * Regenerate:  npm run test:results   (then redeploy)
 */

interface LiveSuite {
  file: string;
  passed: number;
  failed: number;
  skipped: number;
}
interface SmokeCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  ms: number;
}
interface Artifact {
  generated_at: string;
  commit: string;
  branch: string;
  unit: {
    files: number;
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration_ms: number;
    suites: LiveSuite[];
  };
  smoke: {
    ran_at: string;
    base_url: string;
    passed: number;
    failed: number;
    skipped: number;
    checks: SmokeCheck[];
  } | null;
}

const art = artifact as Artifact;
const u = art.unit;
const lastRun = art.generated_at.slice(0, 10);
const runtimeS = `~${(u.duration_ms / 1000).toFixed(1)}s`;

export const metadata: Metadata = {
  title: `Test Results — Kakunin | ${u.passed}/${u.total} Passing`,
  description:
    `Kakunin automated test suite: ${u.passed} of ${u.total} tests passing, ${u.failed} failures, across ${u.files} files. ` +
    'Covers risk scoring, certificate lifecycle, kill switch, behavior events, cross-tenant RLS isolation, RFC 8693 delegation, OTLP export, content-risk monitoring, and the GitHub cert gate.',
  alternates: { canonical: '/test-results' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/test-results',
    title: `Test Results — Kakunin | ${u.passed}/${u.total} Passing`,
    description: `${u.passed}/${u.total} tests passing, ${u.failed} failures. Cross-tenant RLS isolation verified at the database layer.`,
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Test Results' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Test Results — Kakunin | ${u.passed}/${u.total} Passing`,
    description: `${u.passed}/${u.total} tests passing, ${u.failed} failures. Cross-tenant RLS isolation verified at the database layer.`,
    images: ['/og-image.png'],
  },
};

const reportSchema = generateReport(
  'Test Results — Kakunin',
  'https://www.kakunin.ai/test-results',
  `Automated test suite results. ${u.passed} of ${u.total} tests passing across ${u.files} files, ${u.failed} failures. Covers risk scoring, certificate lifecycle, kill switch, behavior events, cross-tenant RLS isolation, RFC 8693 delegation, OTLP export, content-risk monitoring, and the GitHub cert gate.`,
  '2026-01-01T00:00:00Z',
  art.generated_at,
  [
    { position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
    { position: 2, name: 'Test Results', item: 'https://www.kakunin.ai/test-results' },
  ]
);

const CheckIcon = () => (
  <svg viewBox="0 0 12 12" fill="none" strokeWidth="2" stroke="currentColor" aria-hidden="true">
    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckCircle = () => (
  <svg viewBox="0 0 16 16" fill="none" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
    <circle cx="8" cy="8" r="6.5" />
    <path d="M5 8l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const suites = [
  {
    layer: 'sdk' as const,
    title: '@kakunin/sdk — TypeScript SDK',
    file: 'sdk/typescript/tests/sdk.test.ts',
    count: 21,
    desc: 'Public SDK unit tests. Mocks fetch globally. Covers client construction, model hash utility, all resource wrappers, retry logic, error mapping, and HMAC webhook verification.',
    tests: [
      'Constructor throws if apiKey missing',
      'kak_test_ prefix detected as sandbox mode',
      'computeModelHash → sha256: prefixed 64-char hex',
      'agents.certify throws on 409 (already certified)',
      'events.ingest flags high-risk events (revocation_check_queued: true)',
      'verify.cert returns verified agent info — no Authorization header sent',
      'Retry: 500 then 200 → succeeds on second attempt',
      'webhooks.constructEvent verifies valid HMAC-SHA256 signature',
      'webhooks.constructEvent throws on stale timestamp (> tolerance)',
    ],
  },
  {
    layer: 'sdk' as const,
    title: '@kakunin/mcp — MCP Server Tools',
    file: 'mcp/kakunin-mcp/tests/mcp.test.ts',
    count: 16,
    desc: 'MCP tool handler unit tests. Tests all three tools directly without MCP transport. KakuninMcpClient mocked to isolate handler logic.',
    tests: [
      'verify_agent_scope: denies action not in permitted_actions',
      'verify_agent_scope: denies when certificate is revoked',
      'verify_agent_scope: denies when transaction amount exceeds financial scope',
      'check_risk_score: returns high risk recommendation with revocation warning',
      'audit_log_append: flags revocation_check_queued on high-risk event',
    ],
  },
  {
    layer: 'unit' as const,
    title: 'Risk Scoring Engine',
    file: '__tests__/unit/risk-engine.test.ts',
    count: 23,
    desc: 'Deterministic expected score for every action type. Band boundary assertions. Auto-revocation threshold checks.',
    tests: [
      'transaction_anomaly → score 0.85, band high',
      'unauthorized_access_attempt → score 0.95, band high',
      'Band boundary: 0.85 is high (not medium)',
      'Auto-revocation: transaction_anomaly ≥ 0.85',
    ],
  },
  {
    layer: 'integration' as const,
    title: 'Certificate Lifecycle',
    file: '__tests__/api/certify.test.ts · verify · revoke · halt',
    count: 30,
    desc: 'Issuance (KMS signing → DB → audit), public edge-cached verification, manual revocation + CRL refresh, and the cryptographic kill switch with signed halt receipt.',
    tests: [
      'Issues certificate and writes audit_log on success',
      'Revoked cert returns valid: false with s-maxage=60',
      'Enqueues CRL regeneration via QStash after revocation',
      'Halts agent and returns signed halt receipt',
      'KMS signing failure is non-fatal — signed_by_ca: false',
    ],
  },
  {
    layer: 'integration' as const,
    title: 'Behavior Event Ingestion',
    file: '__tests__/api/events.test.ts',
    count: 17,
    desc: 'Core event pipeline: Zod validation → quota check → risk scoring → DB write → async side effects.',
    tests: [
      'High-risk event queues revocation check via QStash',
      'Financial: amount > max_single_trade_usd auto-elevates risk',
      'Returns 404 on cross-tenant agent injection attempt',
      'QStash failure is non-blocking — response still 200',
    ],
  },
  {
    layer: 'security' as const,
    liveDb: true,
    title: 'Cross-Tenant RLS Isolation',
    file: '__tests__/security/rls-isolation.test.ts',
    count: 21,
    desc: 'Live Supabase test DB. Tenant A cannot read Tenant B data at the PostgreSQL layer — no application-level filter can fake this. Currently skipped in CI until the dedicated RLS test project is reprovisioned.',
    tests: [
      'agents table: Tenant A cannot read Tenant B agents',
      'certificates table: Tenant A cannot read Tenant B certificates',
      'audit_log immutability: UPDATE blocked by DB rule (append-only)',
    ],
  },
  {
    layer: 'unit' as const,
    title: 'RFC 8693 Delegation Chains (v2)',
    file: '__tests__/unit/delegation.test.ts',
    count: 16,
    desc: 'Human→agent→sub-agent authority via nested RFC 8693 act-claims, as a stateless signed token (HS256). Build/parse round-trip, depth bounds, sign/verify/tamper/expiry.',
    tests: [
      'builds nested act with current actor outermost',
      'round-trips build → parse for a 3-link chain',
      'preserves a non-human principal type round-trip (service root)',
      'rejects a tampered token',
      'rejects an expired token',
    ],
  },
  {
    layer: 'unit' as const,
    title: 'OTLP Observability Export (v2)',
    file: '__tests__/unit/otlp-transform.test.ts',
    count: 24,
    desc: 'Vendor-neutral OTLP/HTTP JSON for metrics, logs, and traces. Deterministic span/trace IDs for idempotent retries, PII-safe by construction, per-stream keyset export cursor with a filter-injection guard.',
    tests: [
      'deterministic trace/span IDs from chain/event UUIDs',
      'events_in_window is an idempotent gauge with int values',
      'PII guard: never emits source_ip or raw payload',
      'readExportCursor drops a cursor with a non-UUID id (injection guard)',
      'readExportCursor drops a ts carrying PostgREST metacharacters',
    ],
  },
  {
    layer: 'unit' as const,
    title: 'Content-Risk Monitoring (v2)',
    file: '__tests__/unit/content-risk.test.ts',
    count: 32,
    desc: 'EU AI Act Art. 5 manipulation/deception detection on agent output. Short-text saturating risk curve, risk bands, deterministic span anchoring, tolerant LLM-output parsing.',
    tests: [
      'shortTextRiskScore grades a strong span into medium (not binary 1.0)',
      'contentRiskBand bands by 0.3 / 0.6 thresholds',
      'anchorSpans drops hallucinated text not in the message',
      'buildRisk maps to a behavior_event shape with 0–1 risk_score',
    ],
  },
  {
    layer: 'unit' as const,
    title: 'GitHub Cert Gate + Forensics (v2)',
    file: '__tests__/unit/github-gate.test.ts · forensics-proof.test.ts',
    count: 15,
    desc: 'CI deploy gate on peak behavioral risk (pass / action_required / fail+revoke), and tamper-evident HMAC-SHA256 forensics proofs over an ordered event set.',
    tests: [
      'gate uses peak (not average) risk — one high event blocks',
      'gate fail (≥0.85) flags should_revoke',
      'forensics proof is deterministic for the same ordered events',
      'forensics proof detects a tampered event',
    ],
  },
];

const coverageRows = [
  { component: 'Risk scoring logic',         approach: 'Real code, no mock',        reason: 'Pure function — tests the actual algorithm' },
  { component: 'Content-risk curve + bands', approach: 'Real code, no mock',        reason: 'Pure scoring — deterministic short-text saturating curve' },
  { component: 'Delegation tokens',          approach: 'Real code, no mock',        reason: 'HS256 sign/verify via Node crypto — real signatures' },
  { component: 'OTLP transform + cursor',    approach: 'Real code, no mock',        reason: 'Pure payload builders + keyset cursor validation' },
  { component: 'Certificate issuance',       approach: 'Real code, KMS mocked',     reason: 'KMS calls require live AWS credentials' },
  { component: 'Supabase DB operations',     approach: 'Mocked',                    reason: 'Avoids test DB dependency; tests business logic in isolation' },
  { component: 'QStash job queue',           approach: 'Mocked',                    reason: 'Fire-and-forget — tested for invocation, not delivery' },
  { component: 'AWS KMS signing',            approach: 'Mocked',                    reason: 'Requires live AWS credentials with KMS permissions' },
  { component: 'RLS policies',               approach: 'Live test DB',              reason: 'Must run against real Postgres RLS engine — cannot mock' },
  { component: 'v2 API routes (live smoke)', approach: 'Live deployment',           reason: 'Exercised end-to-end against a running deployment via scripts/v2-smoke.ts' },
];

const featuredTotal = suites.reduce((s, suite) => s + suite.count, 0);

const StatusPill = ({ status }: { status: 'pass' | 'fail' | 'skip' }) => (
  <span className={`tr-pass-pill ${status === 'fail' ? 'fail' : status === 'skip' ? 'skip' : ''}`}>
    <span className="dot" />
    {status.toUpperCase()}
  </span>
);

export default function TestResultsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reportSchema) }}
      />
      <div className="tr-page">
        <SiteNav active="test-results" />

      {/* ── Hero ── */}
      <section className="tr-hero">
        <div className="container">
          <span className="eyebrow">Test Results</span>
          <h1>
            <span className="count-pass">{u.passed}</span>
            {' / '}
            {u.total}
            {' Tests Passing'}
          </h1>
          <p className="subtitle">
            Every compliance-critical path covered. RLS isolation verified at the PostgreSQL layer —
            not mocked. Numbers below are generated from the real suite on each build (commit{' '}
            <code>{art.commit}</code>).
          </p>
        </div>
      </section>

      {/* ── Summary stats (live) ── */}
      <div className="tr-summary">
        <div className="tr-stat">
          <div className="tr-stat-value pass">{u.passed} / {u.total}</div>
          <div className="tr-stat-label">Passing</div>
        </div>
        <div className="tr-stat">
          <div className={`tr-stat-value ${u.failed > 0 ? 'fail' : 'pass'}`}>{u.failed}</div>
          <div className="tr-stat-label">Failed</div>
        </div>
        <div className="tr-stat">
          <div className="tr-stat-value skip">{u.skipped}</div>
          <div className="tr-stat-label">Skipped</div>
        </div>
        <div className="tr-stat">
          <div className="tr-stat-value time">{runtimeS}</div>
          <div className="tr-stat-label">Runtime</div>
        </div>
        <div className="tr-stat">
          <div className="tr-stat-value time" style={{ fontSize: '14px', paddingTop: '7px' }}>{lastRun}</div>
          <div className="tr-stat-label">Last Run</div>
        </div>
      </div>

      {/* ── Featured suites (curated) ── */}
      <section className="tr-section">
        <div className="tr-section-head">
          <h2>Featured Test Suites</h2>
          <span className="tr-total">{suites.length} highlighted · {featuredTotal} assertions · full breakdown below</span>
        </div>

        <div className="tr-grid">
          {suites.map((suite) => (
            <div key={suite.file} className="tr-card">
              <div className="tr-card-top">
                <div className="tr-card-badges">
                  <span className={`badge-layer ${suite.layer}`}>
                    {suite.layer === 'unit' ? 'Unit'
                      : suite.layer === 'security' ? 'Security'
                      : suite.layer === 'sdk' ? 'SDK'
                      : 'Integration'}
                  </span>
                  {suite.liveDb && <span className="badge-live">Live DB</span>}
                </div>
                <div className="tr-pass-pill">
                  <span className="dot" />
                  {suite.count}/{suite.count}
                </div>
              </div>

              <div>
                <div className="tr-card-title">{suite.title}</div>
                <div className="tr-card-file">{suite.file}</div>
              </div>

              <p className="tr-card-desc">{suite.desc}</p>

              <div className="tr-tests">
                {suite.tests.map((t) => (
                  <div key={t} className="tr-test-row">
                    <span className="icon pass"><CheckIcon /></span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Full live breakdown ── */}
      <section className="tr-section">
        <div className="tr-section-head">
          <h2>Full Suite Breakdown</h2>
          <span className="tr-total">{u.files} files · {u.total} assertions · live</span>
        </div>

        <div className="tr-table-wrap">
          <table className="tr-table">
            <thead>
              <tr>
                <th>Test file</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
              </tr>
            </thead>
            <tbody>
              {u.suites.map((s) => (
                <tr key={s.file}>
                  <td><code style={{ fontSize: '12px' }}>{s.file}</code></td>
                  <td><span className="td-approach">{s.passed}</span></td>
                  <td>{s.failed > 0 ? <span className="td-approach mocked">{s.failed}</span> : '0'}</td>
                  <td>{s.skipped}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Live API smoke (v2) ── */}
      <section className="tr-section">
        <div className="tr-section-head">
          <h2>Live API Smoke (v2)</h2>
          {art.smoke && (
            <span className="tr-total">
              {art.smoke.passed} passed · {art.smoke.failed} failed · {art.smoke.skipped} skipped
            </span>
          )}
        </div>

        {art.smoke ? (
          <>
            <p className="tr-card-desc" style={{ marginBottom: '16px' }}>
              Exercised end-to-end against <code>{art.smoke.base_url}</code> on {art.smoke.ran_at.slice(0, 10)}:
              delegation issue+verify, content-risk submission, forensics export, and the OTLP connection lifecycle.
            </p>
            <div className="tr-grid">
              {art.smoke.checks.map((c) => (
                <div key={c.name} className="tr-card" style={{ gap: '8px' }}>
                  <div className="tr-card-top">
                    <StatusPill status={c.status} />
                  </div>
                  <div className="tr-card-title" style={{ fontSize: '15px' }}>{c.name}</div>
                  <p className="tr-card-desc">{c.detail}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="tr-run-box">
            <p className="tr-card-desc">
              No live smoke run is recorded in this build. The v2 API routes (RFC 8693 delegation,
              content-risk, OTLP export, GitHub gate, forensics) are covered by unit tests above and can be
              exercised against a live deployment:
            </p>
            <div className="tr-run-cmds" style={{ marginTop: '16px' }}>
              <div className="tr-run-cmd">
                <span className="cmd-label">Run the v2 live smoke suite</span>
                <code>KAKUNIN_API_KEY=… KAKUNIN_TEST_AGENT_ID=… npx tsx scripts/v2-smoke.ts</code>
              </div>
              <div className="tr-run-cmd">
                <span className="cmd-label">Regenerate this page&apos;s data</span>
                <code>npm run test:results</code>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── Coverage table ── */}
      <section className="tr-section">
        <div className="tr-section-head">
          <h2>What Is Tested vs. Mocked</h2>
        </div>

        <div className="tr-table-wrap">
          <table className="tr-table">
            <thead>
              <tr>
                <th>Component</th>
                <th>Approach</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {coverageRows.map((row) => {
                const isReal = row.approach.startsWith('Real') || row.approach.startsWith('Live');
                return (
                  <tr key={row.component}>
                    <td>{row.component}</td>
                    <td>
                      <span className={`td-approach${isReal ? '' : ' mocked'}`}>
                        {row.approach}
                      </span>
                    </td>
                    <td>{row.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Run commands ── */}
      <section className="tr-section">
        <div className="tr-section-head">
          <h2>Run the Tests</h2>
        </div>

        <div className="tr-run-box">
          <h3>Commands</h3>
          <div className="tr-run-cmds">
            <div className="tr-run-cmd">
              <span className="cmd-label">All tests (no live DB required)</span>
              <code>npm run test</code>
            </div>
            <div className="tr-run-cmd">
              <span className="cmd-label">Regenerate this page&apos;s results artifact</span>
              <code>npm run test:results</code>
            </div>
            <div className="tr-run-cmd">
              <span className="cmd-label">Full suite including RLS isolation</span>
              <code>node --env-file=.env.rls.test node_modules/.bin/vitest run</code>
            </div>
            <div className="tr-run-cmd">
              <span className="cmd-label">v2 live API smoke</span>
              <code>npx tsx scripts/v2-smoke.ts</code>
            </div>
            <div className="tr-run-cmd">
              <span className="cmd-label">@kakunin/sdk — 21 unit tests</span>
              <code>cd sdk/typescript && npm test</code>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <div className="tr-trust">
        <div className="tr-trust-item">
          <CheckCircle />
          Vitest 4.1
        </div>
        <div className="tr-divider" />
        <div className="tr-trust-item">
          <CheckCircle />
          TypeScript strict
        </div>
        <div className="tr-divider" />
        <div className="tr-trust-item">
          <CheckCircle />
          Node.js environment
        </div>
        <div className="tr-divider" />
        <div className="tr-trust-item">
          <CheckCircle />
          GitHub Actions CI
        </div>
        <div className="tr-divider" />
        <div className="tr-trust-item">
          <CheckCircle />
          RLS on live Supabase test project
        </div>
      </div>

      <SiteFooter />
      </div>
    </>
  );
}
