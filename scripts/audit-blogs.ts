import { createClient } from '@sanity/client';

const client = createClient({
  projectId: '3wz2eknt',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

async function main() {
  // Simple count first
  const count = await client.fetch(`count(*[_type == 'post'])`);
  console.error(`Total posts: ${count}`);

  const posts = await client.fetch(`*[_type == 'post'] | order(publishedAt desc) {
    'slug': slug.current,
    title,
    publishedAt,
    tags
  }`);

  console.error(`Fetched: ${posts.length}`);

  for (const p of posts) {
    // fetch body separately to avoid GROQ pt:: issues
    const body = await client.fetch(`*[_type == 'post' && slug.current == $slug][0].body`, { slug: p.slug });
    const links: string[] = [];
    if (Array.isArray(body)) {
      for (const block of body) {
        if (block.markDefs) {
          for (const def of block.markDefs) {
            if (def._type === 'link' && def.href) links.push(def.href);
          }
        }
      }
    }
    const ext = links.filter(h => !h.startsWith('/') && !h.includes('kakunin.ai'));
    const int = links.filter(h => h.startsWith('/') || h.includes('kakunin.ai'));
    process.stdout.write(JSON.stringify({
      slug: p.slug,
      title: (p.title || '').substring(0, 70),
      extCount: ext.length,
      intCount: int.length,
      extLinks: ext,
      tags: p.tags || []
    }) + '\n');
  }
}

main().catch(e => { console.error(e); process.exit(1); });
