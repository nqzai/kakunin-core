/**
 * Schema.org JSON-LD Generators
 *
 * Typed, reusable functions for generating Schema.org JSON-LD
 * structured data. All URLs, dates, and properties follow Schema.org
 * best practices. Used across all public pages for rich snippet support.
 */

export interface BreadcrumbItem {
  name: string;
  item: string;
  position: number;
}

export interface FAQItem {
  question: string;
  answer: string;
}

/**
 * Generate BreadcrumbList schema
 * @example
 *   generateBreadcrumbs([
 *     { name: 'Home', item: 'https://kakunin.ai', position: 1 },
 *     { name: 'Blog', item: 'https://kakunin.ai/blog', position: 2 }
 *   ])
 */
export function generateBreadcrumbs(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(item => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      item: item.item,
    })),
  };
}

/**
 * Generate WebPage schema with optional breadcrumbs
 */
export function generateWebPage(
  name: string,
  url: string,
  description: string,
  breadcrumbs?: BreadcrumbItem[],
  datePublished?: string,
  dateModified?: string
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name,
    url,
    description,
  };

  if (datePublished) schema.datePublished = datePublished;
  if (dateModified) schema.dateModified = dateModified;

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}

/**
 * Generate PrivacyPolicy schema
 */
export function generatePrivacyPolicy(
  url: string,
  datePublished: string,
  dateModified: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'PrivacyPolicy'],
    name: 'Privacy Policy — Kakunin',
    url,
    description: 'Our privacy practices and GDPR compliance commitments.',
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'Kakunin',
    },
  };
}

/**
 * Generate TermsOfService schema
 */
export function generateTermsOfService(
  url: string,
  datePublished: string,
  dateModified: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'TermsOfService'],
    name: 'Terms of Service — Kakunin',
    url,
    description: 'Legal terms and conditions governing your use of Kakunin.',
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'Kakunin',
    },
  };
}

/**
 * Generate AgreementForService schema (for EULA pages)
 */
export function generateAgreementForService(
  name: string,
  url: string,
  datePublished: string,
  dateModified: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'AgreementForService'],
    name,
    url,
    description: 'Legal agreement for services provided by Kakunin.',
    datePublished,
    dateModified,
  };
}

/**
 * Generate FAQPage schema
 */
export function generateFAQPage(
  url: string,
  faqs: FAQItem[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url,
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate HowTo schema for process/workflow pages
 */
export interface HowToStep {
  position: number;
  name: string;
  text: string;
}

export function generateHowTo(
  name: string,
  description: string,
  url: string,
  steps: HowToStep[],
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'HowTo'],
    name,
    description,
    url,
    step: steps.map(step => ({
      '@type': 'HowToStep',
      position: step.position,
      name: step.name,
      text: step.text,
    })),
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}

/**
 * Generate CollectionPage schema (blog list, hub lists)
 */
export interface CollectionItem {
  position: number;
  url: string;
  name: string;
  description?: string;
  image?: string;
  datePublished?: string;
  author?: string;
}

export function generateCollectionPage(
  name: string,
  url: string,
  description: string,
  items: CollectionItem[],
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url,
    description,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: items.map(item => {
        const element: Record<string, unknown> = {
          '@type': 'ListItem',
          position: item.position,
          url: item.url,
          name: item.name,
        };
        if (item.description) element.description = item.description;
        if (item.image) element.image = item.image;
        if (item.datePublished) element.datePublished = item.datePublished;
        if (item.author) {
          element.author = {
            '@type': 'Person',
            name: item.author,
          };
        }
        return element;
      }),
    },
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}

/**
 * Generate Product schema for platform feature pages
 */
export function generateProduct(
  name: string,
  url: string,
  description: string,
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'Product'],
    name,
    url,
    description,
    brand: {
      '@type': 'Brand',
      name: 'Kakunin',
    },
    category: 'Software / Compliance',
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'USD',
      lowPrice: '39',
      highPrice: '99',
      availability: 'https://schema.org/InStock',
    },
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}

/**
 * Generate TechArticle schema (for API docs, technical guides)
 */
export function generateTechArticle(
  name: string,
  url: string,
  description: string,
  datePublished: string,
  dateModified: string,
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'TechArticle'],
    name,
    url,
    description,
    datePublished,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'Kakunin',
    },
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}

/**
 * Generate Report schema (for test results, compliance reports)
 */
export function generateReport(
  name: string,
  url: string,
  description: string,
  datePublished: string,
  dateModified: string,
  breadcrumbs?: BreadcrumbItem[]
) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['WebPage', 'Report'],
    name,
    url,
    description,
    datePublished,
    dateModified,
  };

  if (breadcrumbs && breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbs(breadcrumbs);
  }

  return schema;
}
