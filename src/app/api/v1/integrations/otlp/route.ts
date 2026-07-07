import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { UnsafeUrlError } from '@/lib/security/url-guard';
import { getConnection, upsertConnection, disableConnection } from '@/lib/integrations/connections';

/**
 * /api/v1/integrations/otlp — OTLP exporter connection management (P1 RA-178).
 *
 *   POST   connect / update a tenant's OTLP collector endpoint
 *   GET    connection status (never returns secrets)
 *   DELETE disable the connection
 *
 * Auth + tenant scoping via edge middleware (x-tenant-id). Credentials are
 * sealed AES-256-GCM; endpoint validated against the SSRF guard on write.
 */

const connectSchema = z.object({
  endpoint_url: z.string().url(),
  headers: z.record(z.string(), z.string()).optional(),
  api_key: z.string().min(1).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const parsed = connectSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }

  const supabase = createServiceClient();
  try {
    const row = await upsertConnection(supabase, {
      tenantId,
      provider: 'otlp',
      endpointUrl: parsed.data.endpoint_url,
      headers: parsed.data.headers,
      apiKey: parsed.data.api_key,
      config: parsed.data.config,
    });

    await writeAuditLog(supabase, {
      tenant_id: tenantId,
      event_type: 'integration.otlp_connected',
      actor_type: 'user',
      actor_id: tenantId,
      description: `OTLP exporter connected to ${parsed.data.endpoint_url}`,
      affected_id: row.id,
      metadata: { provider: 'otlp' },
    });

    return NextResponse.json({
      data: { id: row.id, provider: 'otlp', endpoint_url: row.endpoint_url, enabled: row.enabled },
    });
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: `Unsafe endpoint URL: ${err.message}` }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to connect OTLP exporter' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const supabase = createServiceClient();
  const row = await getConnection(supabase, tenantId, 'otlp');
  if (!row) return NextResponse.json({ data: { configured: false } });

  // Never return headers_enc / api_key_enc.
  return NextResponse.json({
    data: {
      configured: true,
      provider: 'otlp',
      endpoint_url: row.endpoint_url,
      enabled: row.enabled,
      last_sync: row.last_sync,
      error_message: row.error_message,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const supabase = createServiceClient();
  const ok = await disableConnection(supabase, tenantId, 'otlp');
  if (!ok) return NextResponse.json({ error: 'Failed to disable OTLP exporter' }, { status: 500 });

  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'integration.otlp_disconnected',
    actor_type: 'user',
    actor_id: tenantId,
    description: 'OTLP exporter disconnected',
    affected_id: tenantId,
    metadata: { provider: 'otlp' },
  });

  return NextResponse.json({ data: { disabled: true } });
}
