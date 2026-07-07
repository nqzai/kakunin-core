'use server';

import { createHash, randomBytes } from 'crypto';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { revalidatePath } from 'next/cache';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveSessionTenantContext } from '@/lib/tenant/session';
import { invalidateApiKeyCache } from '@/lib/gateway/api-key-auth';

// ── Key generation ─────────────────────────────────────────────────────────

function generateApiKey(): string {
  // kak_live_<32 hex chars>  — 41 chars total
  return `kak_live_${randomBytes(16).toString('hex')}`;
}

function hashKey(key: string): string {
  // SHA-256, hex — matches middleware hashApiKey()
  return createHash('sha256').update(key).digest('hex');
}

function prefixOf(key: string): string {
  // Show first 16 chars: "kak_live_a1b2c3d4" — enough to identify, not enough to use
  return key.slice(0, 16);
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function getAuthorizedTenant() {
  const session = await resolveSessionTenantContext();
  if (!session) return { user: null, tenant: null };
  return session;
}

// ── Actions ────────────────────────────────────────────────────────────────

export type ActionResult =
  | { ok: true; key?: string; keyId?: string }
  | { ok: false; error: string };

/**
 * Create a named API key.
 * Returns the full plaintext key ONCE — caller must display and discard.
 */
export async function createApiKey(formData: FormData): Promise<ActionResult> {
  const name = (formData.get('name') as string | null)?.trim();
  if (!name || name.length < 2) {
    return { ok: false, error: 'Name must be at least 2 characters.' };
  }

  const { user, tenant } = await getAuthorizedTenant();
  if (!user || !tenant?.id) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const db = createServiceClient();
  const key = generateApiKey();
  const keyHash = hashKey(key);
  const keyPrefix = prefixOf(key);

  const { data: newKey, error } = await db
    .from('api_keys')
    .insert({
      tenant_id: tenant.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    })
    .select('id')
    .single();

  if (error || !newKey) {
    console.error('[api_key.create]', error);
    return { ok: false, error: 'Failed to create API key.' };
  }

  // Audit log — non-blocking
  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'api_key.created',
    actor_type: 'user',
    actor_id: user.id,
    description: `API key "${name}" created`,
    affected_id: newKey.id,
    metadata: { key_prefix: keyPrefix, name },
  });

  revalidatePath('/dashboard/api-keys');

  // Return full key — plaintext, shown once, never stored
  return { ok: true, key, keyId: newKey.id };
}

/**
 * Revoke an API key immediately.
 * Middleware checks revoked_at — key stops working at DB write time.
 */
export async function revokeApiKey(keyId: string): Promise<ActionResult> {
  const { user, tenant } = await getAuthorizedTenant();
  if (!user || !tenant?.id) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const db = createServiceClient();

  // Verify ownership before revoking
  const { data: existing } = await db
    .from('api_keys')
    .select('id, name, revoked_at, key_hash')
    .eq('id', keyId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!existing) return { ok: false, error: 'Key not found.' };
  if (existing.revoked_at) return { ok: false, error: 'Key already revoked.' };

  const { error } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('tenant_id', tenant.id);

  if (error) {
    console.error('[api_key.revoke]', error);
    return { ok: false, error: 'Failed to revoke API key.' };
  }

  // Evict from the proxy auth cache so the key dies now, not at cache TTL
  await invalidateApiKeyCache(existing.key_hash);

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'api_key.revoked',
    actor_type: 'user',
    actor_id: user.id,
    description: `API key "${existing.name}" revoked`,
    affected_id: keyId,
    metadata: { name: existing.name },
  });

  revalidatePath('/dashboard/api-keys');
  return { ok: true };
}

/**
 * Create a sandbox API key with limited scopes.
 * Returns the full plaintext key ONCE — caller must display and discard.
 */
export async function createSandboxKey(): Promise<ActionResult> {
  const { user, tenant } = await getAuthorizedTenant();
  if (!user || !tenant?.id) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const db = createServiceClient();
  const raw = randomBytes(24).toString('hex');
  const key = `kak_test_${raw}`;
  const keyHash = hashKey(key);
  const keyPrefix = key.slice(0, 20);
  const name = `Sandbox key (${new Date().toISOString().slice(0, 10)})`;

  const { data: newKey, error } = await db
    .from('api_keys')
    .insert({
      tenant_id: tenant.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      environment: 'sandbox',
    })
    .select('id')
    .single();

  if (error || !newKey) {
    console.error('[api_key.create_sandbox]', error);
    return { ok: false, error: 'Failed to create sandbox key.' };
  }

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'api_key.created',
    actor_type: 'user',
    actor_id: user.id,
    description: `Sandbox API key created`,
    affected_id: newKey.id,
    metadata: { key_prefix: keyPrefix, name, environment: 'sandbox' },
  });

  revalidatePath('/dashboard/api-keys');
  return { ok: true, key, keyId: newKey.id };
}

/**
 * Atomic rotate: create new key first (immediately valid), then revoke old.
 * No window without a valid key even if revoke step fails.
 * Returns the new plaintext key ONCE.
 */
export async function rotateApiKey(oldKeyId: string): Promise<ActionResult> {
  const { user, tenant } = await getAuthorizedTenant();
  if (!user || !tenant?.id) {
    return { ok: false, error: 'Unauthorized.' };
  }

  const db = createServiceClient();

  // Fetch old key metadata
  const { data: oldKey } = await db
    .from('api_keys')
    .select('id, name, revoked_at, key_hash')
    .eq('id', oldKeyId)
    .eq('tenant_id', tenant.id)
    .maybeSingle();

  if (!oldKey) return { ok: false, error: 'Key not found.' };
  if (oldKey.revoked_at) return { ok: false, error: 'Key already revoked — create a new key instead.' };

  // Step 1: Create replacement key (new key is immediately usable)
  const newRawKey = generateApiKey();
  const newHash = hashKey(newRawKey);
  const newPrefix = prefixOf(newRawKey);
  const rotatedName = `${oldKey.name} (rotated ${new Date().toISOString().slice(0, 10)})`;

  const { data: newKey, error: createErr } = await db
    .from('api_keys')
    .insert({
      tenant_id: tenant.id,
      name: rotatedName,
      key_hash: newHash,
      key_prefix: newPrefix,
    })
    .select('id')
    .single();

  if (createErr || !newKey) {
    console.error('[api_key.rotate/create]', createErr);
    return { ok: false, error: 'Failed to create replacement key.' };
  }

  // Step 2: Revoke old key (new key already active — no gap)
  const { error: revokeErr } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', oldKeyId)
    .eq('tenant_id', tenant.id);

  if (revokeErr) {
    // New key is live; old key still works too — operator will see both, can revoke manually
    console.error('[api_key.rotate/revoke]', revokeErr);
  } else {
    // Evict old key from the proxy auth cache so it dies now, not at cache TTL
    await invalidateApiKeyCache(oldKey.key_hash);
  }

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'api_key.rotated',
    actor_type: 'user',
    actor_id: user.id,
    description: `API key "${oldKey.name}" rotated`,
    affected_id: newKey.id,
    metadata: {
      old_key_id: oldKeyId,
      new_key_id: newKey.id,
      new_prefix: newPrefix,
      revoke_succeeded: !revokeErr,
    },
  });

  revalidatePath('/dashboard/api-keys');
  return { ok: true, key: newRawKey, keyId: newKey.id };
}
