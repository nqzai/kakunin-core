import { notFound } from 'next/navigation';
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from 'fumadocs-ui/page';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { Steps, Step } from 'fumadocs-ui/components/steps';
import type { ComponentType } from 'react';
import type { TOCItemType } from 'fumadocs-core/toc';
import { source } from '@/lib/source';
import { customDocsLoaders } from './custom-pages';

interface CustomDocsModule {
  default: ComponentType<Record<string, unknown>>;
  metadata?: {
    title?: string;
    description?: string;
  };
}

interface ResolvedDocsPage {
  normalizedSlug: string[];
  page: {
    title: string;
    description: string;
    body: ComponentType<Record<string, unknown>>;
    toc?: TOCItemType[];
    full?: boolean;
  } | null;
}

export function normalizeDocsSlug(slug?: string[]): string[] {
  if (!slug || slug.length === 0) {
    return ['index'];
  }

  return slug.filter(Boolean);
}

function formatDocsTitle(title: string) {
  if (/kakunin/i.test(title)) {
    return title;
  }

  return `${title} — Kakunin Docs`;
}

export async function getDocsPage(slug?: string[]): Promise<ResolvedDocsPage> {
  const normalizedSlug = normalizeDocsSlug(slug);
  const sourcePage =
    source.getPage(normalizedSlug) ??
    (normalizedSlug.length === 1 && normalizedSlug[0] === 'index'
      ? source.getPage(undefined)
      : undefined);

  if (sourcePage) {
    return {
      normalizedSlug,
      page: {
        title: sourcePage.data.title,
        description: sourcePage.data.description ?? '',
        body: sourcePage.data.body,
        toc: sourcePage.data.toc,
        full: sourcePage.data.full,
      },
    };
  }

  if (normalizedSlug.length === 1) {
    const loader = customDocsLoaders[normalizedSlug[0] as keyof typeof customDocsLoaders];
    if (loader) {
      const docsModule = (await loader()) as CustomDocsModule;
      const metadata = docsModule.metadata;
      const title = typeof metadata?.title === 'string' ? metadata.title : (normalizedSlug[0] ?? 'Kakunin Docs');
      const description = typeof metadata?.description === 'string' ? metadata.description : '';

      return {
        normalizedSlug,
        page: {
          title,
          description,
          body: docsModule.default,
          toc: [],
        },
      };
    }
  }

  return {
    normalizedSlug,
    page: null,
  };
}

export async function getDocsMetadata(slug?: string[]) {
  const { page } = await getDocsPage(slug);

  if (!page) notFound();

  return {
    title: formatDocsTitle(page.title),
    description: page.description,
  };
}

export async function renderDocsPage(slug?: string[]) {
  const { normalizedSlug, page } = await getDocsPage(slug);

  if (!page) notFound();

  const MDX = page.body;

  const techArticleSchema = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: page.title,
    description: page.description,
    publisher: {
      '@type': 'Organization',
      name: 'Kakunin',
      logo: {
        '@type': 'ImageObject',
        url: 'https://www.kakunin.ai/logo.png',
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id':
        normalizedSlug.length === 1 && normalizedSlug[0] === 'index'
          ? 'https://www.kakunin.ai/docs'
          : `https://www.kakunin.ai/docs/${normalizedSlug.join('/')}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(techArticleSchema) }}
      />
      <DocsPage toc={page.toc} full={page.full}>
        <DocsTitle>{page.title}</DocsTitle>
        <DocsDescription>{page.description}</DocsDescription>
        <DocsBody>
          <MDX components={{ ...defaultMdxComponents, Steps, Step }} />
        </DocsBody>
      </DocsPage>
    </>
  );
}
