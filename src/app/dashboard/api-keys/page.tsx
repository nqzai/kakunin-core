import { getDashboardRequestContext } from '@/lib/dashboard/server';
import { createServiceClient } from '@/lib/supabase/server';
import { ApiKeyClient } from './ApiKeyClient';

/**
 * /dashboard/api-keys — API key management.
 *
 * Server component renders the list; client component handles:
 * - Create (form → server action → show-once reveal)
 * - Revoke (confirm → server action)
 * - Rotate (atomic: create then revoke → show-once reveal)
 *
 * RA-35 acceptance criteria:
 * ✓ Full key shown once at creation (client state, never re-fetchable)
 * ✓ Only prefix stored + displayed after creation
 * ✓ Revoke immediately invalidates in middleware (revoked_at check)
 * ✓ Rotate is atomic (new key created before old is revoked)
 * ✓ audit_log row on api_key.created / api_key.revoked / api_key.rotated
 */
export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const context = await getDashboardRequestContext();
  if (!context) return null;

  const db = createServiceClient();

  const keys = context.tenantId
    ? (await db
        .from('api_keys')
        .select('*')
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: false })
      ).data ?? []
    : [];

  return (
    <main className="dash-inner">
      <div className="dash-inner-head">
        <div>
          <h1 className="dash-h1">API Keys</h1>
          <p className="dash-sub">
            Authenticate agent SDK calls · {keys.filter((k) => !k.revoked_at).length} active key{keys.filter((k) => !k.revoked_at).length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <ApiKeyClient keys={keys} />
    </main>
  );
}
