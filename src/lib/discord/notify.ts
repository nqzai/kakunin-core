/**
 * Discord Notifications
 *
 * One-way webhook notifications to internal Discord channels.
 * Fire-and-forget — never throws, never blocks the response path.
 */

const SIGNUP_WEBHOOK = process.env.DISCORD_SIGNUP_WEBHOOK_URL;

export interface SignupNotification {
  email: string;
  tenantId: string;
  plan: string;
  name?: string;
}

/**
 * Notify #new-signups channel when a new tenant is provisioned.
 * Non-blocking — wraps in try/catch, logs warning on failure.
 */
export async function notifyNewSignup(payload: SignupNotification): Promise<void> {
  if (!SIGNUP_WEBHOOK) {
    console.warn('[discord/notify] DISCORD_SIGNUP_WEBHOOK_URL not set — skipping signup notification');
    return;
  }

  const now = new Date().toISOString();
  const domain = payload.email.split('@')[1] ?? 'unknown';

  const body = {
    embeds: [
      {
        title: '🔐 New Signup',
        color: 0x2B934F, // Kakunin green
        fields: [
          { name: '📧 Email',     value: payload.email,     inline: true },
          { name: '🏢 Domain',    value: domain,            inline: true },
          { name: '📦 Plan',      value: payload.plan,      inline: true },
          { name: '🆔 Tenant ID', value: `\`${payload.tenantId.slice(0, 8)}…\``, inline: true },
          ...(payload.name ? [{ name: '👤 Name', value: payload.name, inline: true }] : []),
        ],
        footer: { text: 'kakunin.ai' },
        timestamp: now,
      },
    ],
  };

  try {
    const res = await fetch(SIGNUP_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('[discord/notify] webhook returned', res.status);
    }
  } catch (err) {
    // Non-blocking — signup must not fail because of a notification error
    console.warn('[discord/notify] failed to send signup notification', err);
  }
}
