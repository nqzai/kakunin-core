import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from '@/lib/email/client';
import { renderTemplate } from '@/lib/email/templates';
import { log } from '@/lib/logging';
import type { EmailTemplate } from '@/lib/email/templates';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';

/**
 * POST /api/internal/send-email (QStash worker)
 *
 * Delivers a transactional email via Resend.
 * Logs every attempt to audit_log (event_type: 'email.sent').
 *
 * Returns 200 always for auth/system emails so QStash doesn't retry infinitely
 * on permanent failures (e.g. invalid address). Returns 500 on transient
 * failures (Resend API down) to trigger QStash exponential backoff.
 *
 * Worker auth is enforced first via requireVerifiedQStashBody().
 */

// Don't pre-render this route during build — it requires RESEND_API_KEY
export const dynamic = 'force-dynamic';

interface SendEmailPayload {
  template: EmailTemplate;
  to: string | string[];
  data: Record<string, unknown>;
}

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;

  const job = JSON.parse(verified.body) as SendEmailPayload;
  const { template, to, data } = job;

  const recipients = Array.isArray(to) ? to : [to];

  // Render template — if unknown template, fail fast (no retry needed)
  let subject: string;
  let html: string;
  try {
    ({ subject, html } = renderTemplate(template, data));
  } catch (err) {
    log.error('[send-email] Unknown template', { template, error: (err as Error).message });
    return NextResponse.json({ ok: false, reason: 'unknown_template' });
  }

  // Send via Resend
  const { data: resendData, error: resendError } = await resend.emails.send({
    from: EMAIL_FROM,
    replyTo: EMAIL_REPLY_TO,
    to: recipients,
    subject,
    html,
  });

  if (resendError) {
    log.error('[send-email] Resend error', { template, to: recipients, error: resendError.message });

    // Permanent errors (invalid email, domain not verified) — return 200 to stop retries
    const isPermanent =
      resendError.message.includes('invalid') ||
      resendError.message.includes('not verified') ||
      resendError.message.includes('not found');

    if (isPermanent) {
      return NextResponse.json({ ok: false, reason: resendError.message });
    }

    // Transient — return 500 so QStash retries with exponential backoff
    return NextResponse.json({ ok: false, reason: resendError.message }, { status: 500 });
  }

  // Write audit_log — non-blocking, never throw
  const supabase = createServiceClient();
  const tenantId = typeof data.tenantId === 'string' && data.tenantId.trim() ? data.tenantId.trim() : null;
  const actorId = String(data.actorId ?? 'send-email-worker');

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'email.sent',
    actor_type: 'system',
    actor_id: actorId,
    description: `Transactional email sent: ${template}`,
    affected_id: null,
    metadata: {
      template,
      to: recipients,
      resend_id: resendData?.id,
      tenant_id: tenantId,
    },
  });

  log.info('[send-email] Sent', { template, to: recipients, resend_id: resendData?.id });
  return NextResponse.json({ ok: true, resend_id: resendData?.id });
}
