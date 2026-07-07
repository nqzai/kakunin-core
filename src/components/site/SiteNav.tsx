import Link from 'next/link';
import { ThemeToggle } from './ThemeToggle';

interface SiteNavProps {
  /** Which top-level page is active — used to set aria-current */
  active?: 'home' | 'pricing' | 'docs' | 'blog' | 'privacy' | 'terms' | 'test-results' | 'kya';
}

/**
 * Shared marketing navigation.
 * Rendered on /, /pricing, /blog — not on /docs (Fumadocs owns that layout).
 *
 * Uses CSS from landing.css (.nav, .nav-inner, .nav-links, .nav-actions, …).
 * Parent page must import landing.css before using this component.
 */
export function SiteNav({ active }: SiteNavProps) {
  const lnk = (page: SiteNavProps['active']) =>
    `nav-link${active === page ? ' is-active' : ''}`;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand" aria-label="Kakunin — home">
          {/* width/height prevent CLS; fetchPriority=high since nav logo is LCP candidate */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Kakunin" className="nav-logo" width="120" height="32" fetchPriority="high" />
        </Link>

        <div className="nav-links">
          <Link href="/pricing" className={lnk('pricing')}>Pricing</Link>
          <Link href="/kya" className={lnk('kya')}>KYA</Link>
          <Link href="/docs" className={lnk('docs')}>Docs</Link>
          <Link href="/blog" className={lnk('blog')}>Blog</Link>
          <Link href="/test-results" className={lnk('test-results')}>Tests</Link>
        </div>

        <div className="nav-actions">
          <div className="nav-verify">
            <span className="led" />
            <span>
              API <b style={{ color: 'var(--ink)' }}>99.99%</b>
            </span>
          </div>
          <ThemeToggle />
          <Link href="/login" className="btn btn--ghost">Sign in</Link>
          <Link href="/pricing" className="btn btn--dark">
            Get started{' '}
            <svg className="arrow" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  );
}
