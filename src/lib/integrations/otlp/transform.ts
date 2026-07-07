/**
 * OTLP/HTTP JSON transform (P1 — RA-179).
 *
 * Builds OpenTelemetry OTLP/HTTP JSON request bodies (metrics, logs, traces)
 * from Kakunin DB rows. We construct the OTLP wire shapes directly rather than
 * pulling in @opentelemetry/sdk-node — its BatchSpanProcessor assumes a
 * long-lived process, an impedance mismatch with a stateless QStash worker.
 * The output is still OTLP-spec-compliant: we serialize to it, we don't invent
 * a format. Vendor-neutral by design — Datadog, Grafana, Honeycomb, Splunk all
 * ingest OTLP.
 *
 * PII: redaction is by construction. These transforms only ever read known-safe
 * signal fields (risk score/band, action type, factors, ids, timestamps). They
 * never read behavior_events.source_ip or the raw payload JSON, so no PII can
 * leave through the exporter. See docs/V2_BLUEPRINT.md §4.
 *
 * Timestamps are unix-nanosecond strings (OTLP requires fixed64 as string).
 * Traces are forward-going only — backends drop spans older than their ingest
 * lookback, so historical decision chains export as logs/metrics, not traces.
 */

import { traceIdFromUuid, spanIdFromUuid } from './ids';

// ─── OTLP attribute helpers ──────────────────────────────────────────────────

export type OtlpAttribute = { key: string; value: OtlpAnyValue };
type OtlpAnyValue =
  | { stringValue: string }
  | { intValue: string }
  | { doubleValue: number }
  | { boolValue: boolean }
  | { arrayValue: { values: OtlpAnyValue[] } };

export function strAttr(key: string, v: string): OtlpAttribute {
  return { key, value: { stringValue: v } };
}
export function numAttr(key: string, v: number): OtlpAttribute {
  return { key, value: { doubleValue: v } };
}
export function strArrayAttr(key: string, vs: string[]): OtlpAttribute {
  return { key, value: { arrayValue: { values: vs.map((s) => ({ stringValue: s })) } } };
}

// ─── OTLP signal shapes (subset we emit) ─────────────────────────────────────

export interface OtlpNumberDataPoint {
  timeUnixNano: string;
  asDouble?: number;
  asInt?: string;
  attributes: OtlpAttribute[];
}
export interface OtlpMetric {
  name: string;
  unit: string;
  gauge?: { dataPoints: OtlpNumberDataPoint[] };
  sum?: { isMonotonic: boolean; aggregationTemporality: number; dataPoints: OtlpNumberDataPoint[] };
}
export interface OtlpSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: OtlpAttribute[];
}
export interface OtlpLogRecord {
  timeUnixNano: string;
  severityNumber: number;
  severityText: string;
  body: { stringValue: string };
  attributes: OtlpAttribute[];
  traceId?: string;
  spanId?: string;
}

/** ISO timestamp → unix-nanosecond string. Falls back to now() on bad input. */
export function toUnixNano(iso: string): string {
  const ms = Date.parse(iso);
  const safe = Number.isFinite(ms) ? ms : Date.now();
  return (BigInt(safe) * BigInt(1_000_000)).toString();
}

function resource(tenantId: string) {
  return {
    attributes: [
      strAttr('service.name', 'kakunin'),
      strAttr('service.namespace', 'kakunin'),
      strAttr('kakunin.tenant_id', tenantId),
    ],
  };
}

const SCOPE = { name: 'kakunin', version: 'v1' };

// ─── Inputs ───────────────────────────────────────────────────────────────────

export interface AgentMetricRow {
  agent_id: string;
  risk_score: number;
  risk_band: string;
  events_count: number;
  drift_score?: number | null;
}
export interface CertMetricRow {
  serial_number: string;
  agent_id: string;
  status: string; // 'active' | 'revoked' | 'expired' | ...
}
export interface MetricsInput {
  tenantId: string;
  observedAtIso: string;
  agents: AgentMetricRow[];
  certs: CertMetricRow[];
  revocationsTotal: number;
}

export interface EventRow {
  id: string;
  agent_id: string;
  chain_id: string | null;
  action_type: string;
  risk_score: number;
  risk_band: string;
  factors: string[];
  occurred_at: string;
}

export interface ChainRow {
  id: string;
  name: string;
  status: string;
  created_at: string;
  closed_at: string | null;
}

// ─── Metrics ────────────────────────────────────────────────────────────────

const CERT_STATUS_NUM: Record<string, number> = { active: 1, expired: 0, revoked: -1 };

