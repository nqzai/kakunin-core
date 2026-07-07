import { type NextRequest, NextResponse } from 'next/server';
import { requireTenantId } from '@/lib/gateway/tenant-context';
import { z } from 'zod';
import { Client as QStashClient } from '@upstash/qstash';
import { createServiceClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { log } from '@/lib/logging';
import { evaluateGate, GATE_ACTION_REQUIRED_AT, GATE_FAIL_AT } from '@/lib/integrations/github/gate';

/**
 * POST /v1/integrations/github/gate (P2b — RA-183)
 *
 * CI deploy gate. A GitHub Action calls this (authenticated by the tenant's
 * Kakunin API key, validated in edge middleware) to ask whether an agent is
 * safe to deploy. We score the agent's recent behavioral risk and return:
 *   pass | action_required | fail
 * On `fail` (peak risk ≥ 0.85) the agent's active certificate is revoked and
 * the agent suspended. Every check records the commit SHA + workflow run id to
 * the audit log so a deploy is traceable to the risk posture that gated it.
 *
 * Always returns HTTP 200 with a decision — the Action decides the exit code.
 */

const gateSchema = z.object({
  agentId: z.string().uuid(),
  commitSha: z.string().max(64).optional(),
  workflowRunId: z.string().max(64).optional(),
  repo: z.string().max(200).optional(),
  windowDays: z.number().int().min(1).max(30).optional().default(7),
});

export async function POST(req: NextRequest) {
  const tenantAuth = requireTenantId(req);
  if (!tenantAuth.ok) return tenantAuth.response;
  const tenantId = tenantAuth.tenantId;
  const parsed = gateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.message }, { status: 400 });
  }
  const { agentId, commitSha, workflowRunId, repo, windowDays } = parsed.data;

  const supabase = createServiceClient();

  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, status')
    .eq('id', agentId)
    .eq('tenant_id', tenantId) // rule #2
    .single();
  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000).toISOString();
  const { data: events } = await supabase
    .from('behavior_events')
    .select('risk_score')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .gte('occurred_at', windowStart);

  const result = evaluateGate((events ?? []).map((e) => e.risk_score));

  // Active cert serial (for response + revoke-on-fail).
  const { data: cert } = await supabase
    .from('certificates')
    .select('id, serial_number, status')
    .eq('agent_id', agentId)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .maybeSingle();

  let revoked = false;
  let suspended = false;
  if (result.should_revoke) {
    const revokedAt = new Date().toISOString();
    const reason = `CI gate fail — peak risk ${result.score} ≥ ${GATE_FAIL_AT}${commitSha ? ` (commit ${commitSha})` : ''}`;

    // Always disable the agent on a hard fail. Suspension is what actually stops
    // the agent acting (the ingest path blocks suspended/retired agents); cert
    // revocation is secondary and only possible when an active cert exists. An
    // agent with no active cert (e.g. expired) must STILL be suspended.
    const { error: suspendErr } = await supabase
      .from('agents')
      .update({ status: 'suspended', updated_at: revokedAt })
      .eq('id', agentId)
      .eq('tenant_id', tenantId);
    if (suspendErr) {
      log.error('[github-gate] Suspend-on-fail failed', { agentId, error: suspendErr.message });
    } else {
      suspended = true;
    }

    if (cert) {
      const { error: revokeErr } = await supabase
        .from('certificates')
        .update({ status: 'revoked', revoked_at: revokedAt, revocation_reason: reason })
        .eq('id', cert.id)
        .eq('tenant_id', tenantId);
      if (revokeErr) {
        log.error('[github-gate] Revoke-on-fail failed', { agentId, error: revokeErr.message });
      } else {
        revoked = true;
        // Regenerate CRL immediately so the revoked cert appears fast.
        const appUrl = process.env.NEXT_PUBLIC_APP_URL;
        if (appUrl && process.env.QSTASH_TOKEN) {
          new QStashClient({ token: process.env.QSTASH_TOKEN })
            .publishJSON({ url: `${appUrl}/api/v1/crl/generate`, body: { trigger: 'github_gate', certificate_id: cert.id }, retries: 3 })
            .catch((err: unknown) => log.warn('[github-gate] CRL enqueue failed', { error: (err as Error).message }));
        }
      }
    }
  }

  // Audit the gate check — ties the deploy to the risk posture that gated it.
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: revoked ? 'integration.github_gate_revoked' : 'integration.github_gate_checked',
    actor_type: 'system',
    actor_id: 'github-gate',
    description: `CI gate for agent ${agent.name}: ${result.decision} (peak risk ${result.score})${commitSha ? `, commit ${commitSha}` : ''}${revoked ? ' — cert revoked' : ''}`,
    affected_id: agentId,
    metadata: {
      provider: 'github',
      decision: result.decision,
      risk_score: result.score,
      band: result.band,
      events_considered: result.events_considered,
      commit_sha: commitSha ?? null,
      workflow_run_id: workflowRunId ?? null,
      repo: repo ?? null,
      cert_revoked: revoked,
      agent_suspended: suspended,
      serial_number: cert?.serial_number ?? null,
    },
  });

  return NextResponse.json({
    data: {
      decision: result.decision,
      risk_score: result.score,
      band: result.band,
      events_considered: result.events_considered,
      thresholds: { action_required_at: GATE_ACTION_REQUIRED_AT, fail_at: GATE_FAIL_AT },
      agent_id: agentId,
      cert_serial: cert?.serial_number ?? null,
      cert_revoked: revoked,
      agent_suspended: suspended,
      commit_sha: commitSha ?? null,
      workflow_run_id: workflowRunId ?? null,
    },
  });
}
