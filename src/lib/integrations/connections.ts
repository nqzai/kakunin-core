/**
 * integration_connections data access (P1 — RA-178).
 *
 * Typed, tenant-scoped CRUD over the integration_connections table plus the
 * AES-256-GCM credential sealing for outbound headers / API keys. All writes
 * validate endpoint_url through assertSafeUrl() (SSRF guard) before persisting.
 *
 * See docs/V2_BLUEPRINT.md §4. Service-role client only (server routes).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { encryptCredentials, decryptCredentials } from '@/lib/credentials/crypto';
import { assertSafeUrl } from '@/lib/security/url-guard';

export type IntegrationProvider = 'otlp' | 'github';

type Row = Database['public']['Tables']['integration_connections']['Row'];

export interface OutboundSecrets {
  headers: Record<string, string>;
  apiKey?: string;
}

export interface UpsertConnectionInput {
  tenantId: string;
  provider: IntegrationProvider;
  endpointUrl: string;
  headers?: Record<string, string>;
  apiKey?: string;
  config?: Record<string, unknown>;
}

type Db = SupabaseClient<Database>;

/** Fetch a tenant's connection for a provider (or null). Tenant-scoped. */
export async function getConnection(
  supabase: Db,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<Row | null> {
  const { data } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('tenant_id', tenantId) // rule #2: tenant-scope all service-role queries
    .eq('provider', provider)
    .eq('enabled', true)
    .maybeSingle();
  return data ?? null;
}

/** All enabled connections for a provider — system-wide (cron sweep only). */
export async function listEnabledByProvider(
  supabase: Db,
  provider: IntegrationProvider,
): Promise<Row[]> {
  const { data } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('provider', provider)
    .eq('enabled', true)
    .order('last_sync', { ascending: true, nullsFirst: true });
  return data ?? [];
}

/**
 * Create or update a tenant's connection. Validates the endpoint against the
 * SSRF guard and seals secrets before persisting. Throws UnsafeUrlError if the
 * endpoint targets a private/loopback/link-local host.
 */
export async function upsertConnection(supabase: Db, input: UpsertConnectionInput): Promise<Row> {
  await assertSafeUrl(input.endpointUrl); // SSRF guard at write time (defense in depth)

  // Only seal secrets the caller actually supplied. `undefined` means "not in
  // this request" → preserve the stored ciphertext on update (the GET endpoint
  // never returns secrets, so a partial edit like changing endpoint_url alone
  // must not wipe collector auth). An explicit empty object / empty string is a
  // deliberate clear → null.
  const sealedHeaders =
    input.headers === undefined
      ? undefined
      : Object.keys(input.headers).length > 0
        ? encryptCredentials(input.headers)
        : null;
  const sealedApiKey =
    input.apiKey === undefined ? undefined : input.apiKey ? encryptCredentials({ apiKey: input.apiKey }) : null;

  const existing = await supabase
    .from('integration_connections')
    .select('id')
    .eq('tenant_id', input.tenantId)
    .eq('provider', input.provider)
    .eq('enabled', true)
    .maybeSingle();

  const base = {
    tenant_id: input.tenantId,
    provider: input.provider,
    endpoint_url: input.endpointUrl,
    config: (input.config ?? {}) as Database['public']['Tables']['integration_connections']['Insert']['config'],
    enabled: true,
    error_message: null,
    updated_at: new Date().toISOString(),
  };

  let query;
  if (existing.data?.id) {
    // Update: omit untouched secret columns so they keep their stored values.
    const payload: Database['public']['Tables']['integration_connections']['Update'] = { ...base };
    if (sealedHeaders !== undefined) payload.headers_enc = sealedHeaders;
    if (sealedApiKey !== undefined) payload.api_key_enc = sealedApiKey;
    query = supabase
      .from('integration_connections')
      .update(payload)
      .eq('id', existing.data.id)
      .eq('tenant_id', input.tenantId);
  } else {
    // Insert: default any unsupplied secret to null.
    query = supabase.from('integration_connections').insert({
      ...base,
      headers_enc: sealedHeaders ?? null,
      api_key_enc: sealedApiKey ?? null,
    });
  }

  const { data, error } = await query.select('*').single();
  if (error || !data) throw new Error(`Failed to upsert connection: ${error?.message}`);
  return data;
}

/** Soft-disable a tenant's connection (DELETE endpoint). */
export async function disableConnection(
  supabase: Db,
  tenantId: string,
  provider: IntegrationProvider,
): Promise<boolean> {
  const { error } = await supabase
    .from('integration_connections')
    .update({ enabled: false, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('provider', provider)
    .eq('enabled', true);
  return !error;
}

/** Record a sync result on a connection. Tenant-scoped. */
export async function markSync(
  supabase: Db,
  id: string,
  tenantId: string,
  fields: { last_sync?: string; error_message?: string | null },
): Promise<void> {
  await supabase
    .from('integration_connections')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId); // rule #2
}

// ─── Per-stream export cursor (stored in config.cursor jsonb) ────────────────
//
// The OTLP exporter tracks delivery progress per data stream as a keyset cursor
// (last-exported timestamp + row id). Two reasons this beats a single last_sync
// timestamp: (1) a (ts, id) keyset never skips rows that share a millisecond at
// a page boundary; (2) independent per-stream cursors mean one backlogged stream
// never rewinds and re-sends another. Stored in the existing `config` jsonb so
// no migration is needed.

export interface StreamCursor {
  /** Last exported row's ordering timestamp (occurred_at / closed_at). */
  ts: string;
  /** Last exported row's id — keyset tie-breaker for equal timestamps. */
  id: string;
}

export interface ExportCursor {
  events?: StreamCursor;
  chains?: StreamCursor;
}

type ConfigShape = { cursor?: ExportCursor } & Record<string, unknown>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Strict ISO 8601: only digits and the structural chars an ISO timestamp uses.
// Crucially excludes the quote/comma/paren chars that matter to a PostgREST
// filter, so a validated ts can be safely interpolated into a `.or(...)` group.
const ISO_TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?([+-]\d{2}:?\d{2}|Z)?$/;

/**
 * Validate one stream cursor. The cursor is INTERNAL state (written only by the
 * exporter from real DB row values) but it lives in the same `config` jsonb the
 * connect API lets a tenant set, so a caller could seed a bogus `config.cursor`.
 * Its `ts`/`id` are interpolated into a PostgREST `.or()` filter downstream, so
 * we hard-validate shape here (strict ISO timestamp + UUID) and drop anything
 * else, keeping untrusted strings out of the query filter entirely. The exact
 * stored timestamp string is preserved (not re-serialized) so the keyset
 * tie-breaker matches sub-millisecond precision.
 */
function validStreamCursor(c: unknown): StreamCursor | undefined {
  if (!c || typeof c !== 'object') return undefined;
  const { ts, id } = c as Record<string, unknown>;
  if (typeof ts !== 'string' || typeof id !== 'string') return undefined;
  if (!UUID_RE.test(id) || !ISO_TS_RE.test(ts)) return undefined;
  return { ts, id };
}

/** Read the per-stream export cursor from a connection's config (or empty). */
export function readExportCursor(row: Pick<Row, 'config'>): ExportCursor {
  const cfg = (row.config ?? {}) as ConfigShape;
  const raw = cfg.cursor;
  if (!raw || typeof raw !== 'object') return {};
  const out: ExportCursor = {};
  const events = validStreamCursor(raw.events);
  const chains = validStreamCursor(raw.chains);
  if (events) out.events = events;
  if (chains) out.chains = chains;
  return out;
}

/**
 * Persist an updated export cursor into config.cursor, preserving the rest of
 * config. Called per-signal (immediately after each signal delivers) so a later
 * partial failure never re-sends an already-delivered stream. Tenant-scoped.
 */
export async function writeExportCursor(
  supabase: Db,
  id: string,
  tenantId: string,
  existingConfig: Row['config'],
  cursor: ExportCursor,
): Promise<void> {
  const cfg: ConfigShape = { ...((existingConfig ?? {}) as ConfigShape), cursor };
  await supabase
    .from('integration_connections')
    .update({
      config: cfg as Database['public']['Tables']['integration_connections']['Update']['config'],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('tenant_id', tenantId); // rule #2
}

/** Decrypt the outbound headers + API key for a connection row. */
export function decryptOutbound(row: Pick<Row, 'headers_enc' | 'api_key_enc'>): OutboundSecrets {
  const headers = row.headers_enc
    ? (decryptCredentials(row.headers_enc) as Record<string, string>)
    : {};
  const apiKey = row.api_key_enc
    ? (decryptCredentials(row.api_key_enc).apiKey as string | undefined)
    : undefined;
  return { headers, apiKey };
}
