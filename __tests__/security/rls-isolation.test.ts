import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * RLS Isolation Tests
 *
 * Requires a dedicated test Supabase project (NOT dev, NOT prod).
 *
 * Preferred env names:
 * - TEST_SUPABASE_URL
 * - TEST_SUPABASE_ANON_KEY
 * - TEST_SUPABASE_SERVICE_ROLE_KEY
 *
 * CI may also provide the same credentials through the app-standard aliases:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Setup: run supabase/migrations against test project before this suite.
 * Seeds: TENANT_A_ID and TENANT_B_ID must exist in the tenants table.
 *
 * Skipped automatically when env vars not present (CI without test project).
 *
 * KNOWN GAP (RA-167, 2026-05-29): the previous test project
 * (fcnntbwmdptpsfiisqzo) was deleted — no live test DB currently exists, so
 * these run only as skips in CI. Cross-tenant isolation IS verified on prod
 * (Supabase security advisors clean + manual SQL checks). To re-enable CI
 * enforcement: provision a fresh test project, then run
 * `npx tsx scripts/setup-rls-test-db.ts` (creates tenants + emits .env.rls.test),
 * and set the TEST_SUPABASE_* / TEST_TENANT_* values as GitHub Actions secrets.
 */

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const TEST_SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const TEST_SUPABASE_SERVICE_ROLE_KEY =
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

const HAS_TEST_ENV = Boolean(
  TEST_SUPABASE_URL &&
  TEST_SUPABASE_ANON_KEY &&
  TEST_SUPABASE_SERVICE_ROLE_KEY &&
  process.env.TEST_TENANT_A_ID
);

const TENANT_A_ID = process.env.TEST_TENANT_A_ID!;
const TENANT_B_ID = process.env.TEST_TENANT_B_ID!;
const TENANT_A_JWT  = process.env.TEST_TENANT_A_JWT!;  // anon key JWT for tenant A

// Client authenticated as Tenant A (simulates real browser client)
function clientAs(jwt: string) {
  return createClient(
    TEST_SUPABASE_URL!,
    TEST_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );
}

// Service role client for seeding — bypasses RLS
function serviceClient() {
  return createServiceClient();
}

describe.skipIf(!HAS_TEST_ENV)('RLS Isolation — Tenant A cannot access Tenant B data', () => {
  // Lazily constructed so createClient() is only called when env vars exist
  const clientA = HAS_TEST_ENV ? clientAs(TENANT_A_JWT) : null!;

  it('agents table: tenant A cannot read tenant B agents', async () => {
    const { data, error } = await clientA
      .from('agents')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);
    expect(error).toBeNull();
    expect(data).toHaveLength(0);
  });

  it('certificates table: tenant A cannot read tenant B certs', async () => {
    const { data } = await clientA
      .from('certificates')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  it('behavior_events table: tenant A cannot read tenant B events', async () => {
    const { data } = await clientA
      .from('behavior_events')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  it('compliance_reports table: tenant A cannot read tenant B reports', async () => {
    const { data } = await clientA
      .from('compliance_reports')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  it('audit_log table: tenant A cannot read tenant B audit entries', async () => {
    const { data } = await clientA
      .from('audit_log')
      .select('id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  it('api_keys table: tenant A cannot read tenant B API keys', async () => {
    const { data } = await clientA
      .from('api_keys')
      .select('id, key_hash')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  // RA-145: quota tables previously had a tautological policy (no isolation).
  it('agent_event_counts table: tenant A cannot read tenant B quota rows', async () => {
    const { data } = await clientA
      .from('agent_event_counts')
      .select('tenant_id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  it('agent_report_counts table: tenant A cannot read tenant B quota rows', async () => {
    const { data } = await clientA
      .from('agent_report_counts')
      .select('tenant_id')
      .eq('tenant_id', TENANT_B_ID);
    expect(data).toHaveLength(0);
  });

  // RA-158: cover every remaining tenant-scoped table so a missing/broken
  // policy (like the RA-145 tautology) can never slip through untested again.
  const REMAINING_TENANT_TABLES = [
    'agent_baselines',
    'agent_drift_scores',
    'audit_log_access',
    'chat_messages',
    'conversations',
    'decision_chains',
    'feature_flags',
    'tenant_alert_channels',
    'webhook_deliveries',
    'webhooks',
  ] as const;

  for (const table of REMAINING_TENANT_TABLES) {
    it(`${table} table: tenant A cannot read tenant B rows`, async () => {
      const { data } = await clientA
        .from(table)
        .select('tenant_id')
        .eq('tenant_id', TENANT_B_ID);
      expect(data ?? []).toHaveLength(0);
    });
  }
});

describe.skipIf(!HAS_TEST_ENV)('Audit Log Immutability (WORM)', () => {
  it('UPDATE on audit_log is silently blocked by audit_log_no_update rule', async () => {
    const svc = serviceClient();
    await svc.from('audit_log').insert({
      tenant_id: TENANT_A_ID,
      event_type: 'test.worm.update',
      actor_type: 'system',
      actor_id: 'test',
      description: 'WORM update test row',
    });
    // Attempt UPDATE — audit_log_no_update rule silently swallows it
    await svc
      .from('audit_log')
      .update({ description: 'MUTATED' })
      .eq('event_type', 'test.worm.update');
    const { data: after } = await svc
      .from('audit_log')
      .select('description')
      .eq('tenant_id', TENANT_A_ID)
      .eq('event_type', 'test.worm.update');
    expect(after?.every(r => r.description !== 'MUTATED')).toBe(true);
  });

  it('DELETE on audit_log is silently blocked by audit_log_no_delete rule', async () => {
    const svc = serviceClient();
    await svc.from('audit_log').insert({
      tenant_id: TENANT_A_ID,
      event_type: 'test.worm.delete',
      actor_type: 'system',
      actor_id: 'test',
      description: 'WORM delete test row',
    });
    // Attempt DELETE — audit_log_no_delete rule silently swallows it
    await svc
      .from('audit_log')
      .delete()
      .eq('event_type', 'test.worm.delete');
    // Row must still exist
    const { data: after } = await svc
      .from('audit_log')
      .select('id')
      .eq('tenant_id', TENANT_A_ID)
      .eq('event_type', 'test.worm.delete');
    expect(after?.length).toBeGreaterThan(0);
  });

  it('entry_hash is populated on new audit_log rows', async () => {
    const svc = serviceClient();
    const { data } = await svc
      .from('audit_log')
      .select('entry_hash')
      .eq('tenant_id', TENANT_A_ID)
      .not('entry_hash', 'is', null)
      .limit(1);
    // At least one signed row exists (written after RA-125 deploy)
    expect(data?.length).toBeGreaterThan(0);
    expect(data?.[0].entry_hash).toMatch(/^[a-f0-9]{64}$/); // 256-bit hex
  });
});
