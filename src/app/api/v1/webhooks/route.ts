import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { createHash, randomBytes } from 'crypto';
import { encryptSecret } from '@/lib/webhooks/crypto';
import { createWebhookWithQuota } from '@/lib/quota/resource-quota';
import type { Json } from '@/types/database';
import { log } from '@/lib/logging';
import { parseBody } from '@/lib/api/validation';
import { serverError } from '@/lib/api/responses';

// Supported event types for webhook subscriptions
const WEBHOOK_EVENTS = [
  'certificate.issued',
  'certificate.revoked',
  'risk.alert',
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const createWebhookSchema = z.object({
  url: z.string().url({ message: 'url must be a valid HTTPS URL' }).refine(
    (u) => u.startsWith('https://'),
    { message: 'url must use HTTPS' }
  ),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, { message: 'events must contain at least one event type' })
    .refine((arr) => new Set(arr).size === arr.length, {
      message: 'events must not contain duplicates',
    }),
});

/**
 * Generates a webhook signing secret plus its SHA-256 hash and AES-256-GCM
 * encrypted form. Raw secret returned once to the caller — never stored plain.
 *
 * Format: whsec_<32 random hex bytes>
 */
function generateSecret(): { raw: string; hash: string; enc: string } {
  const raw = `whsec_${randomBytes(32).toString('hex')}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const enc = encryptSecret(raw);
  return { raw, hash, enc };
}

/** Masks all but first 12 chars of the secret for the response */
function maskSecret(raw: string): string {
  return `${raw.slice(0, 12)}${'*'.repeat(raw.length - 12)}`;
}

// ─── POST /v1/webhooks ────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;

  const parsed = await parseBody(req, createWebhookSchema);
  if (!parsed.ok) return parsed.response;

  const { url, events } = parsed.data;
  const { raw: secret, hash: secretHash, enc: secretEnc } = generateSecret();

  const supabase = createServiceClient();

  // Fetch plan tier and create the webhook through one quota-aware DB transaction
  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan_tier')
    .eq('id', tenantId)
    .single();

  const planTier = (tenant as { plan_tier?: string } | null)?.plan_tier ?? 'pending';
  const webhookQuota = await createWebhookWithQuota(supabase, {
    tenantId,
    planTier,
    url,
    events: events as string[],
    secretHash,
    secretEnc,
  });

  if (!webhookQuota.allowed) {
    return NextResponse.json(
      {
        error: `Webhook endpoint limit reached for your plan.`,
        quota: { limit: webhookQuota.limit, current: webhookQuota.current, plan: planTier },
      },
      { status: 429 },
    );
  }

  const webhook = webhookQuota.webhook as (Json & {
    id: string;
    url: string;
    events: WebhookEvent[];
    active: boolean;
    created_at: string;
  }) | null;

  if (!webhook) {
    log.error('[webhooks.create] create_webhook_with_quota returned no webhook row');
    return serverError('Failed to register webhook');
  }

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'webhook.registered',
    actor_type: 'system',
    actor_id: tenantId,
    description: `Webhook registered for events [${events.join(', ')}] → ${url}`,
    affected_id: webhook.id,
    metadata: {
      webhook_id: webhook.id,
      url,
      events,
    },
  });

  return NextResponse.json(
    {
      data: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        active: webhook.active,
        created_at: webhook.created_at,
        // Secret shown ONCE — never retrievable again
        secret: secret,
        secret_hint: maskSecret(secret),
      },
    },
    { status: 201 }
  );
}

// ─── GET /v1/webhooks ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;

  const supabase = createServiceClient();

  const { data: webhooks, error } = await supabase
    .from('webhooks')
    .select('id, url, events, active, created_at, updated_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    log.error('[webhooks.list] DB query failed', error);
    return serverError('Failed to fetch webhooks');
  }

  return NextResponse.json({ data: webhooks });
}
