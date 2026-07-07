/**
 * Business Email Guard
 *
 * Three-layer check:
 *   1. Consumer domains — known free providers (Gmail, Yahoo, etc.)
 *   2. Disposable domains — ~100k temp mail services via community package
 *   3. Custom additions — domains confirmed disposable but missing from package
 *
 * Safe to call server-side (Node) or in API routes.
 * Do NOT import in Client Components — bundle size.
 *
 * When a new disposable domain slips through, add it to CUSTOM_BLOCKED_DOMAINS
 * and open a PR to disposable-email-domains upstream.
 */
import disposableDomains from 'disposable-email-domains';

// Domains confirmed as disposable/temp but not yet in the community package
const CUSTOM_BLOCKED_DOMAINS = new Set([
  'dardr.com',
]);

// Major free consumer providers not always in the disposable list
const CONSUMER_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'yahoo.fr', 'yahoo.de',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.fr', 'hotmail.de',
  'outlook.com', 'outlook.co.uk', 'live.com', 'live.co.uk',
  'msn.com', 'passport.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'aim.com',
  'protonmail.com', 'proton.me', 'pm.me',
  'tutanota.com', 'tuta.io',
  'mail.com', 'email.com', 'inbox.com',
  'zoho.com', 'yandex.com', 'yandex.ru',
  'gmx.com', 'gmx.net', 'gmx.de',
  'web.de', 'freenet.de', 't-online.de',
  'comcast.net', 'verizon.net', 'att.net', 'sbcglobal.net',
  'cox.net', 'charter.net', 'earthlink.net',
  'fastmail.com', 'fastmail.fm',
  'hey.com',
]);

const DISPOSABLE_SET = new Set(disposableDomains as string[]);

export type EmailCheckResult =
  | { allowed: true }
  | { allowed: false; reason: 'consumer' | 'disposable' | 'invalid' };

export function checkBusinessEmail(email: string): EmailCheckResult {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2 || !parts[1] || !parts[1].includes('.')) {
    return { allowed: false, reason: 'invalid' };
  }

  const domain = parts[1];

  if (CONSUMER_DOMAINS.has(domain)) {
    return { allowed: false, reason: 'consumer' };
  }

  if (DISPOSABLE_SET.has(domain) || CUSTOM_BLOCKED_DOMAINS.has(domain)) {
    return { allowed: false, reason: 'disposable' };
  }

  return { allowed: true };
}

export function businessEmailErrorMessage(reason: 'consumer' | 'disposable' | 'invalid'): string {
  if (reason === 'consumer') return 'Please use your work email. Personal email addresses are not accepted.';
  if (reason === 'disposable') return 'Disposable email addresses are not accepted. Please use your work email.';
  return 'Enter a valid email address.';
}
