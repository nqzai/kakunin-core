import Link from 'next/link';
import '@/app/landing.css';
import './blog.css';

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div
        style={{
          background: '#f8fbf7',
          borderBottom: '1px solid #dce8d7',
          padding: '10px 24px',
          fontSize: '12px',
          color: '#275232',
        }}
      >
        <div style={{ maxWidth: 'var(--container)', margin: '0 auto', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/blog" style={{ color: 'inherit', textDecoration: 'underline' }}>Blog home</Link>
          <Link href="/docs/kyc-for-ai-agents" style={{ color: 'inherit', textDecoration: 'underline' }}>KYC for AI Agents</Link>
          <Link href="/docs/kyc-integration" style={{ color: 'inherit', textDecoration: 'underline' }}>Integration guide</Link>
          <Link href="/docs/eu-ai-act-checklist" style={{ color: 'inherit', textDecoration: 'underline' }}>EU AI Act checklist</Link>
          <Link href="/ai-agent-compliance-comparison" style={{ color: 'inherit', textDecoration: 'underline' }}>Compare</Link>
        </div>
      </div>
      {children}
    </>
  );
}
