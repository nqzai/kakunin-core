import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { HeroSection } from '@/components/blog/HeroSection';
import { PostList } from '@/components/blog/PostList';
import type { PostWithImage } from '@/components/blog/PostList';
import { sanityClient } from '@/lib/sanity/client';
import { BLOG_POSTS_QUERY } from '@/lib/sanity/queries';
import { getImageUrl } from '@/lib/sanity/image';
import type { Post } from '@/types/blog';
import { generateCollectionPage } from '@/lib/schema/generators';

const featuredBlogSlugs = [
  'ai-agent-identity-explained',
  'govern-ai-agents-without-pki-team',
  'nist-four-pillars-agent-governance',
  'nccoe-non-human-identity-fintech',
];

export const metadata: Metadata = {
  metadataBase: new URL('https://www.kakunin.ai'),
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
    images: [{ url: 'https://www.kakunin.ai/og-image.png', width: 1200, height: 630, alt: 'Kakunin Blog' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kakunin Blog — AI Regulation, MiCA & EU AI Act',
    description: 'Practical guidance on AI agent regulation, MiCA compliance, and EU AI Act obligations.',
    images: ['https://www.kakunin.ai/og-image.png'],
  },
};

async function getBlogPosts(): Promise<Post[]> {
  try {
    const posts = await sanityClient.fetch(BLOG_POSTS_QUERY);
    return posts || [];
  } catch (error) {
    console.error('[blog.page] Sanity fetch failed:', error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getBlogPosts();
  const postBySlug = new Map(posts.map((post) => [post.slug.current, post]));
  const featuredBlogPosts = [
    ...featuredBlogSlugs
      .map((slug) => postBySlug.get(slug))
      .filter((post): post is Post => Boolean(post)),
    ...posts.filter((post) => !featuredBlogSlugs.includes(post.slug.current)),
  ].slice(0, 6);

  // Transform image URLs
  const postsWithImages: PostWithImage[] = posts.map(post => ({
    ...post,
    image: getImageUrl(post.image),
  }));

  // Generate CollectionPage schema for SEO
  const blogSchema = generateCollectionPage(
    'Kakunin Blog — AI Regulation, MiCA & EU AI Act',
    'https://www.kakunin.ai/blog',
    'Practical guidance on MiCA, EU AI Act, and cryptographic identity for teams deploying autonomous AI agents in regulated markets.',
    postsWithImages.map((post, idx) => ({
      position: idx + 1,
      url: `https://www.kakunin.ai/blog/${post.slug.current}`,
      name: post.title,
      description: post.excerpt,
      image: typeof post.image === 'string' ? post.image : (post.image?.url || '/og-image.png'),
      datePublished: post.publishedAt,
      author: typeof post.author === 'string' ? post.author : undefined,
    })),
    [
      { position: 1, name: 'Home', item: 'https://www.kakunin.ai' },
      { position: 2, name: 'Blog', item: 'https://www.kakunin.ai/blog' },
    ]
  );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <SiteNav active="blog" />

      <main className="flex-1">
        <HeroSection
          title="Kakunin Blog — AI Regulation, MiCA & EU AI Act"
          subtitle="Practical guidance on MiCA, EU AI Act, and cryptographic identity for teams deploying autonomous AI agents in regulated markets."
        />

        <section className="mx-auto max-w-6xl px-8 pb-10 md:px-12 lg:px-16">
          <div className="rounded-2xl border border-kakunin-border bg-kakunin-subtle-bg/40 p-6 md:p-8">
            <h2 className="text-2xl font-600 text-kakunin-heading">What you&apos;ll find here</h2>
            <p className="mt-3 max-w-4xl text-base leading-relaxed text-kakunin-body">
              The Kakunin blog publishes longer-form explanations of the problems regulated teams run into when AI agents
              move from prototype to production. That includes identity and certificate design, scope enforcement, anomaly
              scoring, revocation, compliance evidence, and practical implementation notes for teams using Next.js, APIs,
              and agent frameworks.
            </p>
            <p className="mt-4 max-w-4xl text-base leading-relaxed text-kakunin-body">
              If you are trying to understand whether your system is ready for MiCA, the EU AI Act, or a regulator review,
              start with the featured guides below. They move from strategy into the exact implementation patterns we use
              across the product and docs.
            </p>
            <p className="mt-4 max-w-4xl text-base leading-relaxed text-kakunin-body">
              For a strong foundation on{' '}
              <Link
                href="/blog/ai-agent-identity-explained"
                className="text-kakunin-accent underline decoration-kakunin-accent/40 underline-offset-4 transition hover:decoration-kakunin-accent"
              >
                cryptographic proof for autonomous systems
              </Link>
              , start with our breakdown of how AI agent identity works in practice.
            </p>
          </div>
        </section>

        <PostList posts={postsWithImages} />

        <section className="mx-auto max-w-6xl px-8 pb-6 md:px-12 lg:px-16">
          <div className="rounded-2xl border border-kakunin-border bg-kakunin-subtle-bg/40 p-6">
            <div className="mb-4">
              <div className="text-xs font-600 uppercase tracking-[0.12em] text-kakunin-meta">Featured reading</div>
              <h2 className="mt-2 text-2xl font-600 text-kakunin-heading">Start with these high-intent guides</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {featuredBlogPosts.map((post) => (
                <a
                  key={post._id}
                  href={`/blog/${post.slug.current}`}
                  className="rounded-xl border border-kakunin-border bg-white p-4 text-sm font-500 text-kakunin-heading transition hover:border-kakunin-accent hover:shadow-sm"
                >
                  {post.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Internal links section */}
        <section className="mx-auto max-w-4xl px-8 py-16 md:px-12 lg:px-16">
          <div className="grid gap-4 border-t border-kakunin-border pt-8 md:grid-cols-3">
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
              <a
                key={href}
                href={href}
                className="block rounded-lg bg-kakunin-subtle-bg p-4 transition-colors duration-200 hover:border-kakunin-accent"
              >
                <div className="mb-2 text-sm font-600 text-kakunin-accent">
                  {label}
                </div>
                <div className="font-mono text-xs text-kakunin-meta">{desc}</div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
