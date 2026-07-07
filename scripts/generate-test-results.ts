/**
 * Test-results artifact generator.
 *
 * Runs the unit suite with vitest's JSON reporter, aggregates it into a
 * public-safe summary, and writes public/test-results.json — the data source
 * for the public /test-results page. If a smoke-suite artifact exists
 * (public/smoke-results.json, produced by scripts/v2-smoke.ts), it is merged in.
 *
 * Public-safe by construction: emits only suite/test names, pass/fail counts,
 * durations, timestamp, and the commit SHA. No stack traces, no file system
 * paths beyond the repo-relative test file, no secrets, no tenant data.
 *
 * Usage:  npx tsx scripts/generate-test-results.ts
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface VitestAssertion {
  title: string;
  status: string; // 'passed' | 'failed' | 'pending' | 'skipped'
}
interface VitestFileResult {
  name: string;
  assertionResults: VitestAssertion[];
}
interface VitestJson {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  startTime?: number;
  testResults: VitestFileResult[];
}

interface SuiteSummary {
  file: string; // repo-relative test file name
  passed: number;
  failed: number;
  skipped: number;
}

function gitShort(): string {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim();
  } catch {
    return 'unknown';
  }
}

function gitBranch(): string {
  try {
    return execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
  } catch {
    return 'unknown';
  }
}

/** Strip any absolute path prefix, keep the repo-relative test file. */
function repoRelative(name: string): string {
  const cwd = process.cwd();
  return name.startsWith(cwd) ? name.slice(cwd.length + 1) : name;
}

function runUnit(): { json: VitestJson; durationMs: number } {
  const dir = mkdtempSync(join(tmpdir(), 'kakunin-tests-'));
  const out = join(dir, 'results.json');
  const started = Date.now();
  try {
    execFileSync('npx', ['vitest', 'run', '--reporter=json', `--outputFile=${out}`], {
      stdio: ['ignore', 'ignore', 'inherit'],
      env: process.env,
    });
  } catch {
    // vitest exits non-zero when tests fail — we still want to read the report.
  }
  const durationMs = Date.now() - started;
  if (!existsSync(out)) {
    throw new Error('vitest did not produce a JSON report');
  }
  const json = JSON.parse(readFileSync(out, 'utf8')) as VitestJson;
  rmSync(dir, { recursive: true, force: true });
  return { json, durationMs };
}

function summarize(json: VitestJson): SuiteSummary[] {
  return json.testResults
    .map((f) => {
      let passed = 0;
      let failed = 0;
      let skipped = 0;
      for (const a of f.assertionResults) {
        if (a.status === 'passed') passed += 1;
        else if (a.status === 'failed') failed += 1;
        else skipped += 1;
      }
      return { file: repoRelative(f.name), passed, failed, skipped };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

function main(): void {
  const { json, durationMs } = runUnit();
  const suites = summarize(json);

  const smokePath = join(process.cwd(), 'public', 'smoke-results.json');
  const smoke = existsSync(smokePath)
    ? (JSON.parse(readFileSync(smokePath, 'utf8')) as unknown)
    : null;

  const artifact = {
    generated_at: new Date().toISOString(),
    commit: gitShort(),
    branch: gitBranch(),
    unit: {
      files: json.testResults.length,
      total: json.numTotalTests,
      passed: json.numPassedTests,
      failed: json.numFailedTests,
      skipped: json.numPendingTests,
      duration_ms: durationMs,
      suites,
    },
    smoke,
  };

  const dest = join(process.cwd(), 'public', 'test-results.json');
  writeFileSync(dest, JSON.stringify(artifact, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${dest} — ${artifact.unit.passed}/${artifact.unit.total} passed across ${artifact.unit.files} files` +
      (smoke ? ' (+ smoke results merged)' : ''),
  );
}

main();
