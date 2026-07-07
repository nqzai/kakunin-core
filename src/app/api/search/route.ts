import { createFromSource } from 'fumadocs-core/search/server';
import { source } from '@/lib/source';

// Fumadocs built-in search — indexes all docs pages at build time.
// Called by the fumadocs-ui search modal via GET /api/search?query=...
export const { GET } = createFromSource(source);
