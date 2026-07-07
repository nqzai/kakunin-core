const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@sanity/client');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const env = { ...process.env };

  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
      if (!match) continue;
      env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return env;
}

const env = loadEnv();

const client = createClient({
  projectId: env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: env.SANITY_API_TOKEN,
});

const draftsDir = path.join(process.cwd(), 'docs', 'ai-governance-drafts');

const posts = [
  {
    file: 'shadow-ai-enterprise.md',
    id: 'drafts.blog-shadow-ai-enterprise',
    title: 'How to Secure Shadow AI in Your Enterprise Without Compromising Innovation',
    slug: 'how-to-secure-shadow-ai-in-your-enterprise-without-compromising-innovation',
    excerpt:
      'A practical framework for containing shadow AI with identity, policy, and safe enablement rather than blunt-force bans that stall innovation.',
    tags: ['architecture', 'agent-security', 'compliance', 'identity'],
  },
  {
    file: 'ai-identity-governance-at-scale.md',
    id: 'drafts.blog-ai-identity-governance-at-scale',
    title: '5 Steps to Implement AI Identity Governance at Scale',
    slug: '5-steps-to-implement-ai-identity-governance-at-scale',
    excerpt:
      'A five-step operating model for inventorying, authenticating, scoping, monitoring, and revoking AI identities across the modern enterprise.',
    tags: ['identity', 'architecture', 'agent-security', 'api'],
  },
  {
    file: 'hidden-risks-unmanaged-ai-agents.md',
    id: 'drafts.blog-hidden-risks-unmanaged-ai-agents',
    title: 'The Hidden Risks of Unmanaged AI Agents: A Security Perspective',
    slug: 'the-hidden-risks-of-unmanaged-ai-agents-a-security-perspective',
    excerpt:
      'Why unmanaged AI agents create a larger attack surface than most teams realize, and what security leaders should instrument before autonomy scales.',
    tags: ['agent-security', 'architecture', 'audit-log', 'compliance'],
  },
  {
    file: 'ai-identity-management-financial-services.md',
    id: 'drafts.blog-ai-identity-management-financial-services',
    title: 'AI Identity Management Challenges in Financial Services: A Case Study',
    slug: 'ai-identity-management-challenges-in-financial-services-a-case-study',
    excerpt:
      'A realistic case study of how financial institutions can move from shared credentials and weak auditability toward agent-grade identity controls.',
    tags: ['identity', 'compliance', 'architecture', 'certificates'],
  },
  {
    file: 'saviynt-vs-kakunin.md',
    id: 'drafts.blog-saviynt-vs-kakunin',
    title: 'Saviynt vs. Kakunin: Evaluating AI Security Platforms for Modern Enterprises',
    slug: 'saviynt-vs-kakunin-evaluating-ai-security-platforms-for-modern-enterprises',
    excerpt:
      'A grounded comparison of Saviynt and Kakunin through the lens of AI identity, runtime control, evidence, and enterprise deployment realities.',
    tags: ['identity', 'architecture', 'agent-security', 'compliance'],
  },
];

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

function createSpan(text, marks = []) {
  return { _type: 'span', _key: nextKey(), text, marks };
}

function parseInline(text) {
  const children = [];
  const markDefs = [];
  const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      children.push(createSpan(text.slice(lastIndex, match.index)));
    }

    const markKey = nextKey();
    markDefs.push({
      _key: markKey,
      _type: 'link',
      href: match[2],
      blank: true,
    });
    children.push(createSpan(match[1], [markKey]));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    children.push(createSpan(text.slice(lastIndex)));
  }

  if (children.length === 0) {
    children.push(createSpan(text));
  }

  return { children, markDefs };
}

function createBlock(style, text, extra = {}) {
  const { children, markDefs } = parseInline(text);
  return {
    _type: 'block',
    _key: nextKey(),
    style,
    children,
    markDefs,
    ...extra,
  };
}

function markdownToPortableText(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (line.startsWith('# ')) {
      blocks.push(createBlock('h2', line.slice(2).trim()));
      i += 1;
      continue;
    }

    if (line.startsWith('## ')) {
      blocks.push(createBlock('h2', line.slice(3).trim()));
      i += 1;
      continue;
    }

    if (line.startsWith('### ')) {
      blocks.push(createBlock('h3', line.slice(4).trim()));
      i += 1;
      continue;
    }

    if (line.startsWith('> ')) {
      blocks.push(createBlock('blockquote', line.slice(2).trim()));
      i += 1;
      continue;
    }

    if (line.startsWith('- ')) {
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        blocks.push(createBlock('normal', lines[i].trim().slice(2).trim(), { listItem: 'bullet', level: 1 }));
        i += 1;
      }
      continue;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        blocks.push(createBlock('normal', lines[i].trim().replace(/^\d+\.\s/, ''), { listItem: 'number', level: 1 }));
        i += 1;
      }
      continue;
    }

    const paragraphLines = [line.trim()];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].trim().startsWith('- ') &&
      !/^\d+\.\s/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith('> ')
    ) {
      paragraphLines.push(lines[i].trim());
      i += 1;
    }
    blocks.push(createBlock('normal', paragraphLines.join(' ')));
  }

  return blocks;
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  if (!env.NEXT_PUBLIC_SANITY_PROJECT_ID || !env.NEXT_PUBLIC_SANITY_DATASET || !env.SANITY_API_TOKEN) {
    throw new Error('Missing Sanity environment variables. Expected NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, and SANITY_API_TOKEN.');
  }

  for (const post of posts) {
    const filePath = path.join(draftsDir, post.file);
    const markdown = fs.readFileSync(filePath, 'utf8');
    const words = wordCount(markdown);

    if (words < 2500) {
      throw new Error(`${post.file} is only ${words} words. Each draft must be at least 2500 words.`);
    }

    const doc = {
      _id: post.id,
      _type: 'blogPost',
      title: post.title,
      slug: { _type: 'slug', current: post.slug },
      excerpt: post.excerpt,
      author: 'Kakunin Team',
      publishedAt: new Date().toISOString(),
      tags: post.tags,
      content: markdownToPortableText(markdown),
    };

    const result = await client.createOrReplace(doc);
    console.log(`Created draft: ${result._id} (${post.slug}) — ${words} words`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
