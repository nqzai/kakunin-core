/**
 * Blog Components
 *
 * Production-ready React components for the redesigned Kakunin blog.
 * Integrates with Sanity CMS for content fetching.
 *
 * Components:
 *   - HeroSection: Blog header with title and subtitle
 *   - PostCard: Individual post card with metadata
 *   - PostList: Wrapper for post grid/list
 *   - BlogPage: Main page component (aggregates above)
 *   - Pagination: Simple pagination controls
 *
 * @see BLOG_REDESIGN_SPEC.md for design details
 */

import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import type { Post } from '@/types/blog';

// ============================================================================
// HeroSection Component
// ============================================================================

interface HeroSectionProps {
  title: string;
  subtitle: string;
}

export function HeroSection({ title, subtitle }: HeroSectionProps) {
  return (
    <section className="w-full bg-white border-b border-[#E5E5E5]">
      <div className="mx-auto max-w-4xl px-8 py-20 md:px-12 md:py-24 lg:px-16 lg:py-32">
        {/* Optional accent dot/line */}
        <div className="mb-4 flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#2B934F]" />
          <span className="text-sm font-medium tracking-wide text-[#8A8C84]">
            KAKUNIN BLOG
          </span>
        </div>

        {/* Main title */}
        <h1 className="mb-6 font-geist text-4xl font-600 leading-tight text-[#141B1B] md:text-5xl">
          {title}
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl font-geist text-lg leading-relaxed text-[#4A4F52]">
          {subtitle}
        </p>
      </div>
    </section>
  );
}

// ============================================================================
// PostCard Component
// ============================================================================

interface PostCardProps {
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  slug: string;
}

export function PostCard({
  title,
  excerpt,
  author,
  publishedAt,
  slug,
}: PostCardProps) {
  const relativeDate = formatDistanceToNow(new Date(publishedAt), {
    addSuffix: true,
  });

  return (
    <article className="group flex flex-col gap-4 rounded-lg bg-white p-8 transition-colors duration-200 hover:bg-[#F4F1E8] md:p-10">
      {/* Post title */}
      <Link href={`/blog/${slug}`} className="block">
        <h2 className="font-geist text-2xl font-600 leading-snug text-[#141B1B] transition-colors duration-200 group-hover:text-[#2B934F] md:text-3xl">
          {title}
        </h2>
      </Link>

      {/* Post excerpt */}
      <p className="line-clamp-3 font-geist text-base leading-relaxed text-[#4A4F52]">
        {excerpt}
      </p>

      {/* Metadata: author and date */}
      <div className="flex flex-col items-start justify-between gap-4 pt-2 sm:flex-row sm:items-center">
        <p className="font-geist text-sm text-[#8A8C84]">
          By <span className="font-medium">{author}</span> · {relativeDate}
        </p>

        {/* Read more link */}
        <Link
          href={`/blog/${slug}`}
          className="font-geist text-sm font-500 text-[#2B934F] transition-colors duration-200 hover:text-[#1C6B39]"
        >
          Read article <span className="ml-1 inline-block transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </article>
  );
}

// ============================================================================
// PostList Component
// ============================================================================

interface PostListProps {
  posts: Post[];
}

export function PostList({ posts }: PostListProps) {
  if (!posts || posts.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-8 py-16 md:px-12 lg:px-16">
        <p className="font-geist text-center text-lg text-[#4A4F52]">
          No posts found. Check back soon!
        </p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-8 py-16 md:px-12 lg:px-16">
      <div className="flex flex-col gap-8">
        {posts.map((post) => (
          <PostCard
            key={post._id}
            title={post.title}
            excerpt={post.excerpt}
            author={post.author}
            publishedAt={post.publishedAt}
            slug={post.slug.current}
          />
        ))}
      </div>
    </section>
  );
}

// ============================================================================
// Pagination Component
// ============================================================================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  return (
    <nav
      className="mx-auto flex max-w-4xl items-center justify-center gap-4 px-8 py-12 md:px-12 lg:px-16"
      aria-label="Blog pagination"
    >
      {/* Previous button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded px-4 py-2 font-geist text-sm font-500 text-[#2B934F] transition-colors duration-200 disabled:text-[#E5E5E5] hover:bg-[#F4F1E8] disabled:hover:bg-transparent"
        aria-label="Previous page"
      >
        ← Previous
      </button>

      {/* Page numbers */}
      <div className="flex gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded px-3 py-2 font-geist text-sm font-500 transition-colors duration-200 ${
              page === currentPage
                ? 'bg-[#2B934F] text-white'
                : 'text-[#2B934F] hover:bg-[#F4F1E8]'
            }`}
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Next button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded px-4 py-2 font-geist text-sm font-500 text-[#2B934F] transition-colors duration-200 disabled:text-[#E5E5E5] hover:bg-[#F4F1E8] disabled:hover:bg-transparent"
        aria-label="Next page"
      >
        Next →
      </button>
    </nav>
  );
}

// ============================================================================
// BlogPage Component (Full Page)
// ============================================================================

interface BlogPageProps {
  posts: Post[];
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function BlogPage({
  posts,
  currentPage = 1,
  totalPages = 1,
  onPageChange = () => {},
}: BlogPageProps) {
  return (
    <main className="min-h-screen bg-white">
      <HeroSection
        title="AI Regulation & Compliance"
        subtitle="Practical guidance on MiCA, EU AI Act, and cryptographic identity for teams deploying autonomous AI agents in regulated markets."
      />

      <PostList posts={posts} />

      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      )}
    </main>
  );
}

// ============================================================================
// Featured Post Component (Optional)
// ============================================================================

interface FeaturedPostProps {
  post: Post;
}

export function FeaturedPost({ post }: FeaturedPostProps) {
  return (
    <section className="mx-auto max-w-4xl px-8 py-16 md:px-12 lg:px-16">
      <div className="border-l-4 border-[#2B934F] bg-[#F4F1E8] p-8 md:p-10">
        <div className="mb-2 inline-block font-geist text-xs font-600 tracking-widest text-[#2B934F]">
          FEATURED
        </div>

        <Link href={`/blog/${post.slug.current}`} className="block">
          <h2 className="mb-4 font-geist text-3xl font-600 leading-snug text-[#141B1B] transition-colors duration-200 hover:text-[#2B934F] md:text-4xl">
            {post.title}
          </h2>
        </Link>

        <p className="mb-6 font-geist text-lg leading-relaxed text-[#4A4F52]">
          {post.excerpt}
        </p>

        <div className="flex items-center justify-between">
          <p className="font-geist text-sm text-[#8A8C84]">
            By <span className="font-medium">{post.author}</span> ·{' '}
            {format(new Date(post.publishedAt), 'MMM d, yyyy')}
          </p>

          <Link
            href={`/blog/${post.slug.current}`}
            className="font-geist text-sm font-500 text-[#2B934F] transition-colors duration-200 hover:text-[#1C6B39]"
          >
            Read article →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default BlogPage;
