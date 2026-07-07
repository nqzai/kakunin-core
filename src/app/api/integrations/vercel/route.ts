import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { log } from '@/lib/logging';
import { storePendingVercelInstall } from '@/lib/integrations/vercel-pending';

/**
 * Vercel Marketplace Integration — OAuth callback
 *
 * Flow:
 *   1. User clicks "Add Integration" on Vercel Marketplace
 *   2. Vercel redirects → GET /api/integrations/vercel?code=...&next=...&configurationId=...
 *   3. We require the user to be logged into kakunin.ai (redirect to /login if not)
 *   4. Exchange Vercel OAuth code for access token
 *   5. Stash the exchanged token + tenant under a one-time token, redirect to
 *      an explicit confirmation page — the actual key creation and env
 *      injection happen there (see confirm/actions.ts)
 *
 * This handler is a bare GET reachable cross-site with an attacker's own
 * Vercel OAuth `code` (e.g. from an installation the attacker owns). It must
 * never perform the secret-issuing/injecting side effect itself — otherwise
 * a victim merely visiting an attacker's link would have their live Kakunin
 * API key injected into the attacker's Vercel project. The confirmation step
 * requires a same-origin POST from the dashboard, which a cross-site GET
 * cannot forge.
 *
 * Env vars required:
 *   VERCEL_INTEGRATION_CLIENT_ID     — from Vercel partner portal
 *   VERCEL_INTEGRATION_CLIENT_SECRET — from Vercel partner portal
 */

const VERCEL_TOKEN_URL = 'https://api.vercel.com/v2/oauth/access_token';

interface VercelTokenResponse {
  access_token: string;
  token_type: string;
  installation_id: string;
  user_id: string;
  team_id: string | null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get('code');
  const rawNext = searchParams.get('next') ?? 'https://vercel.com/dashboard';
  const configurationId = searchParams.get('configurationId');
  const stateParam = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'Missing OAuth code' }, { status: 400 });
  }

  // Validate next param — must point back to vercel.com (prevent open redirect)
  let next: string;
  try {
    const nextUrl = new URL(rawNext);
    if (nextUrl.hostname !== 'vercel.com' && !nextUrl.hostname.endsWith('.vercel.com')) {
      return NextResponse.json({ error: 'Invalid redirect target' }, { status: 400 });
    }
    next = rawNext;
  } catch {
    return NextResponse.json({ error: 'Invalid redirect target' }, { status: 400 });
  }

  // Validate CSRF state param when present (sent on external/deploy-button flows)
  if (stateParam !== null) {
    const expectedState = req.cookies.get('vercel_oauth_state')?.value;
    if (!expectedState || stateParam !== expectedState) {
      return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 });
    }
  }

  const clientId = process.env.VERCEL_INTEGRATION_CLIENT_ID;
  const clientSecret = process.env.VERCEL_INTEGRATION_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    log.error('[integrations/vercel] VERCEL_INTEGRATION_CLIENT_ID or CLIENT_SECRET not set');
    return NextResponse.json({ error: 'Integration not configured' }, { status: 503 });
  }

  // Require kakunin.ai session — redirect to login if not present
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch tenant record
  const serviceSupabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  );

  const { data: tenant } = await serviceSupabase
    .from('tenants')
    .select('id')
    .eq('email', user.email ?? '')
    .single();

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
  }

  const tenantId = tenant.id as string;

  // Exchange Vercel OAuth code for access token
  let vercelToken: VercelTokenResponse;
  try {
    const tokenRes = await fetch(VERCEL_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai'}/api/integrations/vercel`,
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      log.error('[integrations/vercel] token exchange failed', { status: tokenRes.status, body });
      return NextResponse.json({ error: 'Vercel token exchange failed' }, { status: 502 });
    }

    vercelToken = await tokenRes.json() as VercelTokenResponse;
  } catch (err) {
    log.error('[integrations/vercel] token exchange error', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Vercel token exchange error' }, { status: 502 });
  }

  // Stash the exchanged token under a one-time confirmation token — the
  // dashboard confirm page performs the actual key creation + env injection
  // once the tenant explicitly confirms via a same-origin POST.
  const confirmToken = await storePendingVercelInstall({
    tenantId,
    userId: user.id,
    accessToken: vercelToken.access_token,
    installationId: vercelToken.installation_id,
    teamId: vercelToken.team_id,
    configurationId,
    next,
  });

  const confirmUrl = new URL('/dashboard/integrations/vercel/confirm', req.url);
  confirmUrl.searchParams.set('token', confirmToken);
  return NextResponse.redirect(confirmUrl);
}
