import type { MetadataRoute } from 'next';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { sanityClient } from '@/lib/sanity/client';
import { BLOG_SLUGS_QUERY } from '@/lib/sanity/queries';

export const revalidate = 3600;

const BASE = 'https://www.kakunin.ai';
const APP_DIR = join(process.cwd(), 'src', 'app');
const EXCLUDED_APP_SEGMENTS = new Set(['api', 'dashboard', 'studio']);
const EXCLUDED_PUBLIC_ROUTES = new Set(['/seo-hub']);
const PRIORITY_OVERRIDES: Record<string, number> = {
  '/': 1.0,
  '/pricing': 0.9,
  '/kya': 0.88,
  '/assessment': 0.84,
  '/api-docs': 0.85,
  '/attestation-template': 0.84,
  '/blog': 0.8,
  '/docs': 0.82,
  '/ai-agent-compliance-comparison': 0.85,
  '/platform': 0.82,
  '/platform/non-human-identity': 0.8,
  '/platform/ai-governance-tools': 0.8,
  '/platform/sandbox': 0.78,
  '/compliance': 0.82,
  '/for-fintech-founders': 0.78,
  '/for-compliance-officers': 0.78,
  '/for-ctos': 0.78,
  '/for-devops': 0.76,
  '/for-regulators': 0.76,
  '/press': 0.75,
  '/test-results': 0.8,
  '/privacy': 0.4,
  '/terms': 0.4,
};
const CHANGE_FREQUENCY_OVERRIDES: Partial<Record<string, MetadataRoute.Sitemap[number]['changeFrequency']>> = {
  '/': 'weekly',
  '/pricing': 'monthly',
  '/assessment': 'monthly',
  '/api-docs': 'weekly',
  '/blog': 'weekly',
  '/test-results': 'weekly',
  '/privacy': 'yearly',
  '/terms': 'yearly',
};
const STATIC_DYNAMIC_ROUTES = [
  '/compliance/hub/berlin',
  '/compliance/hub/paris',
  '/compliance/hub/dublin',
  '/compliance/hub/brussels',
  '/compliance/hub/zug',
];

/** Recursively list all .mdx files under a directory, returning slug paths. */
function mdxSlugs(dir: string, base = ''): string[] {
  let slugs: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      slugs = slugs.concat(mdxSlugs(full, `${base}/${entry}`));
    } else if (entry.endsWith('.mdx')) {
      const slug = entry === 'index.mdx' ? base : `${base}/${entry.replace(/\.mdx$/, '')}`;
      slugs.push(slug);
    }
  }
  return slugs;
}

/**
 * Discover blog MDX posts under src/app/blog that are rendered as static pages.
 * These are separate from Sanity-driven blog posts and should also appear in the sitemap.
 */
function blogSlugs(dir: string): string[] {
  const slugs: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('[') || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory()) continue;
    const hasMdx = readdirSync(full).some((f) => f === 'page.mdx');
    if (hasMdx) slugs.push(entry);
  }
  return slugs;
}

function publicAppRoutes(dir: string, segments: string[] = []): string[] {
  let routes: string[] = [];

  for (const entry of readdirSync(dir)) {
    if (entry.startsWith('.')) continue;

    const full = join(dir, entry);
    const stats = statSync(full);

    if (stats.isDirectory()) {
      if (entry.startsWith('(') || entry.startsWith('[') || EXCLUDED_APP_SEGMENTS.has(entry)) {
        continue;
      }
      routes = routes.concat(publicAppRoutes(full, [...segments, entry]));
      continue;
    }

    if (entry !== 'page.tsx' && entry !== 'page.mdx') continue;

    const route = segments.length === 0 ? '/' : `/${segments.join('/')}`;
    if (!EXCLUDED_PUBLIC_ROUTES.has(route)) {
      routes.push(route);
    }
  }

  return routes;
}

function pageEntry(route: string, now: Date): MetadataRoute.Sitemap[number] {
  return {
    url: route === '/' ? BASE : `${BASE}${route}`,
    lastModified: now,
    changeFrequency: CHANGE_FREQUENCY_OVERRIDES[route] ?? 'monthly',
    priority: PRIORITY_OVERRIDES[route] ?? 0.72,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // ── Auto-discover docs pages from filesystem ──────────────────────────────
  const docsDir = join(process.cwd(), 'content', 'docs');
  const docSlugs = mdxSlugs(docsDir);
  const docEntries: MetadataRoute.Sitemap = docSlugs.map((slug) => ({
    url: `${BASE}/docs${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: slug.startsWith('/case-study') ? 0.72 : 0.75,
  }));

  // ── Blog posts from Sanity ────────────────────────────────────────────────
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts: Array<{ slug: string; publishedAt?: string }> =
      await sanityClient.fetch(BLOG_SLUGS_QUERY);
    blogEntries = (posts ?? []).map((p) => ({
      url: `${BASE}/blog/${p.slug}`,
      lastModified: p.publishedAt ? new Date(p.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.7,
    }));
  } catch {
    // Non-fatal — sitemap degrades gracefully if Sanity is unreachable
  }

  // ── Static blog posts from src/app/blog/**/page.mdx ─────────────────────
  const appBlogDir = join(process.cwd(), 'src', 'app', 'blog');
  const staticBlogEntries: MetadataRoute.Sitemap = blogSlugs(appBlogDir).map((slug) => ({
    url: `${BASE}/blog/${slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.72,
  }));
  const appEntries = publicAppRoutes(APP_DIR).map((route) => pageEntry(route, now));
  const dynamicEntries = STATIC_DYNAMIC_ROUTES.map((route) => pageEntry(route, now));

  const entries = new Map<string, MetadataRoute.Sitemap[number]>();
  const addEntries = (items: MetadataRoute.Sitemap) => {
    for (const item of items) {
      entries.set(item.url, item);
    }
  };

  addEntries(appEntries);
  addEntries(dynamicEntries);
  addEntries(blogEntries);
  addEntries(staticBlogEntries);
  addEntries(docEntries);

  return [...entries.values()].sort((a, b) => a.url.localeCompare(b.url));
}
