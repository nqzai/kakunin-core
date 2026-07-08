import { createClient } from '@sanity/client';

// Fall back to a placeholder when Sanity isn't configured (e.g. a secret-free
// `docker build`). Otherwise createClient() throws "Configuration must contain
// projectId" at import time and breaks the build. With the placeholder, the
// client constructs fine and any fetch simply fails — callers already degrade
// gracefully (see src/app/sitemap.ts).
export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  token: process.env.SANITY_API_TOKEN,
});
