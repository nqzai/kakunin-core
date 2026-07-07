import { type NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { requireVerifiedQStashBody } from '@/lib/queue/verify-qstash';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import { assertSafeUrl, UnsafeUrlError } from '@/lib/security/url-guard';
import { decryptOutbound, markSync, readExportCursor, writeExportCursor, type ExportCursor } from '@/lib/integrations/connections';
import { checkOtlpExportLimit } from '@/lib/integrations/otlp/ratelimit';
import {
  buildLogsPayload,
  buildMetricsPayload,
  buildTracePayload,
  OTLP_PATHS,
  type EventRow,
  type AgentMetricRow,
  type CertMetricRow,
} from '@/lib/integrations/otlp/transform';

/**
 * POST /api/internal/integrations/otlp-export (QStash worker — P1 RA-180)
 *
 * Exports one tenant's telemetry to their OTLP collector as OTLP/HTTP JSON
 * (metrics + logs + traces). Triggered by the cron sweep, never inline.
 * Progress is tracked with per-stream keyset cursors (config.cursor) advanced
 * per-signal, so retries are effectively exactly-once: deterministic span/trace
 * IDs make traces idempotent, logs are never re-sent once their cursor moves,
 * and metrics are idempotent snapshots.
 *
 * Returns 200 on success / skip / permanently-bad endpoint (no QStash retry);
 * 500 only on a transient delivery failure so QStash retries (retries: 3).
 */

interface ExportJob {
  connectionId: string;
  tenantId: string;
}

const EVENT_LIMIT = 500;
const CHAIN_LIMIT = 50;
const DELIVERY_TIMEOUT_MS = 10_000;

export async function POST(req: NextRequest) {
  const verified = await requireVerifiedQStashBody(req);
  if (!verified.ok) return verified.response;
  const { connectionId, tenantId } = JSON.parse(verified.body) as ExportJob;

  const supabase = createServiceClient();

  // Rate limit per connection — skip (no retry) if exceeded.
  const limit = await checkOtlpExportLimit(connectionId);
  if (!limit.allowed) {
    log.warn('[otlp-export] Rate limited, skipping', { connectionId });
    return NextResponse.json({ ok: false, reason: 'rate_limited' });
  }

  const { data: conn } = await supabase
    .from('integration_connections')
    .select('*')
    .eq('id', connectionId)
    .eq('tenant_id', tenantId) // rule #2
    .eq('enabled', true)
    .maybeSingle();

  if (!conn || !conn.endpoint_url) {
    return NextResponse.json({ ok: false, reason: 'connection_not_found' });
  }

  // SSRF guard before any outbound request. Permanently-bad endpoint → mark
  // errored + 200 (no retry), same posture as webhook-delivery.
  try {
    await assertSafeUrl(conn.endpoint_url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      await markSync(supabase, connectionId, tenantId, { error_message: `Unsafe endpoint: ${err.message}` });
      await writeAuditLog(supabase, {
        tenant_id: tenantId,
        event_type: 'integration.otlp_export_blocked',
        actor_type: 'system',
        actor_id: 'otlp-export-worker',
        description: `OTLP export blocked — unsafe endpoint ${conn.endpoint_url}: ${err.message}`,
        affected_id: connectionId,
        metadata: { provider: 'otlp', reason: 'ssrf_guard' },
      });
      return NextResponse.json({ ok: false, reason: 'unsafe_endpoint' });
    }
    throw err;
  }

  const exportStart = new Date().toISOString();

  // Per-stream keyset cursors (config.cursor). Independent cursors + (ts, id)
  // keyset = no boundary skips, no cross-stream rewind. See connections.ts.
  const cursor: ExportCursor = { ...readExportCursor(conn) };

  // ── Read events after the events cursor (keyset, bounded) ──────────────────
  let eventsQuery = supabase
    .from('behavior_events')
    .select('id, agent_id, chain_id, action_type, risk_score, risk_band, factors, occurred_at')
    .eq('tenant_id', tenantId)
    .order('occurred_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(EVENT_LIMIT);
  if (cursor.events) {
    const c = cursor.events;
    // Keyset: occurred_at > ts OR (occurred_at = ts AND id > ts-id). The id
    // tie-breaker is what stops rows sharing a millisecond from being skipped.
    eventsQuery = eventsQuery.or(`occurred_at.gt."${c.ts}",and(occurred_at.eq."${c.ts}",id.gt.${c.id})`);
  }
  const { data: rawEvents } = await eventsQuery;
  const events: EventRow[] = (rawEvents ?? []) as EventRow[];

  // Per-agent metric snapshot from the window (latest risk + event count).
  const agentMap = new Map<string, AgentMetricRow>();
  for (const e of events) {
    const prev = agentMap.get(e.agent_id);
    if (prev) {
      prev.events_count += 1;
      prev.risk_score = e.risk_score; // events are ascending → last wins = latest
      prev.risk_band = e.risk_band;
    } else {
      agentMap.set(e.agent_id, { agent_id: e.agent_id, risk_score: e.risk_score, risk_band: e.risk_band, events_count: 1 });
    }
  }

  // Drift snapshot (best-effort) for agents seen in the window.
  const agentIds = [...agentMap.keys()];
  if (agentIds.length) {
    const { data: drift } = await supabase
      .from('agent_drift_scores')
      .select('agent_id, drift_score, computed_at')
      .eq('tenant_id', tenantId)
      .in('agent_id', agentIds)
      .order('computed_at', { ascending: false });
    for (const d of drift ?? []) {
      const a = agentMap.get(d.agent_id);
      if (a && a.drift_score == null) a.drift_score = d.drift_score; // first = latest
    }
  }

  // Cert snapshot + revocation count (tenant-wide).
  const { data: certs } = await supabase
    .from('certificates')
    .select('serial_number, agent_id, status')
    .eq('tenant_id', tenantId);
  const certRows: CertMetricRow[] = (certs ?? []) as CertMetricRow[];
  const revocationsTotal = certRows.filter((c) => c.status === 'revoked').length;
  // agent_id → an active cert serial, for trace cert_serial attribution.
  const serialByAgent = new Map<string, string>();
  for (const c of certRows) if (c.status === 'active') serialByAgent.set(c.agent_id, c.serial_number);

  // Chains closed after the chains cursor → forward-going traces only.
  let chainsQuery = supabase
    .from('decision_chains')
    .select('id, name, status, created_at, closed_at')
    .eq('tenant_id', tenantId)
    .not('closed_at', 'is', null)
    .order('closed_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(CHAIN_LIMIT);
  if (cursor.chains) {
    const c = cursor.chains;
    chainsQuery = chainsQuery.or(`closed_at.gt."${c.ts}",and(closed_at.eq."${c.ts}",id.gt.${c.id})`);
  }
  const { data: chains } = await chainsQuery;

  // Fetch the FULL event set for each closing chain, independent of the
  // last_sync window. A long-running chain can open before `since` and close in
  // this window; filtering its spans by the cursor would emit only the tail and
  // produce an incomplete trace. Key by chain_id.
  const chainIds = (chains ?? []).map((c) => c.id);
  const chainEventsById = new Map<string, EventRow[]>();
  if (chainIds.length) {
    const { data: rawChainEvents } = await supabase
      .from('behavior_events')
      .select('id, agent_id, chain_id, action_type, risk_score, risk_band, factors, occurred_at')
      .eq('tenant_id', tenantId)
      .in('chain_id', chainIds)
      .order('occurred_at', { ascending: true });
    for (const e of (rawChainEvents ?? []) as EventRow[]) {
      if (!e.chain_id) continue;
      const arr = chainEventsById.get(e.chain_id) ?? [];
      arr.push(e);
      chainEventsById.set(e.chain_id, arr);
    }
  }

  // ── Build OTLP payloads ────────────────────────────────────────────────────
  const metricsBody = buildMetricsPayload({
    tenantId,
    observedAtIso: exportStart,
    agents: [...agentMap.values()],
    certs: certRows,
    revocationsTotal,
  });
  const logsBody = events.length ? buildLogsPayload(tenantId, events) : null;
  const traceBodies = (chains ?? []).map((c) => {
    const chainEvents = chainEventsById.get(c.id) ?? [];
    const certSerial = chainEvents.length ? serialByAgent.get(chainEvents[0].agent_id) : undefined;
    return buildTracePayload(tenantId, c, chainEvents, certSerial);
  });

  // ── Deliver ────────────────────────────────────────────────────────────────
  // Delivery is at-least-once (QStash retries a 500). We make it effectively
  // exactly-once per signal by advancing each stream's cursor the moment that
  // signal is delivered, so a later partial failure never re-sends it:
  //   1. logs  → advance the EVENTS cursor (logs have no protocol-level dedup,
  //      so re-delivery would duplicate records — must not happen).
  //   2. traces→ advance the CHAINS cursor (idempotent via deterministic IDs,
  //      but advancing avoids reprocessing every sweep).
  //   3. metrics→ snapshot of current state; gauges + cumulative counters are
  //      idempotent on (timestamp, value), so it is always safe to re-send and
  //      needs no cursor. Sent last so a metrics blip can't re-send logs.
  const { headers: customHeaders, apiKey } = decryptOutbound(conn);
  const base = conn.endpoint_url.replace(/\/$/, '');
  const headers: Record<string, string> = { 'content-type': 'application/json', ...customHeaders };
  if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;

  async function post(path: string, body: unknown): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
    try {
      const res = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`collector ${path} returned ${res.status}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  let delivered = 0;
  try {
    // 1. Logs → advance events cursor on success.
    if (logsBody) {
      await post(OTLP_PATHS.logs, logsBody);
      delivered += 1;
    }
    if (events.length) {
      const last = events[events.length - 1];
      cursor.events = { ts: last.occurred_at, id: last.id };
      await writeExportCursor(supabase, connectionId, tenantId, conn.config, cursor);
    }

    // 2. Traces → advance chains cursor after all chain traces deliver.
    for (const t of traceBodies) {
      await post(OTLP_PATHS.traces, t);
      delivered += 1;
    }
    const lastChain = chains?.[chains.length - 1];
    if (lastChain?.closed_at) {
      cursor.chains = { ts: lastChain.closed_at, id: lastChain.id };
      await writeExportCursor(supabase, connectionId, tenantId, conn.config, cursor);
    }

    // 3. Metrics snapshot (idempotent) — sent last, no cursor.
    await post(OTLP_PATHS.metrics, metricsBody);
    delivered += 1;
  } catch (err) {
    const message = (err as Error).message;
    log.warn('[otlp-export] Delivery failed', { connectionId, delivered, error: message });
    await markSync(supabase, connectionId, tenantId, { error_message: message });
    // Transient — let QStash retry. Already-advanced per-signal cursors mean the
    // retry resumes after delivered signals (no duplicate logs).
    return NextResponse.json({ ok: false, delivered, error: message }, { status: 500 });
  }

  // Touch last_sync for observability + least-recently-synced ordering. The
  // authoritative resume points are the per-stream cursors in config.
  await markSync(supabase, connectionId, tenantId, { last_sync: exportStart, error_message: null });
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'integration.otlp_exported',
    actor_type: 'system',
    actor_id: 'otlp-export-worker',
    description: `OTLP export delivered ${delivered} payload(s): ${events.length} events, ${traceBodies.length} traces`,
    affected_id: connectionId,
    metadata: { provider: 'otlp', events: events.length, traces: traceBodies.length },
  });

  log.info('[otlp-export] Delivered', { connectionId, delivered, events: events.length, traces: traceBodies.length });
  return NextResponse.json({ ok: true, delivered, events: events.length, traces: traceBodies.length });
}
