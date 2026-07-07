import { headers } from 'next/headers';
import type { User } from '@supabase/supabase-js';
import { createAnonServerClient, createServiceClient } from '@/lib/supabase/server';

export interface AppTenant {
  id: string;
  name: string | null;
  email: string | null;
  plan: string | null;
  plan_tier: string | null;
  stripe_customer_id: string | null;
}

export interface AuthenticatedAppContext {
  pathname: string | null;
  user: User;
  tenant: AppTenant | null;
  userEmail: string;
  userName: string;
  planTier: string | null;
  stripeCustomerId: string | null;
}

function readHeaderValue(value: string | null): string | null {
  return value && value.length > 0 ? value : null;
}

export async function resolveAuthenticatedAppContext(): Promise<AuthenticatedAppContext | null> {
  const requestHeaders = await headers();
  const pathname = readHeaderValue(requestHeaders.get('x-kakunin-pathname'));

  const anonClient = await createAnonServerClient();
  const {
    data: { user },
  } = await anonClient.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const db = createServiceClient();
  const { data: tenant } = await db
    .from('tenants')
    .select('id, name, email, plan, plan_tier, stripe_customer_id')
    .eq('email', user.email)
    .maybeSingle();

  const appTenant = (tenant as AppTenant | null) ?? null;

  return {
    pathname,
    user,
    tenant: appTenant,
    userEmail: user.email ?? appTenant?.email ?? '',
    userName: (user.user_metadata?.full_name as string | undefined) ?? user.email ?? appTenant?.email ?? '',
    planTier: appTenant?.plan_tier ?? appTenant?.plan ?? null,
    stripeCustomerId: appTenant?.stripe_customer_id ?? null,
  };
}
