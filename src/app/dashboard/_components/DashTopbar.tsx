'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

interface DashTopbarProps {
  userInitials: string;
  alertCount?: number;
}

/**
 * Fixed top navigation bar for all dashboard pages.
 * Client component — uses usePathname() for reliable active-tab detection.
 * Rendered in dashboard/layout.tsx.
 */
export function DashTopbar({ userInitials, alertCount }: DashTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  function active(segment: string): string {
    // /dashboard exactly → console
    if (segment === 'console' && pathname === '/dashboard') return 'tb-link is-active';
    // all other segments match by prefix
    if (segment !== 'console' && pathname.startsWith(`/dashboard/${segment}`)) return 'tb-link is-active';
    return 'tb-link';
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="tb-brand">
          <div className="tb-mark">K</div>
          <div className="tb-word">Kakunin</div>
        </div>

        <div className="tb-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input placeholder="Search agents, receipts, capabilities…" />
          <span className="kbd">⌘ K</span>
        </div>

        <nav className="tb-nav">
          <Link href="/dashboard" className={active('console')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" />
            </svg>
            <span className="lbl">CONSOLE</span>
          </Link>

          <Link href="/dashboard/agents" className={active('agents')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="9" cy="9" r="3" /><path d="M3 19c1-3 3.5-4.5 6-4.5s5 1.5 6 4.5" />
              <circle cx="17" cy="7" r="2" /><path d="M16 13c2 .3 3.5 1.6 4 3.5" />
            </svg>
            <span className="lbl">AGENTS</span>
          </Link>

          <Link href="/dashboard/audit" className={active('audit')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="4" y="5" width="16" height="14" rx="2" />
              <path d="M4 9h16" /><path d="m8 14 2 2 4-4" />
            </svg>
            <span className="lbl">AUDIT</span>
          </Link>

          <Link href="/dashboard/reports" className={active('reports')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span className="lbl">REPORTS</span>
          </Link>

          <Link href="/dashboard/alerts" className={active('alerts')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
              <path d="M10 19a2 2 0 0 0 4 0" />
            </svg>
            {(alertCount ?? 0) > 0 && <span className="badge">{alertCount}</span>}
            <span className="lbl">ALERTS</span>
          </Link>

          <Link href="/dashboard/api-keys" className={active('api-keys')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" />
            </svg>
            <span className="lbl">KEYS</span>
          </Link>

          <a href="/compliance-demo" target="_blank" rel="noopener noreferrer" className="tb-link">
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', width: 16, height: 16 }}>
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span className="lbl">PLAYGROUND</span>
          </a>

          {/* Developer page — SDK quickstart, MCP config, webhooks */}
          <Link href="/dashboard/developer" className={active('developer')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="lbl">DEV</span>
          </Link>

          <Link href="/dashboard/billing" className={active('billing')}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
            <span className="lbl">BILLING</span>
          </Link>

          <Link href="/dashboard/settings" className={active('settings') + ' tb-me'}>
            <div className="av">{userInitials}</div>
            <span className="lbl">ME ▾</span>
          </Link>

          <div className="tb-divider" />

          {/* APPS — opens docs in new tab */}
          <a
            href="/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="tb-link"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="6" cy="6" r="1.5" /><circle cx="12" cy="6" r="1.5" />
              <circle cx="18" cy="6" r="1.5" /><circle cx="6" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
              <circle cx="6" cy="18" r="1.5" /><circle cx="12" cy="18" r="1.5" />
              <circle cx="18" cy="18" r="1.5" />
            </svg>
            <span className="lbl">APPS ▾</span>
          </a>

          <div className="tb-divider" />

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="tb-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" style={{ fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', width: 16, height: 16 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="lbl">SIGN OUT</span>
          </button>
        </nav>
      </div>
    </header>
  );
}
