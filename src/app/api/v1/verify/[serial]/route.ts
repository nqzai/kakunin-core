import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { createServiceClient } from '@/lib/supabase/server';
import { log } from '@/lib/logging';

/**
 * GET /v1/verify/:serial — public certificate verification endpoint.
 *
 * No auth required — designed for any party to verify an agent's certificate.
 * AI agents can call this autonomously to verify peer identity before trusting.
 *
 * Rate limited: 100 req / 60s sliding window per IP (no API key = IP only).
 * Enumeration protection: serial numbers are UUIDs; rate limit adds defence-in-depth.
 *
 * Edge-cached: 5-minute CDN cache, 1-hour stale-while-revalidate.
 * Revoked/expired certs return 200 with status field — never 404 (cert existed).
 */

// Lazy-initialized — skipped if Upstash is not configured (local dev)
let verifyRatelimit: Ratelimit | null = null;

function getVerifyRatelimit(): Ratelimit | null {
  if (verifyRatelimit) return verifyRatelimit;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  verifyRatelimit = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    // 100 req/60s per IP — generous for legitimate verifiers, blocks serial enumeration
    limiter: Ratelimit.slidingWindow(100, '60 s'),
    prefix: 'kakunin:rl:verify',
    analytics: true,
  });
  return verifyRatelimit;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serial: string }> }
) {
  // ── 1. IP-based rate limit — BEFORE any DB query ─────────────────────────
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  const rl = getVerifyRatelimit();
  if (rl) {
    const { success, limit, reset } = await rl.limit(ip);
    if (!success) {
      log.warn('[verify] rate limit hit', { ip });

      // Fire-and-forget audit_log — non-blocking, never throws
      try {
        const supabase = createServiceClient();
        await writeAuditLog(supabase, {
          tenant_id: null, // system actor, no tenant (actor_type=system)
          event_type: 'verify.rate_limited',
          actor_type: 'system',
          actor_id: ip,
          affected_id: null,
          description: `Public verify endpoint rate limit exceeded from IP ${ip}`,
          metadata: { ip, limit, reset },
        });
      } catch {
        log.warn('[verify] audit_log write failed on rate limit hit');
      }

      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(reset),
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
          },
        }
      );
    }
  }

  // ── 2. Input validation ───────────────────────────────────────────────────
  const { serial } = await params;

  if (!serial || serial.length < 8) {
    return NextResponse.json({ error: 'Invalid serial number' }, { status: 400 });
  }

  // ── 3. Certificate lookup ─────────────────────────────────────────────────
  const supabase = createServiceClient();

  const { data: cert, error } = await supabase
    .from('certificates')
    .select('id, serial_number, status, issued_at, expires_at, revoked_at, revocation_reason, halt_receipt, agent_id, tenant_id')
    .eq('serial_number', serial.toUpperCase())
    .single();

  if (error || !cert) {
    return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
  }

  // Fetch agent details — best-effort, don't fail verify if agent lookup fails
  const { data: agent } = await supabase
    .from('agents')
    .select('id, name, model, model_hash, version, status, metadata, operator_org:metadata->operator_org, permitted_actions:metadata->permitted_actions')
    .eq('id', cert.agent_id)
    .eq('tenant_id', cert.tenant_id)
    .single();

  const now = new Date();
  const isExpired = new Date(cert.expires_at) < now;
  const effectiveStatus = cert.status === 'active' && isExpired ? 'expired' : cert.status;
  const valid = effectiveStatus === 'active';

  const permittedActions = agent?.permitted_actions as string[] | null ?? [];
  const financialScope = (agent?.metadata as { financial_scope?: unknown } | null)?.financial_scope;

  const data = {
    serial_number: cert.serial_number,
    status: effectiveStatus,
    valid,
    issued_at: cert.issued_at,
    expires_at: cert.expires_at,
    ...(cert.revoked_at ? { revoked_at: cert.revoked_at } : {}),
    ...(cert.revocation_reason ? { revocation_reason: cert.revocation_reason } : {}),
    ...(cert.halt_receipt ? { halt_receipt: cert.halt_receipt } : {}),
    agent: agent
      ? {
          id: agent.id,
          name: agent.name,
          model: agent.model,
          ...(agent.model_hash ? { model_hash: agent.model_hash } : {}),
          version: agent.version,
          ...(agent.operator_org ? { operator_org: agent.operator_org } : {}),
          ...(permittedActions.length ? { permitted_actions: permittedActions } : {}),
          ...(financialScope ? { financial_scope: financialScope } : {}),
        }
      : { id: cert.agent_id },
  };

  // Edge-cache valid certs aggressively; revoked/expired still cache but shorter
  const maxAge = valid ? 300 : 60;
  const cacheHeader = `public, s-maxage=${maxAge}, stale-while-revalidate=3600`;

  // ── Content negotiation — browser gets HTML, API clients get JSON ─────────
  const accept = req.headers.get('accept') ?? '';
  const wantsHtml = accept.includes('text/html') && !accept.startsWith('application/json');

  if (wantsHtml) {
    const statusColor = valid ? '#1a7a4a' : effectiveStatus === 'revoked' ? '#b91c1c' : '#b45309';
    const statusBg   = valid ? '#f0fdf4' : effectiveStatus === 'revoked' ? '#fef2f2' : '#fffbeb';
    const statusBorder = valid ? '#bbf7d0' : effectiveStatus === 'revoked' ? '#fecaca' : '#fde68a';
    const statusLabel  = valid ? '✓ VALID' : effectiveStatus === 'revoked' ? '✗ REVOKED' : '⚠ EXPIRED';

    const fmtDt = (iso: string) => new Date(iso).toUTCString();

    const row = (label: string, value: string, mono = true) => `
      <tr>
        <td style="padding:9px 14px;color:#6b7280;font-size:11px;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;border-bottom:1px solid #f3f4f6">${label}</td>
        <td style="padding:9px 14px;font-size:13px;${mono ? 'font-family:monospace;' : ''}word-break:break-all;border-bottom:1px solid #f3f4f6">${value}</td>
      </tr>`;

    const scopeTags = permittedActions.map((a) =>
      `<span style="display:inline-block;padding:2px 8px;margin:2px;font-size:11px;font-family:monospace;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;border-radius:4px">${a}</span>`
    ).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kakunin Certificate · ${cert.serial_number.slice(0, 16)}…</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;color:#111827;min-height:100vh;padding:32px 16px}
    .wrap{max-width:680px;margin:0 auto}
    .logo{font-size:13px;font-weight:700;letter-spacing:.04em;color:#111827;margin-bottom:24px;display:flex;align-items:center;gap:8px}
    .logo span{color:#16a34a}
    .card{background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:16px}
    .card-head{padding:14px 18px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between}
    .card-head h2{font-size:13px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#374151}
    .status-badge{padding:5px 12px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:.06em;background:${statusBg};color:${statusColor};border:1px solid ${statusBorder}}
    table{width:100%;border-collapse:collapse}
    .section-label{padding:10px 14px 4px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;font-weight:600}
    .curl{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;font-family:monospace;font-size:12px;color:#334155;word-break:break-all;margin:12px 14px;cursor:pointer;position:relative}
    .curl:hover{background:#f1f5f9}
    .footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:24px}
    .footer a{color:#16a34a;text-decoration:none}
  </style>
</head>
<body>
<div class="wrap">
  <div class="logo">
    <span>KAKUNIN</span> · Certificate Verification
  </div>

  <div class="card">
    <div class="card-head">
      <h2>X.509 Agent Certificate</h2>
      <span class="status-badge">${statusLabel}</span>
    </div>
    <table>
      ${row('Serial', cert.serial_number)}
      ${row('Status', effectiveStatus.toUpperCase())}
      ${row('Valid', String(valid))}
      ${row('Issued', fmtDt(cert.issued_at))}
      ${row('Expires', fmtDt(cert.expires_at))}
      ${cert.revoked_at ? row('Revoked', fmtDt(cert.revoked_at)) : ''}
      ${cert.revocation_reason ? row('Revocation reason', cert.revocation_reason, false) : ''}
    </table>
  </div>

  ${agent ? `
  <div class="card">
    <div class="card-head"><h2>Agent Identity</h2></div>
    <table>
      ${row('Name', agent.name ?? '', false)}
      ${row('Agent ID', agent.id)}
      ${agent.model ? row('Model', agent.model) : ''}
      ${agent.model_hash ? row('Model hash', agent.model_hash) : ''}
      ${agent.version ? row('Version', agent.version) : ''}
      ${agent.operator_org ? row('Operator', String(agent.operator_org), false) : ''}
    </table>
    ${permittedActions.length ? `
    <div class="section-label">Permitted Actions</div>
    <div style="padding:8px 14px 14px">${scopeTags}</div>` : ''}
  </div>` : ''}

  <div class="card">
    <div class="card-head"><h2>Programmatic Access</h2></div>
    <div style="padding:4px 0 4px">
      <div class="section-label">JSON endpoint (no auth required)</div>
      <div class="curl" onclick="navigator.clipboard.writeText(this.dataset.val);this.innerText='Copied!';setTimeout(()=>this.innerText=this.dataset.val,1500)" data-val="curl https://api.kakunin.ai/v1/verify/${cert.serial_number}">curl https://api.kakunin.ai/v1/verify/${cert.serial_number}</div>
      <div style="padding:0 14px 12px;font-size:11px;color:#6b7280">Click to copy · Returns JSON when called with <code>Accept: application/json</code> or from curl/SDK</div>
    </div>
  </div>

  <div class="footer">
    Verified by <a href="https://kakunin.ai">Kakunin</a> · Cryptographic agent identity for regulated industries ·
    <a href="https://kakunin.ai/docs/verify">Docs</a>
  </div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': cacheHeader,
      },
    });
  }

  // ── JSON response (default) ───────────────────────────────────────────────
  const response = NextResponse.json({ data });
  response.headers.set('Cache-Control', cacheHeader);
  return response;
}
