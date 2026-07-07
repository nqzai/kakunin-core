/**
 * Seed Script — creates a test tenant + agent + API key for manual testing.
 *
 * Usage:
 *   npx tsx scripts/seed-test-agent.ts
 *   npx tsx scripts/seed-test-agent.ts --clean   (removes existing test data first)
 *
 * Writes .env.test.local with output values for curl commands.
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Safe to run multiple times — uses upsert on email, skips duplicates.
 */

import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHash } from 'crypto';
import { writeFileSync, existsSync } from 'fs';
import { config } from 'dotenv';
import path from 'path';

// Load .env.local
config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_TENANT_EMAIL = 'test-manual@kakunin.ai';
const TEST_TENANT_NAME = 'Manual Test Tenant';
const TEST_AGENT_NAME = 'Manual Test Agent (Do Not Delete)';

// Deterministic model hash for reproducibility
const MODEL_HASH = createHash('sha256').update('test-agent-v1.0').digest('hex');

async function clean() {
  console.log('🧹  Cleaning existing test data...');

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', TEST_TENANT_EMAIL)
    .maybeSingle();

  if (!tenant) {
    console.log('   No test tenant found — nothing to clean.');
    return;
  }

  // Delete in order: api_keys → agents → tenants (FK order)
  await supabase.from('api_keys').delete().eq('tenant_id', tenant.id);
  await supabase.from('behavior_events').delete().eq('tenant_id', tenant.id);
  await supabase.from('certificates').delete().eq('tenant_id', tenant.id);
  await supabase.from('agents').delete().eq('tenant_id', tenant.id);
  await supabase.from('audit_log').delete().eq('tenant_id', tenant.id);
  await supabase.from('tenants').delete().eq('id', tenant.id);
  console.log('   ✅  Test data removed.');
}

async function seed() {
  // ── 1. Tenant ───────────────────────────────────────────────────────────────
  let tenantId: string;

  const { data: existingTenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('email', TEST_TENANT_EMAIL)
    .maybeSingle();

  if (existingTenant) {
    tenantId = existingTenant.id;
    // Ensure enterprise tier so Scenario 3 (10-agent load test) isn't quota-blocked
    await supabase.from('tenants').update({ plan_tier: 'enterprise' }).eq('id', tenantId);
    console.log(`ℹ️   Tenant already exists: ${tenantId}`);
  } else {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .insert({
        name: TEST_TENANT_NAME,
        email: TEST_TENANT_EMAIL,
        plan_tier: 'enterprise',
      })
      .select('id')
      .single();

    if (error || !tenant) {
      console.error('❌  Failed to create tenant:', error?.message);
      process.exit(1);
    }
    tenantId = tenant.id;
    console.log(`✅  Created tenant: ${tenantId}`);
  }

  // ── 2. Agent ────────────────────────────────────────────────────────────────
  let agentId: string;

  const { data: existingAgent } = await supabase
    .from('agents')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', TEST_AGENT_NAME)
    .maybeSingle();

  if (existingAgent) {
    agentId = existingAgent.id;
    console.log(`ℹ️   Agent already exists: ${agentId}`);
  } else {
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        tenant_id: tenantId,
        name: TEST_AGENT_NAME,
        model_hash: MODEL_HASH,
        model: 'gpt-4o',
        version: '1.0.0',
        status: 'pending',
        metadata: {
          financial_scope: {
            max_single_trade_usd: 5000,
            daily_limit_usd: 25000,
            permitted_instruments: ['AAPL', 'GOOGL', 'ETH-USD'],
            permitted_venues: ['NYSE', 'NASDAQ', 'COINBASE'],
            leverage_permitted: false,
          },
          _seed: true,
          _created_by: 'seed-test-agent.ts',
        },
      })
      .select('id')
      .single();

    if (error || !agent) {
      console.error('❌  Failed to create agent:', error?.message);
      process.exit(1);
    }
    agentId = agent.id;
    console.log(`✅  Created agent: ${agentId}`);
  }

  // ── 3. API Key ──────────────────────────────────────────────────────────────
  // Generate a new key every run (or re-use if already exists for this agent)
  const rawKey = `kak_test_${randomBytes(24).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  // Check if any key exists for this tenant in test scenario
  const { data: existingKey } = await supabase
    .from('api_keys')
    .select('id, key_prefix')
    .eq('tenant_id', tenantId)
    .eq('name', 'Manual Test Key')
    .maybeSingle();

  let apiKeyForOutput = '';

  if (existingKey) {
    // Regenerate — old key hash not retrievable, create fresh
    await supabase.from('api_keys').delete().eq('id', existingKey.id);
    console.log('ℹ️   Regenerating API key (old key deleted)...');
  }

  const { error: keyError } = await supabase
    .from('api_keys')
    .insert({
      tenant_id: tenantId,
      name: 'Manual Test Key',
      key_hash: keyHash,
      key_prefix: rawKey.slice(0, 12),
    });

  if (keyError) {
    console.error('❌  Failed to create API key:', keyError.message);
    process.exit(1);
  }
  apiKeyForOutput = rawKey;
  console.log(`✅  Created API key: ${rawKey.slice(0, 16)}...`);

  // ── 4. Audit log seed entry ─────────────────────────────────────────────────
  await supabase.from('audit_log').insert({
    tenant_id: tenantId,
    event_type: 'system.seed',
    actor_type: 'system',
    actor_id: 'seed-test-agent.ts',
    description: 'Manual test seed created',
    affected_id: agentId,
    metadata: { seeded_at: new Date().toISOString() },
  });

  // ── 5. Write .env.test.local ────────────────────────────────────────────────
  const envContent = `# Manual test values — generated by scripts/seed-test-agent.ts
