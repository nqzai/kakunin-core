import Link from 'next/link';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import 'fumadocs-ui/style.css';
import './docs.css';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        tree={source.pageTree}
        nav={{
          title: (
            <span style={{
              fontFamily: "'Archivo Black', 'Archivo', ui-sans-serif, system-ui, sans-serif",
              fontWeight: 900,
              fontSize: '15px',
              letterSpacing: '-0.01em',
              textTransform: 'uppercase',
              color: '#2B934F',
            }}>
              KAKUNIN
            </span>
          ),
          url: '/',
        }}
        sidebar={{
          banner: (
            <div style={{
              background: 'hsl(142 40% 94%)',
              border: '1px solid hsl(142 40% 86%)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              fontFamily: 'ui-monospace, monospace',
              color: '#1C6B39',
              letterSpacing: '0.04em',
              display: 'grid',
              gap: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{
                  background: '#2B934F',
                  color: '#fff',
                  borderRadius: '4px',
                  padding: '1px 6px',
                  fontWeight: 700,
                  fontSize: '10px',
                }}>v1.0</span>
                KYC for AI Agents
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                <Link href="/docs/kyc-integration" style={{ color: '#1C6B39', textDecoration: 'underline' }}>Integration guide</Link>
                <Link href="/docs/eu-ai-act-checklist" style={{ color: '#1C6B39', textDecoration: 'underline' }}>EU AI Act checklist</Link>
                <Link href="/docs/kyc-regulatory-mapping" style={{ color: '#1C6B39', textDecoration: 'underline' }}>Regulatory mapping</Link>
                <Link href="/docs/agent-security" style={{ color: '#1C6B39', textDecoration: 'underline' }}>Security guide</Link>
              </div>
            </div>
          ),
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
