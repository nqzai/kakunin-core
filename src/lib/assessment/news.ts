import { log } from '@/lib/logging';
import type { NewsSignal } from './types';

interface NewsArticle {
  title?: string;
  description?: string;
  url?: string;
  publishedAt?: string;
  source?: {
    name?: string;
  };
}

interface NewsApiResponse {
  articles?: NewsArticle[];
}

function buildQuery(brandName: string, domain: string): string {
  const brandTerm = brandName.trim() || domain.replace(/\..+$/, '');
  return `"${brandTerm}" AND (AI OR agent OR agentic OR autonomous OR automation OR compliance OR payments OR fintech OR crypto)`;
}

function summarizeNewsEffect(text: string): Pick<NewsSignal, 'effect' | 'relevanceNote'> {
  const lower = text.toLowerCase();

  if (/(agent|agentic|autonomous|operator|ai)\b/.test(lower) && /(payment|trading|crypto|compliance|regulat)/.test(lower)) {
    return {
      effect: 'strengthens',
      relevanceNote: 'Public reporting links the brand to AI autonomy in a regulated or trust-sensitive context.',
    };
  }

  if (/(agent|agentic|autonomous|operator|ai)\b/.test(lower)) {
    return {
      effect: 'strengthens',
      relevanceNote: 'Public reporting supports the presence of AI or agentic capabilities beyond homepage marketing copy.',
    };
  }

  if (/(penalty|fine|lapse|breach|lawsuit|investigation)/.test(lower)) {
    return {
      effect: 'strengthens',
      relevanceNote: 'Public reporting adds operational or governance context that can increase the need for auditability and trust controls.',
    };
  }

  return {
    effect: 'neutral',
    relevanceNote: 'Public reporting mentions the brand but does not materially strengthen the AI trust assessment.',
  };
}

export async function fetchNewsSignals(params: {
  brandName: string;
  domain: string;
  fetchImpl?: typeof fetch;
}): Promise<NewsSignal[]> {
  const apiKey = process.env.NEWS_API_KEY;
  if (!apiKey) {
    return [];
  }

  const fetchImpl = params.fetchImpl ?? fetch;
  const url = new URL('https://newsapi.org/v2/everything');
  url.searchParams.set('q', buildQuery(params.brandName, params.domain));
  url.searchParams.set('language', 'en');
  url.searchParams.set('sortBy', 'publishedAt');
  url.searchParams.set('pageSize', '5');

  try {
    const res = await fetchImpl(url, {
      headers: { 'X-Api-Key': apiKey },
      cache: 'no-store',
    });

    if (!res.ok) {
      log.warn('[assessment.news] News API request failed', { status: res.status });
      return [];
    }

    const json = await res.json() as NewsApiResponse;
    const articles = Array.isArray(json.articles) ? json.articles : [];

    return articles
      .map((article) => {
        const title = article.title?.trim();
        const source = article.source?.name?.trim();
        const articleUrl = article.url?.trim();
        const publishedAt = article.publishedAt?.trim();

        if (!title || !source || !articleUrl || !publishedAt) {
          return null;
        }

        const mergedText = [title, article.description ?? ''].join(' ');
        const summary = summarizeNewsEffect(mergedText);

        return {
          title,
          publisher: source,
          publishedAt,
          url: articleUrl,
          relevanceNote: summary.relevanceNote,
          effect: summary.effect,
        } satisfies NewsSignal;
      })
      .filter((item): item is NewsSignal => Boolean(item));
  } catch (error) {
    log.warn('[assessment.news] News API request threw', {
      error: error instanceof Error ? error.message : 'unknown_error',
    });
    return [];
  }
}
