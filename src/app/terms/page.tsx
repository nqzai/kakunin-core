import type { Metadata } from 'next';
import '../landing.css';
import { SafeEmailLink } from '@/components/site/SafeEmailLink';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { generateTermsOfService } from '@/lib/schema/generators';

export const metadata: Metadata = {
  title: 'Kakunin Terms of Service',
  description: 'Terms of service for Kakunin KYC compliance platform.',
};

export default function TermsPage() {
  const termsSchema = generateTermsOfService(
    'https://www.kakunin.ai/terms',
    '2026-01-01T00:00:00Z',
    '2026-05-18T00:00:00Z'
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(termsSchema) }}
      />
      <SiteNav active="terms" />
      <section style={{ padding: '80px 0', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Terms of Service</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
            Last updated: May 18, 2026
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Agreement to Terms</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement made between you, whether personally or
            on behalf of an entity (&quot;you&quot;) and Immortal Reality PA LLC (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), concerning your access to and
            use of the Kakunin website and all related applications, software, tools, and services (collectively, the &quot;Service&quot;).
          </p>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            You agree that by accessing the Service, you have read, understood, and agree to be bound by all of these Terms.
            If you do not agree with our Terms, then you may not access and use the Service.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Use License</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Permission is granted to temporarily download one copy of the materials (information or software) on Kakunin&apos;s
            Service for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of
            title, and under this license you may not:
          </p>
          <ul style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.8, marginBottom: '16px', paddingLeft: '24px' }}>
            <li>Modify or copy the materials</li>
            <li>Use the materials for any commercial purpose or for any public display</li>
            <li>Attempt to decompile or reverse engineer any software contained on the Service</li>
            <li>Remove any copyright or other proprietary notations from the materials</li>
            <li>Transfer the materials to another person or &quot;mirror&quot; the materials on any other server</li>
          </ul>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            This &quot;Use License&quot; applies to the informational and marketing materials published on the Kakunin website. It does
            not apply to software that we make available under an open-source license, which is governed solely by that license
            (see below).
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Open Source Software</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Portions of Kakunin are released as open-source software. The Kakunin platform is available under the
            GNU Affero General Public License v3.0 (AGPL-3.0), and the Kakunin SDKs and framework integrations are available
            under the Apache License 2.0. Your use of that software is governed exclusively by the terms of the applicable
            open-source license accompanying it, and nothing in these Terms limits, supersedes, or restricts the rights granted
            to you under those licenses. The &quot;Kakunin&quot; name and logos are trademarks of Immortal Reality PA LLC and are not
            licensed under any open-source license. The hosted Kakunin service — including the certificate authority, verification
            endpoints, and your account — remains subject to these Terms regardless of any open-source components.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Disclaimer</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            The materials on Kakunin&apos;s Service are provided on an &quot;as is&quot; basis. Kakunin makes no warranties, expressed or
            implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties
            or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property
            or other violation of rights.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Limitations of Liability</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            In no event shall Immortal Reality PA LLC or its suppliers be liable for any damages (including, without limitation,
            damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use
            the Service, even if we or our authorized representative has been notified orally or in writing of the possibility
            of such damage.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Modifications</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            Immortal Reality PA LLC may revise these Terms for the Service at any time without notice. By using this Service,
            you are agreeing to be bound by the then current version of these Terms.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Governing Law</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            These Terms and conditions are governed by and construed in accordance with the laws of Pennsylvania, and you
            irrevocably submit to the exclusive jurisdiction of the courts in that location.
          </p>

          <h2 style={{ fontSize: '24px', marginTop: '40px', marginBottom: '16px' }}>Contact Us</h2>
          <p style={{ color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' }}>
            If you have any questions about these Terms, please contact us at:
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
