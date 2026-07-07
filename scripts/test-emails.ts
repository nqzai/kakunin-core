/**
 * Test script: send all 8 transactional email templates to a target address.
 *
 * Usage (inject RESEND_API_KEY from Doppler web dashboard):
 *   RESEND_API_KEY=re_xxx npx tsx scripts/test-emails.ts palashbagchi@gmail.com
 *
 * Bypasses QStash — direct Resend calls only. Test/verification use only.
 */

import { Resend } from 'resend';
import { renderTemplate } from '../src/lib/email/templates';

const to = process.argv[2];
if (!to) {
  console.error('Usage: RESEND_API_KEY=re_xxx npx tsx scripts/test-emails.ts <email>');
  process.exit(1);
}

const key = process.env.RESEND_API_KEY;
if (!key) {
  console.error('RESEND_API_KEY not set. Get it from Doppler web dashboard.');
  process.exit(1);
}

const resend = new Resend(key);
const _fromAddr = process.env.RESEND_FROM_EMAIL ?? 'ai@mail.kakunin.ai';
const FROM = `Kakunin <${_fromAddr}>`;
const REPLY_TO = process.env.RESEND_REPLY_TO ?? 'ai@kakunin.ai';

const TEST_CASES: Array<{ template: Parameters<typeof renderTemplate>[0]; data: Parameters<typeof renderTemplate>[1] }> = [
  {
    template: 'auth.signup',
    data: { name: 'Palash', userId: 'usr_test_001' },
  },
  {
    template: 'certificate.issued',
    data: {
      agentName: 'TestBot v1',
      agentId: 'agt_test_001',
      serialNumber: 'SN-ABCD-1234-EFGH-5678',
      expiresAt: '17 May 2027',
    },
  },
  {
    template: 'certificate.revoked',
    data: {
      agentName: 'TestBot v1',
      agentId: 'agt_test_001',
      reason: 'Key compromise — manual revocation test',
      revokedAt: new Date().toISOString(),
    },
  },
  {
    template: 'certificate.auto_revoked',
    data: {
      agentName: 'RiskyBot v2',
      agentId: 'agt_test_002',
      riskScore: 0.92,
      revokedAt: new Date().toISOString(),
    },
  },
  {
    template: 'risk.alert',
    data: {
      agentName: 'RiskyBot v2',
      agentId: 'agt_test_002',
      riskScore: 0.91,
      riskBand: 'high',
      actionType: 'unauthorized_access_attempt',
      occurredAt: new Date().toISOString(),
    },
  },
  {
    template: 'report.ready',
    data: {
      reportTitle: 'Q2 2026 Compliance Report',
      reportId: 'rpt_test_001',
      periodStart: '1 April 2026',
      periodEnd: '30 June 2026',
    },
  },
  {
    template: 'billing.trial_ending_7d',
    data: {
      tenantId: 'tnt_test_001',
      endDate: '24 May 2026',
    },
  },
  {
    template: 'billing.payment_failed',
    data: {
      tenantId: 'tnt_test_001',
      amount: '€200.00',
    },
  },
];

async function main() {
  console.log(`Sending ${TEST_CASES.length} test emails → ${to}\n`);

  for (const { template, data } of TEST_CASES) {
    const { subject, html } = renderTemplate(template, data as never);
    const prefixedSubject = `[TEST] ${subject}`;

    try {
      const result = await resend.emails.send({
        from: FROM,
        to,
        replyTo: REPLY_TO,
        subject: prefixedSubject,
        html,
      });

      if (result.error) {
        console.error(`  ✗ ${template} — ${result.error.message}`);
      } else {
        console.log(`  ✅ ${template} — id: ${result.data?.id}`);
      }
    } catch (err) {
      console.error(`  ✗ ${template} — ${(err as Error).message}`);
    }

    // 200ms gap — stay under Resend burst limit (10 req/s on free tier)
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\nDone. Check inbox (and spam folder).');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
