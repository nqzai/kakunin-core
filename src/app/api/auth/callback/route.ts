import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient as _createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { notifyNewSignup } from '@/lib/discord/notify';

/**
 * GET /api/auth/callback
 *
 * Supabase Auth PKCE code exchange. Called after:
 *   - Email confirmation link click (signup)
 *   - Password reset link click
 *   - Magic link (future)
 *
 * Exchanges the `code` param for a session, sets cookies, redirects.
 * On error redirects to /login with ?error= query param.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();

  const supabase = _createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Provision tenant on first sign-in — idempotent via ON CONFLICT DO NOTHING
  const user = sessionData.user;
  if (user?.email) {
    const db = createServiceClient();
    const tenantName = user.user_metadata?.full_name as string | undefined
      ?? user.email.split('@')[1].split('.')[0]; // fallback: domain prefix

    const { error: tenantError } = await db.from('tenants').upsert(
      { id: user.id, name: tenantName, email: user.email, plan: 'starter' },
      { onConflict: 'id', ignoreDuplicates: true }
    );

    if (!tenantError) {
      await writeAuditLog(db, {
        tenant_id: user.id,
        event_type: 'tenant.created',
        actor_type: 'system',
        actor_id: user.id,
        description: `Tenant provisioned for ${user.email}`,
        affected_id: user.id,
        metadata: { plan: 'starter' },
      });

      // Fire-and-forget — never blocks the redirect
      void notifyNewSignup({
        email: user.email,
        tenantId: user.id,
        plan: 'starter',
        name: user.user_metadata?.full_name as string | undefined,
      });
    }
  }

  // Redirect to intended destination (default: dashboard)
  return NextResponse.redirect(`${origin}${next}`);
}
