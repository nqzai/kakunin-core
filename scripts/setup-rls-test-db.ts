/**
 * RLS Test DB Setup Script
 *
 * Pushes all migrations to the dedicated RLS test Supabase project,
 * seeds two isolated tenants (A and B), creates auth users for each,
 * and writes the required env vars to .env.rls.test
 *
 * Usage:
 *   node --env-file=.env.rls.setup npx tsx scripts/setup-rls-test-db.ts
 *
 * Required env vars (set in .env.rls.setup — gitignored):
 *   RLS_TEST_SUPABASE_URL        e.g. https://xxxx.supabase.co
 *   RLS_TEST_ANON_KEY            anon/public key for the test project
 *   RLS_TEST_SERVICE_ROLE_KEY    service role key for the test project
 *   RLS_TEST_DB_PASSWORD         postgres DB password for the test project
 *
 * NEVER run against prod or dev project.
 */

import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import path from 'path';

// ── Test project credentials — read from env, never hardcoded ────────────────
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}. Set it in .env.rls.setup`);
  return v;
}

const TEST_SUPABASE_URL     = requireEnv('RLS_TEST_SUPABASE_URL');
const TEST_ANON_KEY         = requireEnv('RLS_TEST_ANON_KEY');
const TEST_SERVICE_ROLE_KEY = requireEnv('RLS_TEST_SERVICE_ROLE_KEY');
const DB_PASSWORD           = requireEnv('RLS_TEST_DB_PASSWORD');

// Extract host from URL: https://xxxx.supabase.co → db.xxxx.supabase.co
const projectRef = new URL(TEST_SUPABASE_URL).hostname.split('.')[0];
const DB_URL = `postgresql://postgres:${encodeURIComponent(DB_PASSWORD)}@db.${projectRef}.supabase.co:5432/postgres`;

const MIGRATIONS_DIR = path.join(__dirname, '..', 'supabase', 'migrations');

// ── Seed identities ───────────────────────────────────────────────────────────
const TENANT_A_EMAIL = 'tenant-a@rls-test.kakunin.internal';
const TENANT_A_PASS  = 'RLSTestPasswordA!99';
const TENANT_B_EMAIL = 'tenant-b@rls-test.kakunin.internal';
const TENANT_B_PASS  = 'RLSTestPasswordB!99';

