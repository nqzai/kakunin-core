import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { Webhook } from 'svix';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { log } from '@/lib/logging';

/**
 * POST /api/webhooks/auth
 *
 * Receives Supabase Auth Hook events and triggers transactional emails.
 *
 * Setup: Supabase dashboard → Authentication → Hooks → "Send Email" hook (HTTPS type)
 *
 * Secured via Standard Webhooks signature (svix). Supabase sends:
 *   webhook-id, webhook-timestamp, webhook-signature headers.
 * Secret must be set in Supabase hook config as: v1,whsec_<base64>
 * Store the same v1,whsec_<base64> value in Doppler as SUPABASE_AUTH_HOOK_SECRET.
 *
 * Handled events:
 *   signup          → auth.signup welcome email
 *   email_change    → update tenants.email + send auth.email_changed notification
 *   password_recovery → send auth.password_recovery email with reset link
 */

const hookBodySchema = z.object({
  type: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    // new_email is present on email_change events — it's the destination address
    new_email: z.string().email().optional(),
    user_metadata: z.record(z.string(), z.unknown()).optional().default({}),
  }),
  // token_hash / redirect_to are present on password_recovery events
  token_hash: z.string().optional(),
  redirect_to: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_AUTH_HOOK_SECRET;

  if (!secret) {
    log.error('[auth.webhook] SUPABASE_AUTH_HOOK_SECRET not set');
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  // Read raw body — svix needs the original bytes for HMAC verification
  const rawBody = await req.text();

  // Verify Standard Webhooks signature — rejects tampered or replayed payloads
  const wh = new Webhook(secret);
  try {
    wh.verify(rawBody, {
      'webhook-id': req.headers.get('webhook-id') ?? '',
      'webhook-timestamp': req.headers.get('webhook-timestamp') ?? '',
      'webhook-signature': req.headers.get('webhook-signature') ?? '',
    });
  } catch (err) {
    log.warn('[auth.webhook] Signature verification failed', { error: (err as Error).message });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = hookBodySchema.safeParse(JSON.parse(rawBody));
  if (!body.success) {
    return NextResponse.json({ error: body.error.message }, { status: 400 });
  }

  const { type, user, token_hash, redirect_to } = body.data;

  if (type === 'signup') {
    const name =
      String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? '')
        .split(' ')[0] || 'there';

    await dispatchEmail({
      template: 'auth.signup',
      to: user.email,
      data: { name, userId: user.id },
    });

    log.info('[auth.webhook] signup email dispatched', { userId: user.id });
  }

  if (type === 'email_change' && user.new_email) {
    const oldEmail = user.email;
    const newEmail = user.new_email;

    // Update the tenants row so future logins resolve correctly
    const supabase = createServiceClient();
    const { error: updateErr } = await supabase
      .from('tenants')
      .update({ email: newEmail })
      .eq('email', oldEmail);

    if (updateErr) {
      log.warn('[auth.webhook] email_change: tenant update failed', {
        error: updateErr.message,
        userId: user.id,
      });
    } else {
      void writeAuditLog(supabase, {
        tenant_id: user.id, // tenants.id == auth user id (see tenants RLS policy)
        event_type: 'tenant.email_changed',
        actor_type: 'user',
        actor_id: user.id,
        description: `Tenant email changed from ${oldEmail} to ${newEmail}`,
        affected_id: null,
        metadata: { old_email: oldEmail, new_email: newEmail },
      });

      await dispatchEmail({
        template: 'auth.email_changed',
        to: newEmail,
        data: { newEmail, userId: user.id },
      });

      log.info('[auth.webhook] email_change handled', { userId: user.id, newEmail });
    }
  }

  if (type === 'recovery' || type === 'password_recovery') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kakunin.ai';
    // Build reset URL from token_hash if available; otherwise direct to login
    const resetUrl = token_hash
      ? `${appUrl}/auth/reset-password?token_hash=${token_hash}&redirect_to=${encodeURIComponent(redirect_to ?? `${appUrl}/dashboard`)}`
      : `${appUrl}/auth/login`;

    await dispatchEmail({
      template: 'auth.password_recovery',
      to: user.email,
      data: { email: user.email, resetUrl, userId: user.id },
    });

    log.info('[auth.webhook] password_recovery email dispatched', { userId: user.id });
  }

  // Always return 200 — Supabase Auth hooks expect 200 to proceed
  return NextResponse.json({ received: true });
}
