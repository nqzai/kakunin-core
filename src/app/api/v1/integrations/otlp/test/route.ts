import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard';
import { getConnection, decryptOutbound } from '@/lib/integrations/connections';
import { checkOtlpExportLimit } from '@/lib/integrations/otlp/ratelimit';
import { buildMetricsPayload, OTLP_PATHS } from '@/lib/integrations/otlp/transform';

/**
 * POST /api/v1/integrations/otlp/test (P1 RA-178)
 *
 * Sends a tiny synthetic metrics payload to the tenant's configured OTLP
 * collector and reports whether it accepted it. Immediate (not via QStash) so
 * the UI gets instant feedback. SSRF-guarded + rate-limited.
 */

const TEST_TIMEOUT_MS = 8_000;

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const supabase = createServiceClient();

  const conn = await getConnection(supabase, tenantId, 'otlp');
  if (!conn || !conn.endpoint_url) {
    return NextResponse.json({ error: 'No OTLP connection configured' }, { status: 404 });
  }

  // rule #4: rate-limit before the outbound call.
  const limit = await checkOtlpExportLimit(conn.id);
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded, try again shortly' }, { status: 429 });
  }

  try {
    await assertSafeUrl(conn.endpoint_url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: `Unsafe endpoint URL: ${err.message}` }, { status: 400 });
    }
    throw err;
  }

  const body = buildMetricsPayload({
    tenantId,
    observedAtIso: new Date().toISOString(),
    agents: [{ agent_id: 'otlp-connection-test', risk_score: 0, risk_band: 'low', events_count: 0 }],
    certs: [],
    revocationsTotal: 0,
  });

  const { headers: customHeaders, apiKey } = decryptOutbound(conn);
  const headers: Record<string, string> = { 'content-type': 'application/json', ...customHeaders };
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);
    const res = await fetch(`${conn.endpoint_url.replace(/\/$/, '')}${OTLP_PATHS.metrics}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return NextResponse.json({ data: { ok: res.ok, status: res.status } });
  } catch (err) {
    return NextResponse.json({ data: { ok: false, error: (err as Error).message } });
  }
}