/** Build an OTLP ExportMetricsServiceRequest body. */
export function buildMetricsPayload(input: MetricsInput) {
  const nano = toUnixNano(input.observedAtIso);

  const riskGauge: OtlpMetric = {
    name: 'kakunin.agent.risk_score',
    unit: '1',
    gauge: {
      dataPoints: input.agents.map((a) => ({
        timeUnixNano: nano,
        asDouble: a.risk_score,
        attributes: [strAttr('agent_id', a.agent_id), strAttr('risk_band', a.risk_band)],
      })),
    },
  };

  // Per-export-window event count, emitted as a GAUGE (not a counter). The
  // producer feeds counts of rows in this sweep's window, not an all-time
  // total. A gauge is idempotent on retry — re-delivering the same window
  // re-writes the same (timestamp, value) point instead of double-incrementing
  // a sum. A cumulative/delta counter would over- or under-count whenever the
  // QStash worker retries a partially-delivered export.
  const eventsWindow: OtlpMetric = {
    name: 'kakunin.agent.events_in_window',
    unit: '1',
    gauge: {
      dataPoints: input.agents.map((a) => ({
        timeUnixNano: nano,
        asInt: String(a.events_count),
        attributes: [strAttr('agent_id', a.agent_id)],
      })),
    },
  };

  const driftGauge: OtlpMetric = {
    name: 'kakunin.agent.drift_score',
    unit: '1',
    gauge: {
      dataPoints: input.agents
        .filter((a) => typeof a.drift_score === 'number')
        .map((a) => ({
          timeUnixNano: nano,
          asDouble: a.drift_score as number,
          attributes: [strAttr('agent_id', a.agent_id)],
        })),
    },
  };

  const certStatus: OtlpMetric = {
    name: 'kakunin.cert.status',
    unit: '1',
    gauge: {
      dataPoints: input.certs.map((c) => ({
        timeUnixNano: nano,
        asInt: String(CERT_STATUS_NUM[c.status] ?? 0),
        attributes: [
          strAttr('agent_id', c.agent_id),
          strAttr('serial_number', c.serial_number),
          strAttr('status', c.status),
        ],
      })),
    },
  };

  const revocationsTotal: OtlpMetric = {
    name: 'kakunin.revocations_total',
    unit: '1',
    sum: {
      isMonotonic: true,
      aggregationTemporality: 2,
      dataPoints: [{ timeUnixNano: nano, asInt: String(input.revocationsTotal), attributes: [] }],
    },
  };

  return {
    resourceMetrics: [
      {
        resource: resource(input.tenantId),
        scopeMetrics: [
          { scope: SCOPE, metrics: [riskGauge, eventsWindow, driftGauge, certStatus, revocationsTotal] },
        ],
      },
    ],
  };
}

// ─── Logs ───────────────────────────────────────────────────────────────────

/** risk_band → OTLP severityNumber (1-24 scale). */
function severityNumber(band: string): number {
  switch (band) {
    case 'high': return 17; // ERROR
    case 'medium': return 13; // WARN
    default: return 9; // INFO
  }
}

/** Build an OTLP ExportLogsServiceRequest body from behavioral events. */
export function buildLogsPayload(tenantId: string, events: EventRow[]) {
  const logRecords = events.map((e) => {
    const attrs: OtlpAttribute[] = [
      strAttr('agent_id', e.agent_id),
      strAttr('event_id', e.id),
      strAttr('action_type', e.action_type),
      numAttr('risk_score', e.risk_score),
      strAttr('risk_band', e.risk_band),
      strArrayAttr('factors', e.factors ?? []),
    ];
    if (e.chain_id) attrs.push(strAttr('chain_id', e.chain_id));

    const record: OtlpLogRecord = {
      timeUnixNano: toUnixNano(e.occurred_at),
      severityNumber: severityNumber(e.risk_band),
      severityText: e.risk_band,
      body: { stringValue: e.action_type },
      attributes: attrs,
    };
    // Correlate the log to its trace/span when the event is part of a chain.
    if (e.chain_id) {
      record.traceId = traceIdFromUuid(e.chain_id);
      record.spanId = spanIdFromUuid(e.id);
    }
    return record;
  });

  return {
    resourceLogs: [
      {
        resource: resource(tenantId),
        scopeLogs: [{ scope: SCOPE, logRecords }],
      },
    ],
  };
}

// ─── Traces ─────────────────────────────────────────────────────────────────

/**
 * Build an OTLP ExportTraceServiceRequest body for ONE decision chain.
 * The chain becomes a trace with a root span; each event in the chain becomes
 * a child span. `certSerial` (the governing cert) is attached as a span
 * attribute so the customer can pivot from their APM trace to the cert.
 */
export function buildTracePayload(
  tenantId: string,
  chain: ChainRow,
  events: EventRow[],
  certSerial?: string,
) {
  const traceId = traceIdFromUuid(chain.id);
  const rootSpanId = spanIdFromUuid(chain.id);
  const chainStart = toUnixNano(chain.created_at);
  const chainEnd = toUnixNano(chain.closed_at ?? chain.created_at);

  const rootSpan: OtlpSpan = {
    traceId,
    spanId: rootSpanId,
    name: chain.name || 'decision_chain',
    kind: 1, // INTERNAL
    startTimeUnixNano: chainStart,
    endTimeUnixNano: chainEnd,
    attributes: [
      strAttr('chain_id', chain.id),
      strAttr('chain_status', chain.status),
      ...(certSerial ? [strAttr('cert_serial', certSerial)] : []),
    ],
  };

  const eventSpans: OtlpSpan[] = events.map((e) => {
    const nano = toUnixNano(e.occurred_at);
    const attrs: OtlpAttribute[] = [
      strAttr('event_id', e.id),
      strAttr('agent_id', e.agent_id),
      strAttr('action_type', e.action_type),
      numAttr('risk_score', e.risk_score),
      strAttr('risk_band', e.risk_band),
      strArrayAttr('factors', e.factors ?? []),
    ];
    if (certSerial) attrs.push(strAttr('cert_serial', certSerial));
    return {
      traceId,
      spanId: spanIdFromUuid(e.id),
      parentSpanId: rootSpanId,
      name: e.action_type,
      kind: 1,
      startTimeUnixNano: nano,
      endTimeUnixNano: nano,
      attributes: attrs,
    };
  });

  return {
    resourceSpans: [
      {
        resource: resource(tenantId),
        scopeSpans: [{ scope: SCOPE, spans: [rootSpan, ...eventSpans] }],
      },
    ],
  };
}

/** OTLP/HTTP signal paths appended to a collector's base endpoint. */
export const OTLP_PATHS = {
  metrics: '/v1/metrics',
  logs: '/v1/logs',
  traces: '/v1/traces',
} as const;
