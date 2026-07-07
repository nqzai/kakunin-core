import type { User } from '@supabase/supabase-js';
import { resolveAuthenticatedAppContext } from '@/lib/app-context/server';

export interface SessionTenant {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  plan_tier: string | null;
  stripe_customer_id: string | null;
}

export interface SessionTenantContext {
  user: User;
  tenant: SessionTenant | null;
}

export async function resolveSessionTenantContext(): Promise<SessionTenantContext | null> {
  const context = await resolveAuthenticatedAppContext();
  if (!context) {
    return null;
  }

  return {
    user: context.user,
    tenant: (context.tenant as SessionTenant | null) ?? null,
  };
}
