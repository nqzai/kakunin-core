import Link from 'next/link';
import { ConsentButton } from './ConsentButton';
import { SafeEmailLink } from './SafeEmailLink';

function LinkedInIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 0 0 3.28 4.97c0 1.08.87 1.97 1.93 1.97h.02a1.97 1.97 0 1 0 .02-3.94ZM20.72 12.4c0-3.46-1.85-5.07-4.32-5.07-1.99 0-2.88 1.1-3.38 1.86V8.5H9.64c.04.46 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.12-.92.27-.67.9-1.36 1.95-1.36 1.38 0 1.93 1.02 1.93 2.52V20H20.4v-6.6c0-.35.01-.69.01-1Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18.9 2H22l-6.76 7.73L23 22h-6.09l-4.77-7.41L5.65 22H2.54l7.24-8.28L2 2h6.25l4.31 6.79L18.9 2Zm-1.07 18h1.69L7.33 3.9H5.51L17.83 20Z" />
    </svg>
  );
}

/**
 * Shared marketing footer — used on every public page.
 * Requires landing.css to be imported by the page or a parent layout.
 * Logo: kakunin mark (metallic green) — not the wordmark.
 */
export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">

          {/* Brand + company info */}
          <div className="footer-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/mark-metallic-green.png" alt="Kakunin" className="footer-logo" width="40" height="40" loading="lazy" />
            <p className="footer-company">
              Immortal Reality PA LLC<br />
              6375 Penn Ave Ste B<br />
              Pittsburgh, Pennsylvania 15206<br />
              <SafeEmailLink email="ai@kakunin.ai" /><br />
              <a href="tel:+14125437290">+1 (412) 543-7290</a>
            </p>
            <p>Compliance infrastructure for the agentic economy. Built for MiCA &amp; the EU AI Act.</p>
            <a
              href="https://verifieddr.com/website/kakunin-ai"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-badge"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://verifieddr.com/badge/kakunin-ai.svg?style=minimal"
                alt="Verified DR - Verified Domain Rating for kakunin.ai"
                width="200"
                height="24"
              />
            </a>
          </div>

          {/* Product */}
          <div className="footer-col">
            <h5>Product</h5>
            <ul>
              <li><Link href="/platform">Platform Overview</Link></li>
              <li><Link href="/#capabilities">Identity certificates</Link></li>
              <li><Link href="/#capabilities">Behavioral monitoring</Link></li>
              <li><Link href="/#capabilities">Compliance reports</Link></li>
              <li><Link href="/compliance-demo">Playground</Link></li>
              <li><Link href="/#capabilities">AgentMail</Link></li>
              <li><Link href="/#verify">Public verify</Link></li>
            </ul>
          </div>

          {/* Developers */}
          <div className="footer-col">
            <h5>Developers</h5>
            <ul>
              <li><Link href="/docs">API reference</Link></li>
              <li><Link href="/open-source">Open Source vs Hosted</Link></li>
              <li><Link href="/docs">TypeScript SDK</Link></li>
              <li><Link href="/docs/agent-security">Agent Security Guide</Link></li>
              <li><Link href="/docs">Webhooks</Link></li>
              <li><Link href="/docs">OpenAPI spec</Link></li>
              <li><Link href="/test-results">Test results</Link></li>
            </ul>
          </div>

          {/* Compliance */}
          <div className="footer-col">
            <h5>Compliance</h5>
            <ul>
              <li><Link href="/kya">Know Your Agent (KYA)</Link></li>
              <li><Link href="/ai-agent-compliance-comparison">Kakunin vs Alternatives</Link></li>
              <li><Link href="/compliance">Compliance Hubs</Link></li>
              <li><Link href="/docs/kyc-for-ai-agents">KYC for AI Agents</Link></li>
              <li><Link href="/docs/eu-ai-act-annex-iii">EU AI Act Annex III</Link></li>
              <li><Link href="/#compliance">MiCA &middot; Articles 67&ndash;75</Link></li>
              <li><Link href="/#compliance">GDPR &middot; Article 22</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h5>Company</h5>
            <ul>
              <li><Link href="/#about">About</Link></li>
              <li><Link href="/#careers">Careers</Link></li>
              <li><Link href="/press">Press Kit</Link></li>
              <li><SafeEmailLink email="ai@kakunin.ai" label="Contact" /></li>
              <li><Link href="/#security">Security</Link></li>
              <li><a href="https://kakunin.openstatus.dev/" target="_blank" rel="noopener noreferrer">Status</a></li>
              <li><a href="https://discord.gg/FGR4Z4Rxh" target="_blank" rel="noopener noreferrer">Support</a></li>
            </ul>
          </div>

        </div>

        <div className="footer-bottom">
          <div>&copy; 2026 IMMORTAL REALITY PA LLC &middot; ALL RIGHTS RESERVED</div>
          <div className="footer-bottom-actions">
            <div className="footer-socials" aria-label="Social links">
              <a
                href="https://www.linkedin.com/company/immortal-reality-pa-llc"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kakunin on LinkedIn"
                title="LinkedIn"
              >
                <LinkedInIcon />
              </a>
              <a
                href="https://x.com/Immortalai365"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Kakunin on X"
                title="X"
              >
                <XIcon />
              </a>
            </div>
            <div className="frames">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/legal/integrations-eula">Integrations EULA</Link>
            <Link href="#">SOC 2</Link>
            <ConsentButton />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
