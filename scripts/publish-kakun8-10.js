/**
 * Publish KAKUN-8 and KAKUN-10 blog posts as drafts to Sanity
 * Run: node scripts/publish-kakun8-10.js
 *
 * KAKUN-8: EU AI Act whitepaper for autonomous agent operators
 * KAKUN-10: LangChain + Kakunin scope enforcement tutorial
 *
 * Posts published as drafts — add hero image in Sanity Studio before publishing.
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return;
    const eq = t.indexOf('=');
    if (eq === -1) return;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    process.env[k] = v;
  });
}

const { createClient } = require('@sanity/client');

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_TOKEN) {
  console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN in .env.local');
  process.exit(1);
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyMark(tokens, re, mark) {
  const out = [];
  for (const tok of tokens) {
    if (tok.marks.includes('code')) { out.push(tok); continue; }
    let last = 0; let m; re.lastIndex = 0; let hit = false;
    while ((m = re.exec(tok.text)) !== null) {
      hit = true;
      if (m.index > last) out.push({ text: tok.text.slice(last, m.index), marks: [...tok.marks] });
      out.push({ text: m[1], marks: [...tok.marks, mark] });
      last = re.lastIndex;
    }
    if (hit) { if (last < tok.text.length) out.push({ text: tok.text.slice(last), marks: [...tok.marks] }); }
    else out.push(tok);
  }
  return out;
}

function parseInlineSpans(text, markDefs = []) {
  let tokens = [{ text, marks: [] }];
  tokens = applyMark(tokens, /\*\*([^*]+)\*\*/g, 'strong');
  tokens = applyMark(tokens, /(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, 'em');
  tokens = applyMark(tokens, /`([^`]+)`/g, 'code');

  const result = [];
  for (const tok of tokens) {
    if (tok.marks.includes('code')) { result.push(tok); continue; }
    const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
    let last = 0; let m; const t = tok.text; let hit = false;
    while ((m = linkRe.exec(t)) !== null) {
      hit = true;
      if (m.index > last) result.push({ text: t.slice(last, m.index), marks: [...tok.marks] });
      const key = `lnk-${uid()}`;
      markDefs.push({ _key: key, _type: 'link', href: m[2] });
      result.push({ text: m[1], marks: [...tok.marks, key] });
      last = linkRe.lastIndex;
    }
    if (hit) { if (last < t.length) result.push({ text: t.slice(last), marks: [...tok.marks] }); }
    else result.push(tok);
  }

  return result.map(t => ({ _key: `sp-${uid()}`, _type: 'span', text: t.text, marks: t.marks }));
}

function mdToPortableText(md) {
  const lines = md.split(/\r?\n/);
  const blocks = [];
  let type = null;
  let buf = [];
  let inCode = false;
  let codeLines = [];

  function flush() {
    if (!buf.length) return;
    const raw = buf.join('\n').trim();
    if (!raw) { buf = []; type = null; return; }
    const markDefs = [];
    const children = parseInlineSpans(raw, markDefs);
    const b = {
      _key: `bl-${uid()}`,
      _type: 'block',
      style: type === 'bullet' ? 'normal' : (type || 'normal'),
      children,
      markDefs,
    };
    if (type === 'bullet') b.listItem = 'bullet';
    blocks.push(b);
    buf = []; type = null;
  }

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) {
      if (inCode) {
        blocks.push({
          _key: `bl-${uid()}`,
          _type: 'block',
          style: 'code',
          children: [{ _key: `sp-${uid()}`, _type: 'span', text: codeLines.join('\n'), marks: [] }],
          markDefs: [],
        });
        codeLines = []; inCode = false;
      } else { flush(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }
    if (!t) { flush(); continue; }
    if (t.startsWith('## ')) { flush(); type = 'h2'; buf.push(t.slice(3).trim()); flush(); }
    else if (t.startsWith('### ')) { flush(); type = 'h3'; buf.push(t.slice(4).trim()); flush(); }
    else if (t.startsWith('> ')) { flush(); type = 'blockquote'; buf.push(t.slice(2).trim()); }
    else if (/^[-*] /.test(t)) { flush(); type = 'bullet'; buf.push(t.slice(2).trim()); flush(); }
    else { if (type !== 'normal' && type !== 'blockquote') { flush(); type = 'normal'; } buf.push(line); }
  }

  if (inCode) {
    blocks.push({
      _key: `bl-${uid()}`,
      _type: 'block',
      style: 'code',
      children: [{ _key: `sp-${uid()}`, _type: 'span', text: codeLines.join('\n'), marks: [] }],
      markDefs: [],
    });
  } else {
    flush();
  }
  return blocks;
}

const CONTENT_DIR = path.join(__dirname, '../Marketing/Content');

const articles = [
  {
    file: 'EU_AI_Act_Compliance_Autonomous_Agents_Whitepaper.md',
    title: 'Navigating EU AI Act Compliance for Autonomous Agents',
    slug: 'eu-ai-act-compliance-autonomous-agents',
    excerpt: 'A technical guide to Articles 9–15 of the EU AI Act for AI agent operators: audit logging, risk management, human oversight, and conformity assessment — with implementation patterns.',
    author: 'Palash Bagchi',
    publishedAt: '2026-05-27T09:00:00.000Z',
  },
  {
    file: 'Securing_LangChain_Agent_Tools_Kakunin.md',
    title: 'Securing LangChain Agent Tools with Kakunin',
    slug: 'securing-langchain-agent-tools-kakunin',
    excerpt: 'Step-by-step tutorial: add cryptographic scope enforcement to LangChain tool calls using KakuninToolGuard. Block scope violations before execution. Emit audit events per EU AI Act Art. 12.',
    author: 'Palash Bagchi',
    publishedAt: '2026-05-29T09:00:00.000Z',
  },
];

async function run() {
  console.log('=== Publishing KAKUN-8 and KAKUN-10 drafts to Sanity ===\n');

  for (const article of articles) {
    const filePath = path.join(CONTENT_DIR, article.file);
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      continue;
    }

    console.log(`Processing: "${article.title}"...`);
    const markdown = fs.readFileSync(filePath, 'utf8');
    const content = mdToPortableText(markdown);

    const draftId = `drafts.${article.slug}`;
    const doc = {
      _id: draftId,
      _type: 'blogPost',
      title: article.title,
      slug: { _type: 'slug', current: article.slug },
      excerpt: article.excerpt,
      author: article.author,
      publishedAt: article.publishedAt,
      content,
    };

    const existing = await client.fetch(`*[_id == $id][0]`, { id: draftId });

    if (existing) {
      await client.createOrReplace(doc);
      console.log(`  ✓ Updated draft: ${draftId}`);
    } else {
      await client.create(doc);
      console.log(`  ✓ Created draft: ${draftId}`);
    }

    console.log(`  → Add hero image in Sanity Studio, then publish.\n`);
  }

  console.log('Done. Both posts are in Sanity Studio as drafts.');
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
