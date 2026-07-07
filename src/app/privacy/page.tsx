import type { Metadata } from 'next';
import '../landing.css';
import { SafeEmailLink } from '@/components/site/SafeEmailLink';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { generatePrivacyPolicy } from '@/lib/schema/generators';

export const metadata: Metadata = {
  title: 'Kakunin Privacy Policy',
  description: 'Privacy policy for Kakunin KYC compliance platform.',
};

export default function PrivacyPage() {
  const privacySchema = generatePrivacyPolicy(
    'https://www.kakunin.ai/privacy',
    '2026-01-01T00:00:00Z',
    '2026-05-18T00:00:00Z'
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacySchema) }}
      />
      <SiteNav active="privacy" />
      <section style={{ padding: '80px 0', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Privacy Policy</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
            Last updated: May 18, 2026
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Introduction</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Immortal Reality PA LLC (&quot;we,&quot; &quot;us,&quot; &quot;our,&quot; or &quot;Company&quot;) operates the Kakunin platform. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you visit our website.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Information We Collect</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            We may collect information about you in a variety of ways. The information we may collect on the site includes:
          </p>
          <ul style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.8, marginBottom: '16px', paddingLeft: '24px' }}>
            <li>Personal identification information (name, email address, phone number, etc.)</li>
            <li>Technical data (IP address, browser type, operating system, etc.)</li>
            <li>Usage data (pages visited, time spent, interactions, etc.)</li>
            <li>Payment information (processed securely through third-party providers)</li>
          </ul>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Use of Your Information</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized
            experience. Specifically, we may use information collected about you via the site to:
          </p>
          <ul style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.8, marginBottom: '16px', paddingLeft: '24px' }}>
            <li>Generate analytics to evaluate site performance</li>
            <li>Fulfill and manage purchases, orders, payments, and other transactions</li>
            <li>Increase efficiency and operation of the site</li>
            <li>Monitor and analyze trends, usage, and activities</li>
            <li>Notify you of updates to the site</li>
            <li>Offer new products, services, and/or recommendations</li>
          </ul>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Data Security</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            We implement appropriate technical and organizational measures to protect your personal information against
            unauthorized access, alteration, disclosure, or destruction. However, please note that no method of transmission
            over the Internet or electronic storage is 100% secure.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Contact Us</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            If you have questions about this Privacy Policy, please contact us at:
          </p>
          <div style={{ fontSize: '15px', color: 'var(--ink-2)', lineHeight: 1.8 }}>
            <p>Immortal Reality PA LLC</p>
            <p>6375 Penn Ave Ste B</p>
            <p>Pittsburgh, Pennsylvania 15206</p>
            <p>
              Email: <SafeEmailLink email="ai@kakunin.ai" style={{ color: 'var(--green)' }} />
            </p>
            <p>
              Phone: <a href="tel:+14125437290" style={{ color: 'var(--green)' }}>+1 (412) 543-7290</a>
            </p>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
