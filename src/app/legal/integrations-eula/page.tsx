import type { Metadata } from 'next';
import '../../landing.css';
import { SafeEmailLink } from '@/components/site/SafeEmailLink';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'Integrations EULA — Kakunin',
  description: 'End User License Agreement for Kakunin marketplace integrations (Vercel, Supabase).',
};

const SECTION: React.CSSProperties = { marginTop: '40px', marginBottom: '16px', fontSize: '24px' };
const BODY: React.CSSProperties = { color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.6, marginBottom: '16px' };
const LIST: React.CSSProperties = { color: 'var(--ink-2)', fontSize: '15px', lineHeight: 1.8, marginBottom: '16px', paddingLeft: '24px' };

export default function IntegrationsEulaPage() {
  return (
    <>
      <SiteNav />
      <section style={{ padding: '80px 0', minHeight: '80vh' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <h1 style={{ fontSize: '48px', marginBottom: '24px' }}>Integrations End User License Agreement</h1>
          <p style={{ color: 'var(--ink-2)', fontSize: '16px', lineHeight: 1.6, marginBottom: '24px' }}>
            Last updated: May 25, 2026
          </p>
          <p style={BODY}>
            This End User License Agreement (&quot;EULA&quot;) governs your use of the Kakunin integrations made available
            through third-party marketplaces including the Vercel Marketplace and the Supabase Marketplace
            (each, an &quot;Integration&quot;). By installing or using an Integration, you agree to be bound by this EULA
            and by the Kakunin{' '}
            <a href="/terms" style={{ color: 'var(--accent)' }}>Terms of Service</a> and{' '}
            <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>.
            If you do not agree, do not install or use the Integration.
          </p>
          <p style={BODY}>
            &quot;Kakunin&quot; refers to Immortal Reality PA LLC, the operator of kakunin.ai.
            &quot;You&quot; refers to the individual or entity installing or using the Integration.
          </p>

          <h2 style={SECTION}>1. License Grant</h2>
          <p style={BODY}>
            Subject to your compliance with this EULA, Kakunin grants you a limited, non-exclusive,
            non-transferable, revocable license to install and use the Integration solely in connection
            with your authorised Kakunin account and your projects hosted on the applicable third-party platform.
          </p>

          <h2 style={SECTION}>2. What the Integration Does</h2>
          <p style={BODY}>
            The Integration authenticates with your Kakunin account via OAuth and performs the following actions
            on your behalf:
          </p>
          <ul style={LIST}>
            <li>Creates or rotates a Kakunin API key scoped to the integration (&quot;Integration Key&quot;)</li>
            <li>Injects the Integration Key as an encrypted environment variable into your projects on the third-party platform</li>
            <li>Records an audit log entry in your Kakunin account for each installation or key rotation</li>
          </ul>
          <p style={BODY}>
            No other data is read from or written to your third-party platform account beyond what is described above.
          </p>

          <h2 style={SECTION}>3. API Key and Credentials</h2>
          <p style={BODY}>
            The Integration Key injected into your projects is a live API key with access to your Kakunin account
            scoped to the permissions of your account at the time of installation. You are responsible for:
          </p>
          <ul style={LIST}>
            <li>Keeping the Integration Key confidential</li>
            <li>Revoking the key promptly via the Kakunin dashboard if you suspect unauthorised access</li>
            <li>Rotating the key by reinstalling the Integration if required</li>
          </ul>
          <p style={BODY}>
            Kakunin is not liable for any damage resulting from unauthorised use of your Integration Key.
          </p>

          <h2 style={SECTION}>4. Data and Privacy</h2>
          <p style={BODY}>
            The Integration does not transmit your application code, database contents, or end-user data to Kakunin.
            Installation metadata (project count, installation ID, timestamp) is stored in your Kakunin audit log.
            All data processing is governed by the Kakunin{' '}
            <a href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</a>.
          </p>

          <h2 style={SECTION}>5. Restrictions</h2>
          <p style={BODY}>You may not:</p>
          <ul style={LIST}>
            <li>Reverse engineer, decompile, or disassemble the Integration</li>
            <li>Use the Integration to exceed your Kakunin plan limits or to circumvent rate limiting</li>
            <li>Share or resell access to the Integration Key to third parties outside your organisation</li>
            <li>Use the Integration in violation of the terms of the applicable third-party marketplace</li>
          </ul>

          <h2 style={SECTION}>6. Termination</h2>
          <p style={BODY}>
            This EULA is effective from the date you install the Integration and continues until terminated.
            You may terminate at any time by uninstalling the Integration and revoking the Integration Key
            in your Kakunin dashboard. Kakunin may terminate your access to the Integration immediately
            if you breach this EULA or the Kakunin Terms of Service.
            Upon termination, the Integration Key is revoked and the env var injection is no longer maintained.
          </p>

          <h2 style={SECTION}>7. Disclaimer of Warranties</h2>
          <p style={BODY}>
            The Integration is provided &quot;as is&quot; without warranty of any kind, express or implied,
            including but not limited to warranties of merchantability, fitness for a particular purpose,
            and non-infringement. Kakunin does not warrant that the Integration will be error-free or
            uninterrupted.
          </p>

          <h2 style={SECTION}>8. Limitation of Liability</h2>
          <p style={BODY}>
            To the maximum extent permitted by applicable law, Kakunin shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of or inability to
            use the Integration, even if Kakunin has been advised of the possibility of such damages.
            Kakunin&apos;s total liability under this EULA shall not exceed the amounts paid by you to Kakunin
            in the twelve months preceding the claim.
          </p>

          <h2 style={SECTION}>9. Governing Law</h2>
          <p style={BODY}>
            This EULA is governed by the laws of the State of Delaware, United States, without regard to
            conflict of law principles. Any disputes shall be resolved in the courts of Delaware.
          </p>

          <h2 style={SECTION}>10. Changes to this EULA</h2>
          <p style={BODY}>
            Kakunin may update this EULA from time to time. Continued use of the Integration after changes
            are posted constitutes acceptance of the revised EULA. Material changes will be communicated
            via the Kakunin dashboard or email.
          </p>

          <h2 style={SECTION}>11. Contact</h2>
          <p style={BODY}>
            Questions about this EULA: <SafeEmailLink email="legal@kakunin.ai" style={{ color: 'var(--accent)' }} />
          </p>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
