import { describe, it, expect } from 'vitest';
import { traceIdFromUuid, spanIdFromUuid } from '@/lib/integrations/otlp/ids';
import {
  buildMetricsPayload,
  buildLogsPayload,
  buildTracePayload,
  toUnixNano,
  OTLP_PATHS,
  type EventRow,
  type ChainRow,
} from '@/lib/integrations/otlp/transform';

import { readExportCursor } from '@/lib/integrations/connections';

const UUID_A = '550e8400-e29b-41d4-a716-446655440000';
const UUID_B = '550e8400-e29b-41d4-a716-446655440001';

describe('readExportCursor — per-stream keyset cursor', () => {
  it('returns empty when config has no cursor', () => {
    expect(readExportCursor({ config: null })).toEqual({});
    expect(readExportCursor({ config: {} })).toEqual({});
    expect(readExportCursor({ config: { other: 1 } })).toEqual({});
  });

  it('extracts events + chains stream cursors from config.cursor', () => {
    const cursor = {
      events: { ts: '2026-05-30T12:00:00.000+00:00', id: UUID_A },
      chains: { ts: '2026-05-30T11:00:00.000+00:00', id: UUID_B },
    };
    expect(readExportCursor({ config: { cursor } })).toEqual(cursor);
  });

  it('drops a cursor with a non-UUID id (filter-injection guard)', () => {
    const cursor = { events: { ts: '2026-05-30T12:00:00.000+00:00', id: '0,or(tenant_id.neq.x)' } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });

  it('drops a cursor with a ts carrying PostgREST filter metacharacters', () => {
    const cursor = { events: { ts: '2026"),or(tenant_id.neq.x', id: UUID_A } };
    expect(readExportCursor({ config: { cursor } })).toEqual({});
  });

  it('keeps a valid stream while dropping an invalid sibling', () => {
    const cursor = {
      events: { ts: '2026-05-30T12:00:00.123456+00:00', id: UUID_A },
      chains: { ts: 'not-a-date', id: UUID_B },
    };
    expect(readExportCursor({ config: { cursor } })).toEqual({
      events: { ts: '2026-05-30T12:00:00.123456+00:00', id: UUID_A },
    });
  });
});

describe('otlp ids — deterministic + valid', () => {
  it('trace id is 32 hex, span id is 16 hex', () => {
    expect(traceIdFromUuid(UUID_A)).toMatch(/^[0-9a-f]{32}$/);
    expect(spanIdFromUuid(UUID_A)).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic (idempotent retries)', () => {
    expect(traceIdFromUuid(UUID_A)).toBe(traceIdFromUuid(UUID_A));
    expect(spanIdFromUuid(UUID_A)).toBe(spanIdFromUuid(UUID_A));
  });

  it('different uuids → different ids', () => {
    expect(traceIdFromUuid(UUID_A)).not.toBe(traceIdFromUuid(UUID_B));
    expect(spanIdFromUuid(UUID_A)).not.toBe(spanIdFromUuid(UUID_B));
  });

  it('trace and span salts differ so a chain uuid never collides with itself', () => {
    expect(traceIdFromUuid(UUID_A).slice(0, 16)).not.toBe(spanIdFromUuid(UUID_A));
  });
});

describe('toUnixNano', () => {
  it('converts ISO to nanosecond string', () => {
    expect(toUnixNano('1970-01-01T00:00:01.000Z')).toBe('1000000000');
  });
  it('falls back to now() on garbage (no throw)', () => {
    expect(toUnixNano('not-a-date')).toMatch(/^\d+$/);
  });
});

const evt = (over: Partial<EventRow> = {}): EventRow => ({
  id: UUID_A,
  agent_id: 'agent-1',
  chain_id: null,
  action_type: 'transaction_initiated',
  risk_score: 0.42,
  risk_band: 'medium',
  factors: ['scope_ok'],
  occurred_at: '2026-05-30T10:00:00.000Z',
  ...over,
});

describe('buildMetricsPayload', () => {
  const body = buildMetricsPayload({
    tenantId: 'tenant-1',
    observedAtIso: '2026-05-30T10:00:00.000Z',
    agents: [
      { agent_id: 'a1', risk_score: 0.9, risk_band: 'high', events_count: 5, drift_score: 0.3 },
      { agent_id: 'a2', risk_score: 0.1, risk_band: 'low', events_count: 2 },
    ],
    certs: [
      { serial_number: 'S1', agent_id: 'a1', status: 'active' },
      { serial_number: 'S2', agent_id: 'a2', status: 'revoked' },
    ],
    revocationsTotal: 1,
  });
  const metrics = body.resourceMetrics[0].scopeMetrics[0].metrics;
  const byName = Object.fromEntries(metrics.map((m) => [m.name, m]));

  it('emits all five metric series', () => {
    expect(Object.keys(byName).sort()).toEqual([
      'kakunin.agent.drift_score',
      'kakunin.agent.events_in_window',
      'kakunin.agent.risk_score',
      'kakunin.cert.status',
      'kakunin.revocations_total',
    ]);
  });

  it('risk_score gauge tags risk_band per agent', () => {
    const dp = byName['kakunin.agent.risk_score'].gauge!.dataPoints;
    expect(dp).toHaveLength(2);
    expect(dp[0].attributes).toContainEqual({ key: 'risk_band', value: { stringValue: 'high' } });
  });

  it('events_in_window is an idempotent gauge with int values', () => {
    const metric = byName['kakunin.agent.events_in_window'];
    expect(metric.sum).toBeUndefined(); // gauge, not a counter
    expect(metric.gauge!.dataPoints[0].asInt).toBe('5');
  });

  it('drift gauge only includes agents with a drift score', () => {
    expect(byName['kakunin.agent.drift_score'].gauge!.dataPoints).toHaveLength(1);
  });

  it('cert status maps active=1 revoked=-1 and revocations_total counts', () => {
    const certDp = byName['kakunin.cert.status'].gauge!.dataPoints;
    const hasSerial = (d: { attributes: { value: unknown }[] }, serial: string) =>
      d.attributes.some((a) => (a.value as { stringValue?: string }).stringValue === serial);
    expect(certDp.find((d) => hasSerial(d, 'S1'))?.asInt).toBe('1');
    expect(byName['kakunin.revocations_total'].sum!.dataPoints[0].asInt).toBe('1');
  });

  it('resource carries service.name=kakunin + tenant id', () => {
    const attrs = body.resourceMetrics[0].resource.attributes;
    expect(attrs).toContainEqual({ key: 'service.name', value: { stringValue: 'kakunin' } });
    expect(attrs).toContainEqual({ key: 'kakunin.tenant_id', value: { stringValue: 'tenant-1' } });
  });
});

describe('buildLogsPayload', () => {
  it('one log record per event with severity + attributes', () => {
    const body = buildLogsPayload('tenant-1', [evt({ risk_band: 'high' })]);
    const rec = body.resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(rec.severityNumber).toBe(17); // high → ERROR
    expect(rec.body).toEqual({ stringValue: 'transaction_initiated' });
    expect(rec.attributes).toContainEqual({ key: 'risk_score', value: { doubleValue: 0.42 } });
    expect(rec.attributes).toContainEqual({ key: 'factors', value: { arrayValue: { values: [{ stringValue: 'scope_ok' }] } } });
  });

  it('links trace/span ids only when the event belongs to a chain', () => {
    const noChain = buildLogsPayload('t', [evt({ chain_id: null })]).resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(noChain.traceId).toBeUndefined();
    const inChain = buildLogsPayload('t', [evt({ chain_id: UUID_B })]).resourceLogs[0].scopeLogs[0].logRecords[0];
    expect(inChain.traceId).toBe(traceIdFromUuid(UUID_B));
    expect(inChain.spanId).toBe(spanIdFromUuid(UUID_A));
  });

  it('never leaks source_ip or payload (whitelist by construction)', () => {
    const json = JSON.stringify(buildLogsPayload('t', [evt()]));
    expect(json).not.toContain('source_ip');
    expect(json).not.toContain('payload');
  });
});

describe('buildTracePayload', () => {
  const chain: ChainRow = {
    id: UUID_B,
    name: 'trade-chain',
    status: 'closed',
    created_at: '2026-05-30T10:00:00.000Z',
    closed_at: '2026-05-30T10:05:00.000Z',
  };
  const body = buildTracePayload('tenant-1', chain, [evt({ chain_id: UUID_B })], 'SERIAL-9');
  const spans = body.resourceSpans[0].scopeSpans[0].spans;

  it('root span + one child span per event, all sharing the trace id', () => {
    expect(spans).toHaveLength(2);
    const traceId = traceIdFromUuid(UUID_B);
    expect(spans.every((s) => s.traceId === traceId)).toBe(true);
  });

  it('root span id is from the chain, child parent points to root', () => {
    const root = spans[0];
    expect(root.spanId).toBe(spanIdFromUuid(UUID_B));
    expect(spans[1].parentSpanId).toBe(root.spanId);
  });

  it('cert_serial attached to spans for APM→cert pivot', () => {
    expect(spans[0].attributes).toContainEqual({ key: 'cert_serial', value: { stringValue: 'SERIAL-9' } });
    expect(spans[1].attributes).toContainEqual({ key: 'cert_serial', value: { stringValue: 'SERIAL-9' } });
  });

  it('is deterministic for idempotent retries', () => {
    const again = buildTracePayload('tenant-1', chain, [evt({ chain_id: UUID_B })], 'SERIAL-9');
    expect(JSON.stringify(again)).toBe(JSON.stringify(body));
  });
});

describe('OTLP_PATHS', () => {
  it('exposes the three signal paths', () => {
    expect(OTLP_PATHS).toEqual({ metrics: '/v1/metrics', logs: '/v1/logs', traces: '/v1/traces' });
  });
});
