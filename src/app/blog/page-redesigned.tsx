/**
 * Blog Page — Redesigned
 *
 * Redesigned blog listing page implementing Kakunin's design system.
 * Integrates with existing Sanity CMS setup and queries.
 *
 * Design: BLOG_REDESIGN_SPEC.md
 * Reference template: Sanity Next.js Cloudflare starter
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { sanityClient } from '@/lib/sanity/client';
import { BLOG_POSTS_QUERY } from '@/lib/sanity/queries';

export const metadata: Metadata = {
  title: 'Kakunin Blog — AI Regulation, MiCA & EU AI Act',
  description:
    'Practical guidance on AI agent regulation, MiCA compliance, EU AI Act obligations, and cryptographic identity for autonomous systems.',
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    url: 'https://www.kakunin.ai/blog',
    title: 'Kakunin Blog — AI Regulation, MiCA & EU AI Act',
    description: 'Practical guidance on AI agent regulation, MiCA compliance, and EU AI Act obligations.',
    siteName: 'Kakunin',
    locale: 'en_GB',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Kakunin Blog' }],
  },
};

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  author?: string;
}

async function getBlogPosts(): Promise<BlogPost[]> {
  try {
    const posts = await sanityClient.fetch(BLOG_POSTS_QUERY);
    return posts || [];
  } catch (error) {
    console.error('[blog.page] Sanity fetch failed:', error);
    return [];
  }
}

// ============================================================================
// Hero Section
// ============================================================================

function HeroSection() {
  return (
    <section
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E5E5',
      }}
    >
      <div
        style={{
          maxWidth: '1024px',
          margin: '0 auto',
          padding: '80px 32px',
        }}
      >
        {/* Accent dot + label */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#2B934F',
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              letterSpacing: '0.05em',
              color: '#8A8C84',
              textTransform: 'uppercase',
            }}
          >
            Kakunin Blog
          </span>
        </div>

        {/* Main title */}
        <h1
          style={{
            fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            fontSize: '44px',
            fontWeight: 600,
            lineHeight: 1.1,
            color: '#141B1B',
            margin: '0 0 24px',
          }}
        >
          AI Regulation & Compliance
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            fontSize: '18px',
            lineHeight: 1.6,
            color: '#4A4F52',
            margin: 0,
            maxWidth: '600px',
          }}
        >
          Practical guidance on MiCA, EU AI Act, and cryptographic identity
          for teams deploying autonomous AI agents in regulated markets.
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// Post Card
// ============================================================================

interface PostCardProps {
  post: BlogPost;
}

function PostCard({ post }: PostCardProps) {
  const relativeDate = formatDistanceToNow(new Date(post.publishedAt), {
    addSuffix: true,
  });

  return (
    <Link
      href={`/blog/${post.slug.current}`}
      style={{ textDecoration: 'none' }}
    >
      <article
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderRadius: '8px',
          backgroundColor: '#FFFFFF',
          padding: '32px',
          transition: 'background-color 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = '#F4F1E8';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = '#FFFFFF';
        }}
      >
        {/* Post title */}
        <h2
          style={{
            fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            fontSize: '28px',
            fontWeight: 600,
            lineHeight: 1.3,
            color: '#141B1B',
            margin: 0,
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#2B934F';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = '#141B1B';
          }}
        >
          {post.title}
        </h2>

        {/* Post excerpt */}
        <p
          style={{
            fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            fontSize: '16px',
            lineHeight: 1.6,
            color: '#4A4F52',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}
        >
          {post.excerpt}
        </p>

        {/* Metadata & read more */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '16px',
            paddingTop: '8px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
              fontSize: '14px',
              color: '#8A8C84',
              margin: 0,
            }}
          >
            By <span style={{ fontWeight: 500 }}>{post.author || 'Kakunin Team'}</span> ·{' '}
            {relativeDate}
          </p>

          <span
            style={{
              fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
              fontSize: '14px',
              fontWeight: 500,
              color: '#2B934F',
              transition: 'color 0.2s ease',
            }}
          >
            Read article <span style={{ marginLeft: '4px', display: 'inline-block' }}>→</span>
          </span>
        </div>
      </article>
    </Link>
  );
}

// ============================================================================
// Post List
// ============================================================================

interface PostListProps {
  posts: BlogPost[];
}

function PostList({ posts }: PostListProps) {
  if (!posts || posts.length === 0) {
    return (
      <section
        style={{
          maxWidth: '1024px',
          margin: '0 auto',
          padding: '64px 32px',
        }}
      >
        <p
          style={{
            fontFamily: 'var(--ff-geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
            textAlign: 'center',
            fontSize: '18px',
            color: '#4A4F52',
          }}
        >
          No posts yet. Check back soon for insights on AI regulation and compliance.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '64px 32px',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
        }}
      >
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Internal Links Section
// ============================================================================

function InternalLinks() {
  return (
    <section
      style={{
        maxWidth: '1024px',
        margin: '0 auto',
        padding: '0 32px 64px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px',
          paddingTop: '32px',
          borderTop: '1px solid #E5E5E5',
        }}
      >
        {[
          {
            href: '/docs',
            label: 'Documentation →',
            desc: 'API reference, SDK, integration guides',
          },
          {
            href: '/pricing',
            label: 'Pricing →',
            desc: 'Starter, Pro, Enterprise — 30-day free trial',
          },
          {
            href: '/docs/certificates',
            label: 'X.509 Certificates →',
            desc: 'How KMS-backed cert issuance works',
          },
        ].map(({ href, label, desc }) => (
          <Link
            key={href}
            href={href}
            style={{
              display: 'block',
              padding: '16px',
              backgroundColor: '#F4F1E8',
              border: '1px solid #E5E5E5',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#2B934F';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = '#E5E5E5';
            }}
          >
            <div
              style={{
                fontSize: '13px',
                color: '#2B934F',
                fontWeight: 600,
                marginBottom: '4px',
              }}
            >
              {label}
            </div>
            <div
              style={{
                fontSize: '11px',
                color: '#8A8C84',
                fontFamily: 'monospace',
              }}
            >
              {desc}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Main Blog Page
// ============================================================================

export default async function BlogPageRedesigned() {
  const posts = await getBlogPosts();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
      }}
    >
      <SiteNav active="blog" />

      <main style={{ flex: 1 }}>
        <HeroSection />
        <PostList posts={posts} />
        <InternalLinks />
      </main>

      <SiteFooter />
    </div>
  );
}