async function step(label: string, fn: () => Promise<void>) {
  process.stdout.write(`  ${label}... `);
  try {
    await fn();
    console.log('✅');
  } catch (err) {
    console.log('❌');
    throw err;
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║     RLS Test DB Setup — ${projectRef.padEnd(22, ' ')}║`);
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── 1. Apply migrations via direct Postgres connection ─────────────────────
  console.log('Phase 1: Applying migrations');

  const pg = new Client({ connectionString: DB_URL });
  await pg.connect();

  // Migration tracking table — idempotent re-runs skip already-applied files
  await pg.query(`
    CREATE TABLE IF NOT EXISTS _rls_test_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  const { rows: applied } = await pg.query<{ name: string }>(
    'SELECT name FROM _rls_test_migrations'
  );
  const appliedSet = new Set(applied.map(r => r.name));

  const migrationFiles = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let skipped = 0;
  let ran = 0;

  for (const file of migrationFiles) {
    if (appliedSet.has(file)) {
      process.stdout.write(`  ${file}... `);
      console.log('⏭  (already applied)');
      skipped++;
      continue;
    }
    await step(file, async () => {
      let sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      // ALTER SYSTEM and pg_reload_conf() cannot run in a transaction — skip for test DB.
      // These are pgaudit server-level settings, not needed for RLS isolation testing.
      sql = sql
        .split('\n')
        .filter(line => {
          const l = line.trim().toUpperCase();
          return !l.startsWith('ALTER SYSTEM') && !l.includes('PG_RELOAD_CONF');
        })
        .join('\n');
      try {
        if (sql.trim()) await pg.query(sql);
      } catch (err) {
        const msg = (err as Error).message ?? '';
        // Already-exists errors mean migration ran in a previous partial setup — treat as done
        if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('already defined')) {
          console.log('\n    (idempotent — objects already exist, marking as applied)');
        } else {
          throw err;
        }
      }
      await pg.query('INSERT INTO _rls_test_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
      ran++;
    });
  }

  await pg.end();
  console.log(`\n  ${ran} applied, ${skipped} skipped (already done).\n`);

  // ── 2. Create auth users + tenant rows ─────────────────────────────────────
  console.log('Phase 2: Seeding auth users and tenant rows');

  const admin = createClient(TEST_SUPABASE_URL, TEST_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Direct SQL client for cleanup operations (bypasses RLS completely)
  const pgClean = new Client({ connectionString: DB_URL });
  await pgClean.connect();

  // Clean up any previous run — delete in FK order via direct SQL
  await step('Remove previous test data (direct SQL, bypasses RLS)', async () => {
    // Remove auth users first (triggers cascade-friendly cleanup)
    const { data: users } = await admin.auth.admin.listUsers();
    const testEmails = [TENANT_A_EMAIL, TENANT_B_EMAIL];
    for (const user of users?.users ?? []) {
      if (testEmails.includes(user.email ?? '')) {
        await admin.auth.admin.deleteUser(user.id);
      }
    }
    // Fetch stale tenant IDs, then delete child rows first (FK order)
    const { rows: staleRows } = await pgClean.query<{ id: string }>(
      `SELECT id FROM public.tenants WHERE email = ANY($1::text[])`,
      [[TENANT_A_EMAIL, TENANT_B_EMAIL]]
    );
    if (staleRows.length > 0) {
      const ids = staleRows.map(r => r.id);
      // audit_log and agent_drift_scores have DO INSTEAD NOTHING rules (append-only enforcement)
      // that also block FK CASCADE deletes from tenants. Drop both, let ON DELETE CASCADE
      // on tenants handle all child tables automatically, then recreate both rules.
      await pgClean.query(`DROP RULE IF EXISTS audit_log_no_delete       ON public.audit_log`);
      await pgClean.query(`DROP RULE IF EXISTS no_delete_agent_drift_scores ON public.agent_drift_scores`);
      await pgClean.query(`DELETE FROM public.tenants WHERE id = ANY($1::uuid[])`, [ids]);
      await pgClean.query(`CREATE RULE audit_log_no_delete AS ON DELETE TO public.audit_log DO INSTEAD NOTHING`);
      await pgClean.query(`CREATE RULE no_delete_agent_drift_scores AS ON DELETE TO public.agent_drift_scores DO INSTEAD NOTHING`);
    }
  });

  // Create Tenant A
  let tenantAId: string;
  await step('Create Tenant A auth user', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: TENANT_A_EMAIL,
      password: TENANT_A_PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? 'No user returned');
    tenantAId = data.user.id;
  });

  await step('Insert Tenant A row (id = auth uid)', async () => {
    await pgClean.query(
      `INSERT INTO public.tenants (id, name, email, plan_tier)
       VALUES ($1, $2, $3, 'starter')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
      [tenantAId!, 'RLS Test Tenant A', TENANT_A_EMAIL]
    );
  });

  // Create Tenant B
  let tenantBId: string;
  await step('Create Tenant B auth user', async () => {
    const { data, error } = await admin.auth.admin.createUser({
      email: TENANT_B_EMAIL,
      password: TENANT_B_PASS,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? 'No user returned');
    tenantBId = data.user.id;
  });

  await step('Insert Tenant B row (id = auth uid)', async () => {
    await pgClean.query(
      `INSERT INTO public.tenants (id, name, email, plan_tier)
       VALUES ($1, $2, $3, 'starter')
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
      [tenantBId!, 'RLS Test Tenant B', TENANT_B_EMAIL]
    );
  });

  // Seed Tenant B data rows so Tenant A has something to try (and fail) to read
  await step('Seed Tenant B agent + audit_log rows (cross-tenant read targets)', async () => {
    await pgClean.query(
      `INSERT INTO public.agents (tenant_id, name, model_hash, status)
       VALUES ($1, 'Tenant B Test Agent', 'sha256:aabbccddeeff00112233445566778899aabbccddeeff00112233445566778899', 'pending')
       ON CONFLICT DO NOTHING`,
      [tenantBId!]
    );
    await pgClean.query(
      `INSERT INTO public.audit_log (tenant_id, event_type, actor_type, actor_id, description)
       VALUES ($1, 'system.seed', 'system', 'setup-rls-test-db.ts', 'RLS isolation seed row for Tenant B')`,
      [tenantBId!]
    );
  });

  await pgClean.end();

  // ── 3. Get Tenant A JWT ─────────────────────────────────────────────────────
  console.log('\nPhase 3: Obtaining Tenant A JWT');

  let tenantAJwt: string;
  await step('Sign in as Tenant A → extract access_token', async () => {
    const anon = createClient(TEST_SUPABASE_URL, TEST_ANON_KEY);
    const { data, error } = await anon.auth.signInWithPassword({
      email: TENANT_A_EMAIL,
      password: TENANT_A_PASS,
    });
    if (error || !data.session) throw new Error(error?.message ?? 'No session returned');
    tenantAJwt = data.session.access_token;
  });

  // ── 4. Write .env.rls.test ─────────────────────────────────────────────────
  console.log('\nPhase 4: Writing .env.rls.test');

  const envContent = `# RLS Isolation Test Environment
# Generated by scripts/setup-rls-test-db.ts — DO NOT COMMIT
# Test project: ${projectRef} (NOT prod/dev)

TEST_SUPABASE_URL=${TEST_SUPABASE_URL}
TEST_SUPABASE_ANON_KEY=${TEST_ANON_KEY}
TEST_SUPABASE_SERVICE_ROLE_KEY=${TEST_SERVICE_ROLE_KEY}
NEXT_PUBLIC_SUPABASE_URL=${TEST_SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${TEST_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${TEST_SERVICE_ROLE_KEY}

TEST_TENANT_A_ID=${tenantAId!}
TEST_TENANT_B_ID=${tenantBId!}
TEST_TENANT_A_JWT=${tenantAJwt!}
`;

  const envPath = path.join(__dirname, '..', '.env.rls.test');
  writeFileSync(envPath, envContent);
  console.log(`  Written to .env.rls.test ✅`);

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║              RLS TEST DB SETUP COMPLETE                          ║
╚══════════════════════════════════════════════════════════════════╝

  Tenant A ID : ${tenantAId!}
  Tenant B ID : ${tenantBId!}
  JWT written : .env.rls.test

  Run RLS tests:
    source .env.rls.test && npm run test -- __tests__/security/rls-isolation.test.ts

  Or full suite with RLS:
    export $(cat .env.rls.test | grep -v '#' | xargs) && npm run test
`);
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
