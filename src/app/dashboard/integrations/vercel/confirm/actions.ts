'use server';

import { createHash, randomBytes } from 'crypto';
import { redirect } from 'next/navigation';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import { resolveSessionTenantContext } from '@/lib/tenant/session';
import { consumePendingVercelInstall } from '@/lib/integrations/vercel-pending';
import { log } from '@/lib/logging';

const VERCEL_PROJECTS_URL = 'https://api.vercel.com/v9/projects';
const VERCEL_ENV_URL = (projectId: string) =>
  `https://api.vercel.com/v10/projects/${projectId}/env`;

interface VercelProject {
  id: string;
  name: string;
}

/**
 * Confirms a pending Vercel install: creates/rotates the tenant's Vercel
 * integration API key and injects it into the projects in scope.
 *
 * Requires a same-origin POST from an authenticated session matching the
 * tenant that initiated the OAuth exchange — see vercel-pending.ts for why
 * this can't happen on the bare OAuth callback GET.
 */
export async function confirmVercelInstall(token: string): Promise<{ ok: boolean; error?: string }> {
  const session = await resolveSessionTenantContext();
  if (!session?.user || !session.tenant?.id) {
    return { ok: false, error: 'Unauthorized.' };
  }
  const { user, tenant } = session;

  const pending = await consumePendingVercelInstall(token);
  if (!pending) {
    return { ok: false, error: 'This confirmation link has expired or was already used.' };
  }

  if (pending.tenantId !== tenant.id || pending.userId !== user.id) {
    log.error('[integrations/vercel/confirm] tenant mismatch on pending install', {
      pendingTenant: pending.tenantId,
      sessionTenant: tenant.id,
    });
    return { ok: false, error: 'This confirmation link does not belong to your account.' };
  }

  const db = createServiceClient();

  // Issue a fresh key each time the integration is (re)confirmed
  const { data: existingKey } = await db
    .from('api_keys')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('name', 'Vercel Integration')
    .is('revoked_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const rawKey = `kak_live_${randomBytes(24).toString('base64url')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 16);

  const { data: newKey, error: keyError } = await db
    .from('api_keys')
    .insert({ tenant_id: tenant.id, name: 'Vercel Integration', key_hash: keyHash, key_prefix: keyPrefix })
    .select('id')
    .single();

  if (keyError || !newKey) {
    log.error('[integrations/vercel/confirm] key creation failed', keyError);
    return { ok: false, error: 'Failed to create API key.' };
  }

  // Only revoke the old key once the replacement is confirmed in the DB —
  // otherwise an insert failure would leave the integration with no valid key.
  if (existingKey) {
    await db.from('api_keys').update({ revoked_at: new Date().toISOString() }).eq('id', existingKey.id);
  }

  // Fetch projects in the Vercel installation scope
  const projectsUrl = new URL(VERCEL_PROJECTS_URL);
  if (pending.teamId) projectsUrl.searchParams.set('teamId', pending.teamId);
  projectsUrl.searchParams.set('limit', '100');

  let projects: VercelProject[] = [];
  try {
    const projectsRes = await fetch(projectsUrl.toString(), {
      headers: { Authorization: `Bearer ${pending.accessToken}` },
    });
    if (projectsRes.ok) {
      const body = await projectsRes.json() as { projects: VercelProject[] };
      projects = body.projects ?? [];
    }
  } catch (err) {
    log.warn('[integrations/vercel/confirm] could not fetch projects', { error: err instanceof Error ? err.message : String(err) });
  }

  // Inject KAK_API_KEY into each project
  const injected: string[] = [];
  await Promise.all(
    projects.map(async (project) => {
      try {
        const envUrl = VERCEL_ENV_URL(project.id);
        const qs = pending.teamId ? `?teamId=${pending.teamId}` : '';
        const res = await fetch(`${envUrl}${qs}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${pending.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            key: 'KAK_API_KEY',
            value: rawKey,
            type: 'encrypted',
            target: ['production', 'preview', 'development'],
          }),
        });

        if (res.ok) {
          injected.push(project.id);
        } else if (res.status === 409) {
          const existing = await res.json() as { error?: { envVarId?: string } };
          const envVarId = existing?.error?.envVarId;
          if (envVarId) {
            const patchRes = await fetch(`${envUrl}/${envVarId}${qs}`, {
              method: 'PATCH',
              headers: {
                Authorization: `Bearer ${pending.accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ value: rawKey }),
            });
            if (patchRes.ok) {
              injected.push(project.id);
            } else {
              log.warn('[integrations/vercel/confirm] env var rotation failed', { projectId: project.id, status: patchRes.status });
            }
          }
        }
      } catch (err) {
        log.warn('[integrations/vercel/confirm] env injection failed', { projectId: project.id, error: err instanceof Error ? err.message : String(err) });
      }
    })
  );

  await writeAuditLog(db, {
    tenant_id: tenant.id,
    event_type: 'integration.vercel.installed',
    actor_type: 'user',
    actor_id: user.id,
    description: `Vercel integration installed — ${injected.length} project(s) configured`,
    affected_id: newKey.id,
    metadata: {
      configuration_id: pending.configurationId,
      vercel_installation_id: pending.installationId,
      vercel_team_id: pending.teamId,
      projects_configured: injected.length,
    },
  });

  redirect(pending.next);
}
