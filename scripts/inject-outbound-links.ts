/**
 * Injects contextual outbound links into Sanity blog posts.
 * For each target term, finds the FIRST occurrence in a block and wraps it
 * with a PortableText link markDef. Skips spans already linked.
 *
 * Run: SANITY_API_TOKEN=... npx tsx scripts/inject-outbound-links.ts
 */
import { createClient } from '@sanity/client';
import crypto from 'crypto';

const client = createClient({
  projectId: '3wz2eknt',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

// Tier 1 + 2 link targets — framework authors and partners
const LINK_MAP: Record<string, string> = {
  'LangChain':    'https://python.langchain.com/docs/how_to/custom_tools/',
  'LangGraph':    'https://langchain-ai.github.io/langgraph/',
  'AutoGen':      'https://microsoft.github.io/autogen/docs/tutorial/introduction',
  'LlamaIndex':   'https://docs.llamaindex.ai/en/stable/',
  'CrewAI':       'https://docs.crewai.com/introduction',
  'Mastra':       'https://mastra.ai/docs/getting-started/installation',
  'Freqtrade':    'https://www.freqtrade.io/en/stable/bot-basics/',
  'AWS KMS':      'https://docs.aws.amazon.com/kms/latest/developerguide/overview.html',
  'Supabase':     'https://supabase.com/docs/guides/getting-started',
  'OWASP':        'https://owasp.org/www-project-top-10-for-large-language-model-applications/',
  'Trail of Bits':'https://blog.trailofbits.com/category/publications/',
  'Quantstamp':   'https://quantstamp.com/blog/',
};

// Posts to patch and which terms to inject per post
const PATCH_PLAN: Record<string, string[]> = {
  'securing-langchain-agent-tools-kakunin':  ['LangChain', 'AutoGen', 'LlamaIndex', 'CrewAI'],
  'ai-agent-compliance-market-2-7-billion':  ['LangChain', 'AutoGen', 'CrewAI'],
  'why-ai-agents-need-x509-certificates':    ['LangChain', 'AutoGen', 'AWS KMS'],
  'mica-article-72-ai-agents':               ['AWS KMS', 'Supabase'],
  'guardrails-for-ai-agents':                ['AWS KMS'],
  'cryptographic-security-ai-agents':        ['AWS KMS'],
  'private-key-security-ai-agents-kms':      ['AWS KMS'],
  'eu-ai-act-compliance-autonomous-agents':  ['AWS KMS'],
  'top-10-prompt-injection-attacks':         ['OWASP'],
};

function mkKey(prefix = 'lnk'): string {
  return `${prefix}-${crypto.randomBytes(6).toString('hex')}`;
}

/**
 * Injects a link for the first unlinked occurrence of `term` in the content array.
 * Returns the patched content, or null if term not found / already linked.
 */
function injectLink(
  content: any[],
  term: string,
  href: string,
  alreadyLinkedTerms: Set<string>
): any[] | null {
  if (alreadyLinkedTerms.has(term)) return null;

  for (let bi = 0; bi < content.length; bi++) {
    const block = content[bi];
    if (block._type !== 'block' || !Array.isArray(block.children)) continue;

    for (let ci = 0; ci < block.children.length; ci++) {
      const span = block.children[ci];
      if (span._type !== 'span' || typeof span.text !== 'string') continue;

      // Skip spans already marked as a link
      const hasLinkMark = (span.marks || []).some((m: string) =>
        (block.markDefs || []).some((d: any) => d._key === m && d._type === 'link')
      );
      if (hasLinkMark) continue;

      const idx = span.text.indexOf(term);
      if (idx === -1) continue;

      // Found — inject link
      const linkKey = mkKey();
      const newMarkDefs = [...(block.markDefs || []), { _type: 'link', _key: linkKey, href }];

      // Split span: [before][linked][after]
      const newChildren = [...block.children];
      const before = span.text.slice(0, idx);
      const after  = span.text.slice(idx + term.length);
      const replacement: any[] = [];

      if (before) replacement.push({ ...span, _key: mkKey('sp'), text: before });
      replacement.push({ _type: 'span', _key: mkKey('sp'), marks: [...(span.marks || []), linkKey], text: term });
      if (after)  replacement.push({ ...span, _key: mkKey('sp'), text: after, marks: span.marks || [] });

      newChildren.splice(ci, 1, ...replacement);

      const newContent = [...content];
      newContent[bi] = { ...block, markDefs: newMarkDefs, children: newChildren };

      alreadyLinkedTerms.add(term);
      return newContent;
    }
  }

  return null; // term not found in any block
}

async function patchPost(id: string, slug: string, terms: string[]): Promise<void> {
  const post = await client.fetch(
    `*[_type == 'blogPost' && slug.current == $slug][0]{ _id, content }`,
    { slug }
  );

  if (!post) {
    console.error(`  ✗ not found: ${slug}`);
    return;
  }

  let content: any[] = post.content || [];
  const linkedTerms = new Set<string>();
  const injected: string[] = [];

  for (const term of terms) {
    const url = LINK_MAP[term];
    if (!url) continue;
    const patched = injectLink(content, term, url, linkedTerms);
    if (patched) {
      content = patched;
      injected.push(term);
    } else {
      console.log(`  - "${term}" not found or already linked in ${slug}`);
    }
  }

  if (injected.length === 0) {
    console.log(`  ○ ${slug} — no changes`);
    return;
  }

  // Patch using the actual document _id (may be draft or published)
  await client.patch(post._id).set({ content }).commit();
  console.log(`  ✓ ${slug} — linked: ${injected.join(', ')}`);
}

async function main() {
  console.log('Injecting outbound links into Sanity blog posts...\n');

  for (const [slug, terms] of Object.entries(PATCH_PLAN)) {
    console.log(`→ ${slug}`);
    // Find the right doc (may exist as published or draft)
    const docs = await client.fetch(
      `*[_type == 'blogPost' && slug.current == $slug]{ _id }`,
      { slug }
    );
    if (!docs || docs.length === 0) {
      console.error(`  ✗ no document found for slug: ${slug}`);
      continue;
    }
    // Prefer published (no drafts. prefix), fall back to draft
    const published = docs.find((d: any) => !d._id.startsWith('drafts.'));
    const target = published || docs[0];
    await patchPost(target._id, slug, terms);
  }

  console.log('\nDone.');
}

main().catch((e) => { console.error(e); process.exit(1); });
