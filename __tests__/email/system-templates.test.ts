import { describe, expect, it } from 'vitest';
import { renderTemplate } from '@/lib/email/templates';

describe('system email templates', () => {
  it('renders the pre-revocation warning email', () => {
    const payload = renderTemplate('risk.pre_revocation_warning', {
      agentName: 'Treasury Copilot',
      agentId: 'agt_123',
      score: 0.78,
      eventType: 'transaction_anomaly',
    });

    expect(payload.subject).toContain('Pre-revocation warning');
    expect(payload.html).toContain('Treasury Copilot');
    expect(payload.html).toContain('0.78');
  });

  it('renders the certificate expiring email', () => {
    const payload = renderTemplate('certificate.expiring', {
      agentName: 'Research Agent',
      agentId: 'agt_456',
      certSerial: '4A:1B:9C',
      validUntil: '2026-07-01T00:00:00.000Z',
    });

    expect(payload.subject).toContain('Certificate expiring soon');
    expect(payload.html).toContain('4A:1B:9C');
    expect(payload.html).toContain('2026-07-01');
  });

  it('renders the report failed email', () => {
    const payload = renderTemplate('report.failed', {
      agentName: 'Ops Agent',
      reportId: 'rep_123',
    });

    expect(payload.subject).toContain('Compliance report failed');
    expect(payload.html).toContain('Ops Agent');
    expect(payload.html).toContain('Review reports');
  });

  it('renders the payment recovered email', () => {
    const payload = renderTemplate('billing.payment_recovered', {
      planName: 'Professional',
    });

    expect(payload.subject).toContain('Payment recovered');
    expect(payload.html).toContain('Professional');
  });
});
