import { createImageUrlBuilder } from '@sanity/image-url';
import { sanityClient } from './client';
import type { SanityImage } from '@/types/blog';

const builder = createImageUrlBuilder(sanityClient);

export function getImageUrl(
  source: SanityImage | { url: string; alt?: string } | undefined
): { url: string; alt?: string } | undefined {
  if (!source) return undefined;

  // Already a URL object
  if ('url' in source && typeof source.url === 'string') {
    return source;
  }

  // Sanity image reference
  if ('asset' in source && source.asset?._ref) {
    return {
      url: builder.image(source).url(),
      alt: source.alt,
    };
  }

  return undefined;
}
