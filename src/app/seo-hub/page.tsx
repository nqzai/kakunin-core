import type { Metadata } from 'next';
import '../landing.css';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';

export const metadata: Metadata = {
  title: 'SEO Content Hub',
  description: 'Internal hub for priority SEO content pages, blog posts, and docs used to improve discovery and crawl paths.',
  robots: { index: false, follow: false },
};

const sections = [
  {
    title: 'Priority Blog Posts',
    links: [
      { href: '/blog/why-ai-agents-need-x509-certificates', label: 'Why AI Agents Need X.509 Certificates, Not API Keys' },
      { href: '/blog/secure-runtime-binding-llm-agents', label: 'Secure Runtime Binding for LLM Agents' },
      { href: '/blog/runtime-monitoring-ai-agents-compliance', label: 'Runtime Monitoring for AI Agents Compliance' },
      { href: '/blog/top-10-prompt-injection-attacks', label: 'Top 10 Prompt Injection Attacks' },
      { href: '/blog/mica-trading-bot-case-study', label: 'MiCA Trading Bot Case Study' },
      { href: '/blog/how-regulators-verify-ai-agents-without-vendor-credentials', label: 'How Regulators Verify AI Agents Without Vendor Credentials' },
      { href: '/blog/ai-agent-compliance-market-2-7-billion', label: 'The AI Agent Compliance Market' },
    ],
  },
  {
    title: 'Priority Docs',
    links: [
      { href: '/docs/kyc-for-ai-agents', label: 'KYC for AI Agents' },
      { href: '/docs/kyc-integration', label: 'Kakunin Integration Guide' },
      { href: '/docs/eu-ai-act-checklist', label: 'EU AI Act Checklist' },
      { href: '/docs/kyc-regulatory-mapping', label: 'Regulatory Mapping Matrix' },
      { href: '/docs/agent-security', label: 'Autonomous AI Security Guide' },
      { href: '/docs/runtime-binding', label: 'Secure Runtime Binding' },
      { href: '/docs/mica-trading-bots', label: 'MiCA Compliance for Autonomous Trading Bots' },
    ],
  },
  {
    title: 'Priority Commercial Pages',
    links: [
      { href: '/ai-agent-compliance-comparison', label: 'Compare' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/compliance', label: 'Compliance' },
      { href: '/for-ctos', label: 'For CTOs' },
      { href: '/for-compliance-officers', label: 'For Compliance Officers' },
      { href: '/for-devops', label: 'For DevOps' },
      { href: '/for-regulators', label: 'For Regulators' },
    ],
  },
];

export default function SeoHubPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16 md:px-10 lg:px-16">
        <div className="mb-10">
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-kakunin-meta">
            Internal only
          </div>
          <h1 className="mt-3 text-4xl font-semibold text-kakunin-heading">
            SEO content hub
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-kakunin-body">
            This page exists to concentrate internal links toward the most important blog posts, docs, and commercial pages
            so Google can crawl them more reliably.
          </p>
        </div>

        <div className="grid gap-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-kakunin-border bg-kakunin-subtle-bg/30 p-6">
              <h2 className="text-2xl font-semibold text-kakunin-heading">{section.title}</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-xl border border-kakunin-border bg-white p-4 text-sm font-medium text-kakunin-heading transition hover:border-kakunin-accent hover:shadow-sm"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
