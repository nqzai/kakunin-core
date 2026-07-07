/**
 * P0 content-risk pilot — offline dogfood batch (RA-177).
 *
 * Pulls the N most recent agent (assistant) messages from chat_messages,
 * runs the FME-derived agent-output analyzer over each, and writes a dry-run
 * JSON report for hand-eval. Does NOT write to the DB and does NOT touch the
 * /api/v1/events hot path. See docs/FME_PILOT.md §5.
 *
 * Usage:
 *   npx tsx scripts/content-risk-pilot.ts [--limit 50] [--out report.json]
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + OPENROUTER_API_KEY
 *
 * The output report is git-ignored (see scripts/.gitignore note) — it may
 * contain message text; do NOT commit it.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { config } from 'dotenv';
import path from 'path';
import { analyzeAgentOutput } from '../src/lib/content-risk/analyze';
import type { AgentOutputRisk } from '../src/lib/content-risk/schema';

config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.error('❌  Missing OPENROUTER_API_KEY in .env.local');
  process.exit(1);
}

function arg(flag: string, def: string): string {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const LIMIT = parseInt(arg('--limit', '50'), 10);
const OUT = arg('--out', path.join(__dirname, '..', `content-risk-report-${Date.now()}.json`));

interface ReportRow {
  message_id: string;
  conversation_id: string | null;
  created_at: string | null;
  preview: string;
  result: AgentOutputRisk;
}

async function main() {
  const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

  console.log(`▶  Pulling ${LIMIT} most-recent assistant messages…`);
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, conversation_id, content, created_at, role')
    .eq('role', 'assistant')
    .order('created_at', { ascending: false })
    .limit(LIMIT);

  if (error) {
    console.error('❌  Query failed:', error.message);
    process.exit(1);
  }
  const rows = (data ?? []).filter((m) => typeof m.content === 'string' && m.content.trim().length > 0);
  console.log(`▶  Scoring ${rows.length} messages (temp 0, sequential to respect rate limits)…`);

  const report: ReportRow[] = [];
  let scored = 0;
  let flagged = 0;
  for (const m of rows) {
    try {
      const result = await analyzeAgentOutput(m.content as string);
      report.push({
        message_id: m.id as string,
        conversation_id: (m.conversation_id as string) ?? null,
        created_at: (m.created_at as string) ?? null,
        preview: (m.content as string).slice(0, 120),
        result,
      });
      scored++;
      if (result.risk_score >= 0.3) flagged++;
      process.stdout.write(
        `  [${scored}/${rows.length}] risk=${result.risk_score.toFixed(3)} ` +
          `techniques=${result.techniques.length} fallacies=${result.fallacies.length}\n`,
      );
    } catch (err) {
      console.error(`  -- skipped message ${m.id}:`, (err as Error).message);
    }
  }

  // Deterministic ordering in the report (highest risk first) for hand-eval.
  report.sort((a, b) => b.result.risk_score - a.result.risk_score);

  const summary = {
    generated_at: new Date().toISOString(),
    requested_limit: LIMIT,
    scored,
    flagged_at_0_3: flagged,
    mean_risk: scored ? report.reduce((a, r) => a + r.result.risk_score, 0) / scored : 0,
    provenance: report[0]?.result.provenance ?? null,
  };

  writeFileSync(OUT, JSON.stringify({ summary, rows: report }, null, 2));
  console.log(`\n✅  Wrote dry-run report → ${OUT}`);
  console.log(`   scored=${scored} flagged(≥0.3)=${flagged} mean_risk=${summary.mean_risk.toFixed(3)}`);
  console.log(`   ⚠️  report may contain message text — do NOT commit it.`);
}

main().catch((err) => {
  console.error('❌  Pilot failed:', err);
  process.exit(1);
});
