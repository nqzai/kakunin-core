import { sanityClient } from '../src/lib/sanity/client.js';

const patches = [
  {
    slug: 'know-your-agent-explained',
    tags: ['kya', 'compliance', 'identity', 'agent-security', 'behavioral-profiling'],
  },
  {
    slug: 'mica-trading-bot-case-study',
    tags: ['mica', 'compliance', 'trading-bot', 'case-study', 'audit-log'],
  },
];

async function patchTags() {
  for (const { slug, tags } of patches) {
    const doc = await sanityClient.fetch<{ _id: string } | null>(
      `*[_type == "blogPost" && slug.current == $slug][0]{ _id }`,
      { slug }
    );
    if (!doc) { console.error(`Not found: ${slug}`); continue; }
    await sanityClient.patch(doc._id).set({ tags }).commit();
    console.log(`✅ Tagged ${slug}:`, tags.join(', '));
  }
}

patchTags().catch(console.error);
