import type { Metadata } from 'next';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ComplianceDemoClient } from './ComplianceDemoClient';
import '../landing.css';

export const metadata: Metadata = {
  title: { absolute: 'AI Agent Compliance Playground & Sandbox | Kakunin' },
  description: 'Test real-time identity attestation, out-of-bounds trade monitoring, and automated X.509 certificate revocation for autonomous agents under MiCA & EU AI Act rules.',
  alternates: { canonical: '/compliance-demo' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/compliance-demo',
    title: 'AI Agent Compliance Playground & Sandbox | Kakunin',
    description: 'Test real-time identity attestation, out-of-bounds trade monitoring, and automated X.509 certificate revocation for autonomous agents under MiCA & EU AI Act rules.',
    siteName: 'Kakunin',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin — AI Agent Compliance Playground' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Agent Compliance Playground & Sandbox | Kakunin',
    description: 'Test real-time identity attestation, out-of-bounds trade monitoring, and automated X.509 certificate revocation for autonomous agents.',
    images: ['/og-image.png'],
  },
};

export default function ComplianceDemoPage() {
  return (
    <>
      <SiteNav />
      <main className="min-h-screen bg-[#111618] pt-24">
        <ComplianceDemoClient />
      </main>
      <SiteFooter />
    </>
  );
}