# DO NOT COMMIT — this file contains a live API key for local testing

TEST_TENANT_ID=${tenantId}
TEST_AGENT_ID=${agentId}
TEST_API_KEY=${apiKeyForOutput}

# Example curl commands (run against http://localhost:3000):
#
# POST low-risk event:
# curl -X POST http://localhost:3000/api/v1/events \\
#   -H "x-api-key: ${apiKeyForOutput}" \\
#   -H "x-tenant-id: ${tenantId}" \\
#   -H "content-type: application/json" \\
#   -d '{"agentId":"${agentId}","actionType":"api_call"}'
#
# POST high-risk event (triggers revocation check):
# curl -X POST http://localhost:3000/api/v1/events \\
#   -H "x-api-key: ${apiKeyForOutput}" \\
#   -H "x-tenant-id: ${tenantId}" \\
#   -H "content-type: application/json" \\
#   -d '{"agentId":"${agentId}","actionType":"unauthorized_access_attempt"}'
#
# GET /v1/agents list:
# curl http://localhost:3000/api/v1/agents \\
#   -H "x-api-key: ${apiKeyForOutput}" \\
#   -H "x-tenant-id: ${tenantId}"
#
# POST /v1/agents/:id/certify:
# curl -X POST http://localhost:3000/api/v1/agents/${agentId}/certify \\
#   -H "x-api-key: ${apiKeyForOutput}" \\
#   -H "x-tenant-id: ${tenantId}"
`;

  const envPath = path.join(__dirname, '..', '.env.test.local');
  writeFileSync(envPath, envContent);
  console.log(`\n📝  Written to .env.test.local`);

  // ── 6. Summary ───────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════╗
║           MANUAL TEST SEED COMPLETE                  ║
╚══════════════════════════════════════════════════════╝

  TENANT ID:  ${tenantId}
  AGENT ID:   ${agentId}
  API KEY:    ${apiKeyForOutput}
              (also saved in .env.test.local)

  ⚠️  Keep this key secret — it's live against your dev DB.
  Run with --clean to remove test data.
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const shouldClean = process.argv.includes('--clean');

(async () => {
  if (shouldClean) await clean();
  await seed();
})();
