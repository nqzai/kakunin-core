import { type NextResponse } from 'next/server';
import { type SupabaseClient } from '@supabase/supabase-js';
import { notFound } from './responses';

/**
 * Fetch a single agent row scoped to the given tenant.
 * Returns the agent data or a 404 error response.
 */
export async function fetchTenantScopedAgent<
  T extends string = 'id, tenant_id, name, model, model_hash, version, status, inbox_address, metadata',
>(
  supabase: SupabaseClient,
  agentId: string,
  tenantId: string,
  select?: T,
): Promise<
  | { ok: true; agent: Record<string, unknown> }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const { data, error } = await supabase
    .from('agents')
    .select(select ?? 'id, tenant_id, name, model, model_hash, version, status, inbox_address, metadata')
    .eq('id', agentId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    return { ok: false, response: notFound('Agent') };
  }
  return { ok: true, agent: data as Record<string, unknown> };
}
