import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';
import type { Json } from '@/types/database';

/**
 * GET /v1/audit-log/export
 *
 * Full audit log export for regulatory submission. Streams all matching
 * rows in a single response (no pagination — this is a bulk export).
 *
 * Query params:
 *   format      — csv | json (default: csv)
 *   from        — ISO 8601 start timestamp (inclusive)
 *   to          — ISO 8601 end timestamp (inclusive)
 *   event_type  — exact filter (e.g. "certificate.issued")
 *   actor_type  — user | agent | system
 *
 * Returns 400 if 'to' is missing (unbounded exports are rejected for safety).
 * Cap: 50 000 rows max — sufficient for 6+ months of a mid-volume tenant.
 * Content-Disposition: attachment — triggers browser download.
 *
 * Access: API-key authenticated (validated by middleware).
 * Tenant scope enforced via x-tenant-id header set by middleware.
 */

const MAX_ROWS = 50_000;

export async function GET(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { searchParams } = new URL(req.url);

  const format = searchParams.get('format') ?? 'csv';
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const eventType = searchParams.get('event_type');
  const actorType = searchParams.get('actor_type');

  if (format !== 'csv' && format !== 'json') {
    return NextResponse.json({ error: 'format must be csv or json' }, { status: 400 });
  }

  if (!to) {
    return NextResponse.json(
      { error: "'to' is required — unbounded exports are rejected. Provide an ISO 8601 end timestamp." },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  let query = supabase
    .from('audit_log')
    .select('id, event_type, actor_type, actor_id, description, affected_id, metadata, created_at')
    .eq('tenant_id', tenantId)
    .lte('created_at', to)
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);

  if (from) query = query.gte('created_at', from);
  if (eventType) query = query.eq('event_type', eventType);
  if (actorType) query = query.eq('actor_type', actorType);

  const { data: rows, error } = await query;

  if (error) {
    log.error('[audit-log.export]', error);
    return NextResponse.json({ error: 'Failed to export audit log' }, { status: 500 });
  }

  const safeRows = rows ?? [];

  // RA-157: record this bulk audit-log read for access auditing. Regulators may
  // ask "who read the audit trail and when" — this is that trail.
  await supabase.from('audit_log_access').insert({
    tenant_id: tenantId,
    accessed_by: tenantId,
    actor_type: 'user',
    purpose: 'regulatory_export',
    filters: { format, from, to, event_type: eventType, actor_type: actorType } as Json,
    row_count: safeRows.length,
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `kakunin-audit-log-${timestamp}.${format}`;

  if (format === 'json') {
    return new NextResponse(JSON.stringify({ data: safeRows, exported_at: new Date().toISOString(), total: safeRows.length }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  // CSV format
  const CSV_HEADERS = ['id', 'event_type', 'actor_type', 'actor_id', 'description', 'affected_id', 'metadata', 'created_at'];

  function csvEscape(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    // Wrap in quotes if contains comma, newline, or quote
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  const csvLines = [
    CSV_HEADERS.join(','),
    ...safeRows.map((row) =>
      CSV_HEADERS.map((h) => csvEscape(row[h as keyof typeof row])).join(',')
    ),
  ];

  return new NextResponse(csvLines.join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
