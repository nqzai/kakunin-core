/**
 * Chat Guardrails
 * Topic gating, off-topic detection, credential masking for autonomous chat.
 */

const ALLOWED_TOPICS = [
  'certificate',
  'api',
  'webhook',
  'risk',
  'compliance',
  'agent',
  'behavior',
  'event',
  'audit',
  'tenant',
  'account',
  'billing',
  'plan',
  'subscription',
  'feature',
  'kakunin',
  'onboard',
  'integration',
  'verify',
  'revoke',
  'token',
  'key',
  'credential',
  'mca',
  'eu',
  'ai act',
  'regulation',
];

const BLOCKED_PATTERNS = [
  /^(write|compose|generate|create)\s+(poem|poetry|story|song|rhyme)/i,
  /roleplay\s+as/i,
  /pretend\s+to\s+be/i,
  /(dump|leak|reveal|show)\s+(secrets?|keys?|credentials?|pem|private)/i,
  /ignore\s+your\s+(rules?|instructions?|guidelines?|constraints?)/i,
  /forget\s+everything/i,
  /reset\s+your\s+system\s+prompt/i,
  /what\s+are\s+your\s+instructions/i,
  /tell\s+me\s+your\s+system\s+prompt/i,
];

const CREDENTIAL_PATTERNS = [
  /arn:aws:[a-z\-]+:[a-z\-]*:\d+:[a-z\-/:.]*[a-z\-/:\d]+/gi,
  /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+RSA\s+PRIVATE\s+KEY-----/gi,
  /-----BEGIN\s+CERTIFICATE-----[\s\S]*?-----END\s+CERTIFICATE-----/gi,
  /sk_[a-z0-9]{24,}/gi,
  /pk_[a-z0-9]{24,}/gi,
];

export function checkTopicRelevance(message: string): { relevant: boolean; reason?: string } {
  // Short follow-ups always pass (≤12 words, likely context)
  if (message.trim().split(/\s+/).length <= 12) {
    return { relevant: true };
  }

  // Check if message contains at least one allowed topic
  const messageLower = message.toLowerCase();
  const hasAllowedTopic = ALLOWED_TOPICS.some((topic) => messageLower.includes(topic));

  if (!hasAllowedTopic) {
    return { relevant: false, reason: 'off-topic' };
  }

  return { relevant: true };
}

export function checkBlockedPatterns(message: string): { blocked: boolean; reason?: string } {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(message)) {
      return { blocked: true, reason: 'jailbreak attempt detected' };
    }
  }

  return { blocked: false };
}

export function maskCredentials(text: string): string {
  let masked = text;

  for (const pattern of CREDENTIAL_PATTERNS) {
    masked = masked.replace(pattern, '[REDACTED_CREDENTIAL]');
  }

  // Mask common AWS/GCP key patterns
  masked = masked.replace(
    /([A-Z0-9]{20})[A-Za-z0-9+/]{40}([A-Za-z0-9+/]{4}==)?/g,
    '[REDACTED_KEY]'
  );

  // Mask email-like credentials in URIs
  masked = masked.replace(/(?:postgres|mysql):\/\/[^@]+@[^:]+/g, '[REDACTED_CONNECTION_STRING]');

  return masked;
}

export function validateGuardrails(message: string): {
  valid: boolean;
  error?: string;
} {
  // Check for blocked patterns first (highest priority)
  const blockedCheck = checkBlockedPatterns(message);
  if (blockedCheck.blocked) {
    return { valid: false, error: 'Your message violates usage policies.' };
  }

  // Check topic relevance
  const topicCheck = checkTopicRelevance(message);
  if (!topicCheck.relevant) {
    return {
      valid: false,
      error: `I can only help with Kakunin-related questions: certificates, agents, compliance, billing, and integrations. Your question seems off-topic.`,
    };
  }

  return { valid: true };
}

export const CHAT_SYSTEM_PROMPT = `You are a customer support assistant for Kakunin, a compliance platform for AI agents. Your role is to help users and AI agents with:

1. **Certificates & PKI**: Issuance, rotation, revocation, X.509 details, validity periods
2. **Agent Management**: Registration, deactivation, monitoring, behavior tracking
3. **Compliance & Risk**: Risk scoring, risk bands (low/medium/high), behavior events, audit logs
4. **Integrations**: Webhooks, API usage, verification endpoints, CRL distribution
5. **Billing & Plans**: Subscription tiers, quotas, usage tracking, pricing
6. **Account & Onboarding**: Tenant setup, API key management, documentation links

**Guidelines:**
- Keep responses concise (≤600 characters). Use links to public resources when detailed docs are needed.
- Never reveal or construct KMS ARNs, private keys, or internal credentials.
- If a question involves sensitive security/compliance details you're uncertain about, suggest human review.
- Direct users to https://docs.kakunin.io for detailed documentation.
- Be helpful and professional; acknowledge if something is outside your scope.
- If a user asks about credential rotation or security procedures, verify they have proper authorization before providing guidance.

**Out of Scope**: General programming help, other products, non-Kakunin topics. Redirect politely.`;
