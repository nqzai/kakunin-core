/**
 * GET /api/v1/agents/:id/compliance-report
 *
 * Returns a structured compliance attestation for an agent.
 * Deterministic — no LLM, instant response. Aggregates:
 *   - Agent identity + model hash
 *   - Active X.509 certificate + W3C VC
 *   - 30-day risk summary (events, score, band, warnings)
 *   - RCM control pass/fail based on DB state
 *   - Regulatory mapping (EU AI Act Art. 50, MiCA Art. 70)
 *
 * For LLM-narrated reports use POST /v1/reports/compliance instead.
 *
 * @see https://kakunin.ai/docs/attestation-template
 */

import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { createServiceClient } from '@/lib/supabase/server';
import { CONTROL_MAPPINGS } from '@/lib/compliance/standards-map';
import { log } from '@/lib/logging';

const ATTESTATION_WINDOW_DAYS = 30;

type ControlStatus = 'pass' | 'fail' | 'not_applicable';

interface ControlResult {
  control_id: string;
  description: string;
  status: ControlStatus;
  evidence: string;
  iso_27001: string[];
  nist_csf: string[];
  nist_ai_rmf: string[];
  nccoe_pillar: string[];
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const { id: agentId } = await params;
  const supabase = createServiceClient();

  const windowStart = new Date(
    Date.now() - ATTESTATION_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Fetch all data in parallel — tenant-scoped throughout
  const [agentResult, certResult, eventsResult, warningsResult] = await Promise.all([
    supabase
      .from('agents')
      .select('id, name, model, model_hash, version, status, created_at, inbox_address')
      .eq('id', agentId)
      .eq('tenant_id', tenantId)
      .single(),

    supabase
      .from('certificates')
      .select('id, serial_number, issued_at, expires_at, status, vc_jwt' as 'id, serial_number, issued_at, expires_at, status')
      .eq('agent_id', agentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle(),

    supabase
      .from('behavior_events')
      .select('id, action_type, risk_score, created_at')
      .eq('agent_id', agentId)
      .eq('tenant_id', tenantId)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false }),

    // Pre-revocation warnings issued in window (risk >= 0.75 notifications)
    supabase
      .from('audit_log')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('affected_id', agentId)
      .eq('event_type', 'notification.pre_revocation_warning')
      .gte('created_at', windowStart),
  ]);

  if (agentResult.error || !agentResult.data) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  if (eventsResult.error) {
    log.error('[compliance-report.get]', { error: eventsResult.error.message, agentId });
    return NextResponse.json({ error: 'Failed to fetch event data' }, { status: 500 });
  }

  const agent = agentResult.data;
  const cert = certResult.data ?? null;
  const certAny = cert as typeof cert & { vc_jwt?: string | null } | null;
  const events = eventsResult.data ?? [];
  const warningCount = warningsResult.data?.length ?? 0;

  // ── Risk summary ──────────────────────────────────────────────────────────
  const scores = events.map((e) => e.risk_score ?? 0);
  const currentScore = scores.length > 0 ? scores[0] : 0;
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highRiskEvents = events.filter((e) => (e.risk_score ?? 0) >= 0.85).length;
  const mediumRiskEvents = events.filter(
    (e) => (e.risk_score ?? 0) >= 0.3 && (e.risk_score ?? 0) < 0.85,
  ).length;

  const band =
    currentScore >= 0.85 ? 'high'
    : currentScore >= 0.3 ? 'medium'
    : 'low';

