import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PortableText } from '@portabletext/react';
import type { PortableTextBlock, PortableTextSpan } from '@portabletext/types';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { AuthorCard } from '@/components/blog/AuthorCard';
import { sanityClient } from '@/lib/sanity/client';
import { BLOG_POST_QUERY } from '@/lib/sanity/queries';
import { getImageUrl } from '@/lib/sanity/image';
import type { SanityImage } from '@/types/blog';

export const dynamicParams = true;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

/** Any block in the content array — block type or inline image */
type ContentBlock = PortableTextBlock | { _type: string; _key: string; [key: string]: unknown };

interface RelatedPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  author?: string;
  image?: SanityImage;
}

interface BlogPost {
  _id: string;
  title: string;
  slug: { current: string };
  excerpt: string;
  publishedAt: string;
  author?: string;
  image?: SanityImage;
  tags?: string[];
  content: ContentBlock[] | string;
  relatedPosts?: RelatedPost[];
}

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface FaqAnswerBlock extends PortableTextBlock {
  _key: string;
}

interface FaqItem {
  _key: string;
  question?: string;
  answer?: FaqAnswerBlock[];
}

interface FaqSectionBlock {
  _type: 'faqSection';
  _key: string;
  title?: string;
  items?: FaqItem[];
  [key: string]: unknown;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function blockText(block: PortableTextBlock): string {
  return (block.children as PortableTextSpan[])
    .map((s) => s.text ?? '')
    .join('');
}

/** Deduplicate `_key` values so PortableText never warns about duplicate keys.
 *  Sanity Studio can produce identical _key when blocks are copy-pasted. */
function dedupeContentKeys(content: ContentBlock[]): ContentBlock[] {
  const seen = new Set<string>();
  return content.map((block) => {
    const key = block._key ?? '';
    if (key && !seen.has(key)) {
      seen.add(key);
      return block;
    }
    const newKey = `${key || 'block'}-${Math.random().toString(36).slice(2, 7)}`;
    seen.add(newKey);
    return { ...block, _key: newKey };
  });
}

function extractToc(content: ContentBlock[]): TocItem[] {
  return content
    .filter((b): b is PortableTextBlock =>
      b._type === 'block' && (b.style === 'h2' || b.style === 'h3')
    )
    .map((b) => ({
      id: slugify(blockText(b)),
      text: blockText(b),
      level: (b.style === 'h2' ? 2 : 3) as 2 | 3,
    }));
}

function extractFaqSections(content: ContentBlock[]): Array<ContentBlock & FaqSectionBlock> {
  return content.filter(
    (block): block is ContentBlock & FaqSectionBlock =>
      block._type === 'faqSection'
  );
}

function portableTextToPlainText(blocks: FaqAnswerBlock[] = []): string {
  return blocks
    .map((block) => blockText(block))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const post = await sanityClient.fetch(BLOG_POST_QUERY, { slug });
    return post || null;
  } catch (error) {
    console.error('[blog.[slug]] Sanity fetch failed:', error);
    return null;
  }
}

export async function generateStaticParams() {
  return [];
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) return { title: 'Not Found' };

  const heroImage = getImageUrl(post.image);
  const ogImageUrl = heroImage?.url ?? 'https://www.kakunin.ai/og-image.png';
  const ogImages = [{ url: ogImageUrl, width: 1200, height: 630, alt: post.title }];

  return {
    metadataBase: new URL('https://www.kakunin.ai'),
    title: `${post.title}`,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug.current}` },
    openGraph: {
      type: 'article',
      url: `https://www.kakunin.ai/blog/${post.slug.current}`,
      title: post.title,
      description: post.excerpt,
      siteName: 'Kakunin',
      locale: 'en_GB',
      publishedTime: post.publishedAt,
      authors: post.author ? [post.author] : undefined,
      images: ogImages,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.excerpt,
      images: [ogImageUrl],
    },
  };
}

// ── PortableText components ───────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProps = any;

