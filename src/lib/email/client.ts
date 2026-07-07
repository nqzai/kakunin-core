/**
 * Resend Email Client
 *
 * Lazily-initialized Resend instance. All transactional email goes through here.
 * From address: ai@mail.kakunin.ai (subdomain preserves kakunin.ai reputation)
 * Reply-to: ai@kakunin.ai (routes inbound replies to AgentMail platform inbox)
 */
import { Resend } from 'resend';

let resendInstance: Resend | null = null;

export function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

export const resend = new Proxy({} as unknown as Resend, {
  get(target, prop: string | symbol) {
    const instance = getResend();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const _fromAddress = process.env.RESEND_FROM_EMAIL ?? 'ai@mail.kakunin.ai';
export const EMAIL_FROM = `Kakunin <${_fromAddress}>`;
export const EMAIL_REPLY_TO = process.env.RESEND_REPLY_TO ?? 'ai@kakunin.ai';