  // ── RCM control evaluation ────────────────────────────────────────────────
  const controls: ControlResult[] = CONTROL_MAPPINGS.map((c): ControlResult => {
    let status: ControlStatus = 'not_applicable';
    let evidence = '';

    switch (c.control_id) {
      case 'C-A1': // Cryptographic identity
        status = cert ? 'pass' : 'fail';
        evidence = cert
          ? `Active X.509 certificate serial ${cert.serial_number}, expires ${cert.expires_at}`
          : 'No active certificate — agent not certified';
        break;

      case 'C-A2': // Model hash pinning
        status = agent.model_hash ? 'pass' : 'fail';
        evidence = agent.model_hash
          ? `model_hash = ${agent.model_hash}`
          : 'model_hash not set — certify agent with SHA-256 model hash';
        break;

      case 'C-B1': // Behavioral event ingestion
        status = events.length > 0 ? 'pass' : 'fail';
        evidence = `${events.length} events ingested in last ${ATTESTATION_WINDOW_DAYS} days`;
        break;

      case 'C-B2': // Risk scoring
        status = events.length > 0 ? 'pass' : 'not_applicable';
        evidence = events.length > 0
          ? `Current score ${currentScore.toFixed(3)} (${band}), avg ${avgScore.toFixed(3)} over ${events.length} events`
          : 'No events in window — risk scoring not triggered';
        break;

      case 'C-B3': // Behavioral drift detection
        status = events.length >= 10 ? 'pass' : 'not_applicable';
        evidence = events.length >= 10
          ? `${events.length} events available for drift analysis`
          : `Only ${events.length} events — minimum 10 required for drift baseline`;
        break;

      case 'C-C1': // Certificate revocation capability
        status = cert ? 'pass' : 'not_applicable';
        evidence = cert
          ? 'Active certificate subject to immediate revocation via DELETE /agents/:id/certificates/:certId'
          : 'No active certificate';
        break;

      case 'C-D1': // Kill switch
        status = cert ? 'pass' : 'not_applicable';
        evidence = cert
          ? 'Agent revocation supported — POST /agents/:id/revoke issues signed halt receipt'
          : 'No active certificate';
        break;

      case 'C-E1': // Audit log immutability
        status = 'pass';
        evidence = 'audit_log enforces append-only via audit_log_no_update and audit_log_no_delete PostgreSQL rules + S3 WORM backup';
        break;

      case 'C-F1': // Compliance report generation
        status = 'pass';
        evidence = 'LLM-narrated report available via POST /v1/reports/compliance; structured attestation via GET /v1/agents/:id/compliance-report';
        break;

      case 'C-G1': // Decision chain integrity
        status = 'pass';
        evidence = 'HMAC-SHA256 entry_hash on every audit_log row (AUDIT_SIGNING_KEY, KMS-grade)';
        break;

      default:
        status = 'not_applicable';
    }

    return {
      control_id: c.control_id,
      description: c.description,
      status,
      evidence,
      iso_27001: c.iso_27001 ?? [],
      nist_csf: c.nist_csf ?? [],
      nist_ai_rmf: c.nist_ai_rmf ?? [],
      nccoe_pillar: c.nccoe_pillar ?? [],
    };
  });

  const passCount = controls.filter((c) => c.status === 'pass').length;
  const failCount = controls.filter((c) => c.status === 'fail').length;

  // ── Regulatory status ─────────────────────────────────────────────────────
  // EU AI Act Art. 50: transparency + logging for AI systems with human interaction
  // MiCA Art. 70: operational risk + incident reporting for crypto-asset services
  const hasCert = !!cert;
  const hasModelHash = !!agent.model_hash;
  const hasEvents = events.length > 0;
  const noHighRisk = highRiskEvents === 0;

  const euAiActStatus = hasCert && hasModelHash && hasEvents ? 'compliant' : 'action_required';
  const micaStatus = hasCert && hasModelHash && noHighRisk ? 'compliant' : 'action_required';

  const generatedAt = new Date().toISOString();

  return NextResponse.json({
    data: {
      attestation_id: `attest_${agentId.replace(/-/g, '').slice(0, 12)}_${Date.now()}`,
      generated_at: generatedAt,
      window_days: ATTESTATION_WINDOW_DAYS,
      template_url: 'https://kakunin.ai/attestation-template',

      agent: {
        id: agent.id,
        name: agent.name,
        model: agent.model,
        version: agent.version,
        model_hash: agent.model_hash,
        status: agent.status,
        registered_at: agent.created_at,
        has_inbox: !!agent.inbox_address,
      },

      certificate: cert
        ? {
            serial_number: cert.serial_number,
            issued_at: cert.issued_at,
            expires_at: cert.expires_at,
            status: cert.status,
            has_vc: !!(certAny?.vc_jwt),
          }
        : null,

      risk_summary: {
        current_score: parseFloat(currentScore.toFixed(4)),
        average_score: parseFloat(avgScore.toFixed(4)),
        band,
        events_analyzed: events.length,
        high_risk_events: highRiskEvents,
        medium_risk_events: mediumRiskEvents,
        pre_revocation_warnings: warningCount,
        period_start: windowStart,
        period_end: generatedAt,
      },

      controls: {
        total: controls.length,
        pass: passCount,
        fail: failCount,
        not_applicable: controls.length - passCount - failCount,
        items: controls,
      },

      regulatory: {
        eu_ai_act: {
          article: 'Article 50 — Transparency obligations for certain AI systems',
          status: euAiActStatus,
          notes: euAiActStatus === 'compliant'
            ? 'Agent has cryptographic identity, model hash, and behavioral monitoring in place'
            : `Action required: ${!hasCert ? 'certify agent; ' : ''}${!hasModelHash ? 'set model_hash; ' : ''}${!hasEvents ? 'ingest behavior events' : ''}`.trim().replace(/;$/, ''),
        },
        mica: {
          article: 'Article 70 — Operational risk requirements for crypto-asset service providers',
          status: micaStatus,
          notes: micaStatus === 'compliant'
            ? 'Agent certificate, model integrity, and zero high-risk incidents satisfy MiCA Art. 70 operational controls'
            : `Action required: ${!hasCert ? 'certify agent; ' : ''}${!hasModelHash ? 'set model_hash; ' : ''}${!noHighRisk ? `${highRiskEvents} high-risk events require review` : ''}`.trim().replace(/;$/, ''),
        },
      },
    },
  });
}