const portableTextComponents = {
  block: {
    h2: ({ children, value }: AnyProps) => (
      <h2 id={slugify(blockText(value as PortableTextBlock))}>{children}</h2>
    ),
    h3: ({ children, value }: AnyProps) => (
      <h3 id={slugify(blockText(value as PortableTextBlock))}>{children}</h3>
    ),
    normal: ({ children }: AnyProps) => <p>{children}</p>,
    blockquote: ({ children }: AnyProps) => <blockquote>{children}</blockquote>,
    code: ({ children }: AnyProps) => (
      <pre>
        <code>{children}</code>
      </pre>
    ),
  },
  marks: {
    strong: ({ children }: AnyProps) => <strong>{children}</strong>,
    em: ({ children }: AnyProps) => <em>{children}</em>,
    code: ({ children }: AnyProps) => <code>{children}</code>,
    link: ({ value, children }: AnyProps) => (
      <a
        href={value?.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
  },
  list: {
    bullet: ({ children }: AnyProps) => <ul>{children}</ul>,
    number: ({ children }: AnyProps) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }: AnyProps) => <li>{children}</li>,
    number: ({ children }: AnyProps) => <li>{children}</li>,
  },
  types: {
    image: ({ value }: AnyProps) => {
      const img = getImageUrl(value as SanityImage);
      if (!img?.url) return null;
      const caption = (value?.alt as string | undefined) ?? (value?.caption as string | undefined);
      return (
        <figure>
          <div
            style={{
              position: 'relative',
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <Image src={img.url} alt={img.alt ?? caption ?? ''} fill style={{ objectFit: 'cover' }} />
          </div>
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    },
    faqSection: ({ value }: { value: FaqSectionBlock }) => {
      const title = value?.title?.trim() || 'FAQ';
      const items = (value?.items ?? []).filter((item) => item.question && item.answer?.length);
      if (items.length === 0) return null;

      return (
        <section className="blog-faq-section" aria-label={title}>
          <h2>{title}</h2>
          <div className="blog-faq-list">
            {items.map((item) => (
              <details key={item._key} className="blog-faq-item">
                <summary>{item.question}</summary>
                <div className="blog-faq-answer">
                  <PortableText
                    value={item.answer as PortableTextBlock[]}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    components={portableTextComponents as any}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      );
    },
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);

  if (!post) notFound();

  const isPortableText = Array.isArray(post.content);
  const heroImage = getImageUrl(post.image);
  // Dedupe keys before any processing — Sanity copy-paste can produce duplicates
  const safeContent: ContentBlock[] = isPortableText
    ? dedupeContentKeys(post.content as ContentBlock[])
    : [];
  const toc: TocItem[] = isPortableText ? extractToc(safeContent) : [];
  const faqSections = isPortableText ? extractFaqSections(safeContent) : [];
  const faqSchemaItems = faqSections.flatMap((section) =>
    (section.items ?? [])
      .filter((item) => item.question && item.answer?.length)
      .map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: portableTextToPlainText(item.answer),
        },
      }))
  );

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author ?? 'Kakunin Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Kakunin',
      logo: { '@type': 'ImageObject', url: 'https://www.kakunin.ai/logo.png' },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://www.kakunin.ai/blog/${post.slug.current}`,
    },
    ...(heroImage?.url ? { image: heroImage.url } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      {faqSchemaItems.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: faqSchemaItems,
            }),
          }}
        />
      )}
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <SiteNav active="blog" />

        <main style={{ flex: 1, maxWidth: 'var(--container)', margin: '0 auto', padding: '60px 32px', width: '100%' }}>
          {/* Back link */}
          <Link
            href="/blog"
            style={{
              color: 'var(--green)',
              textDecoration: 'none',
              fontSize: '13px',
              marginBottom: '32px',
              display: 'inline-block',
            }}
          >
            ← Back to blog
          </Link>

          <article itemScope itemType="https://schema.org/BlogPosting">
            {/* Article header */}
            <header style={{ marginBottom: '40px', maxWidth: '720px' }}>
              <div
                style={{
                  fontFamily: 'var(--ff-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  marginBottom: '16px',
                }}
              >
                <time dateTime={post.publishedAt} itemProp="datePublished">
                  {new Date(post.publishedAt).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                {post.author && (
                  <>
                    {' · By '}
                    <span itemProp="author" itemScope itemType="https://schema.org/Person">
                      <span itemProp="name">{post.author}</span>
                    </span>
                  </>
                )}
              </div>

              {/* h1 — primary SEO heading, scoped via .blog-post-title to override base styles */}
              <h1 className="blog-post-title" itemProp="headline">
                {post.title}
              </h1>

              <p
                style={{ fontSize: '18px', color: 'var(--ink-2)', margin: 0, lineHeight: 1.6 }}
                itemProp="description"
              >
                {post.excerpt}
              </p>

              <div style={{ marginTop: '20px' }}>
                <a
                  href={`https://www.google.com/preferences/source?q=https://www.kakunin.ai/blog/${post.slug.current}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-block' }}
                >
                  <svg width="190" height="32" viewBox="0 0 190 32" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="189" height="31" rx="6" fill="#FFFFFF" stroke="#E0E0E0" strokeWidth="1"/>
                    <g transform="translate(10, 8) scale(0.67)">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </g>
                    <text x="34" y="20" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontSize="11" fontWeight="600" fill="#3C4043">Preferred source on Google</text>
                  </svg>
                </a>
              </div>
            </header>

            {/* Hero image */}
            {heroImage?.url && (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: '720px',
                  aspectRatio: '16/9',
                  marginBottom: '40px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                }}
              >
                <Image
                  src={heroImage.url}
                  alt={heroImage.alt || post.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  priority
                  itemProp="image"
                />
              </div>
            )}

            {/* Collapsible TOC — only shown when ≥2 headings exist */}
            {toc.length >= 2 && (
              <details className="blog-toc" open>
                <summary>Table of Contents</summary>
                <nav className="blog-toc-nav" aria-label="Table of contents">
                  <ol className="blog-toc-list">
                    {toc.map((item) => (
                      <li
                        key={item.id}
                        className={item.level === 3 ? 'blog-toc-h3' : undefined}
                      >
                        <a href={`#${item.id}`}>{item.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              </details>
            )}

            {/* Article body */}
            <div className="blog-prose" itemProp="articleBody">
              {isPortableText ? (
                <PortableText
                  value={safeContent as PortableTextBlock[]}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  components={portableTextComponents as any}
                />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: post.content as string }} />
              )}
            </div>

            {/* Author card */}
            <AuthorCard author={post.author ?? 'Kakunin Team'} publishedAt={post.publishedAt} />
          </article>

          {/* Related posts */}
          {post.relatedPosts && post.relatedPosts.length > 0 && (
            <aside style={{ marginTop: '80px', paddingTop: '40px', borderTop: '1px solid var(--paper-edge)' }}>
              <h2
                style={{
                  fontSize: '13px',
                  fontFamily: 'var(--ff-mono)',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  marginBottom: '24px',
                }}
              >
                Related articles
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: '16px',
                }}
              >
                {post.relatedPosts.map((related) => {
                  const thumb = getImageUrl(related.image);
                  return (
                    <Link
                      key={related._id}
                      href={`/blog/${related.slug.current}`}
                      style={{
                        display: 'block',
                        padding: '20px',
                        background: 'var(--paper-warm)',
                        border: '1px solid var(--paper-edge)',
                        borderRadius: 'var(--r-md)',
                        textDecoration: 'none',
                      }}
                    >
                      {thumb?.url && (
                        <div
                          style={{
                            position: 'relative',
                            width: '100%',
                            aspectRatio: '16/9',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                          }}
                        >
                          <Image src={thumb.url} alt={thumb.alt || related.title} fill style={{ objectFit: 'cover' }} />
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: '11px',
                          fontFamily: 'var(--ff-mono)',
                          color: 'var(--ink-3)',
                          marginBottom: '6px',
                        }}
                      >
                        {new Date(related.publishedAt).toLocaleDateString('en-GB', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px', lineHeight: 1.3 }}>
                        {related.title}
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5 }}>
                        {related.excerpt}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Footer nav */}
          <div
            style={{
              marginTop: '80px',
              paddingTop: '40px',
              borderTop: '1px solid var(--paper-edge)',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
            }}
          >
            {[
              { href: '/blog', label: 'All articles →', desc: 'Read more from the blog' },
              { href: '/docs', label: 'Documentation →', desc: 'API reference and guides' },
            ].map(({ href, label, desc }) => (
              <Link
                key={href}
                href={href}
                style={{
                  display: 'block',
                  padding: '16px',
                  background: 'var(--paper-warm)',
                  border: '1px solid var(--paper-edge)',
                  borderRadius: 'var(--r-md)',
                  textDecoration: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--green)',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--ink-3)',
                    fontFamily: 'var(--ff-mono)',
                  }}
                >
                  {desc}
                </div>
              </Link>
            ))}
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
