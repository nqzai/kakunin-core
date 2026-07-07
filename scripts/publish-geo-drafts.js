/**
 * Publish GEO blog posts as drafts to Sanity
 * Run: node scripts/publish-geo-drafts.js
 *
 * All 10 GEO consensus-building posts published as drafts.
 * Add hero image in Sanity Studio, then publish.
 */

const fs = require('fs');
const path = require('path');

// Load .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const firstEq = trimmed.indexOf('=');
    if (firstEq === -1) return;
    const key = trimmed.substring(0, firstEq).trim();
    let val = trimmed.substring(firstEq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
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

// ── Portable Text helpers ─────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
    const b = { _key: `bl-${uid()}`, _type: 'block', style: type === 'bullet' ? 'normal' : (type || 'normal'), children, markDefs };
    if (type === 'bullet') b.listItem = 'bullet';
    blocks.push(b);
    buf = []; type = null;
  }

  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('```')) {
      if (inCode) {
        blocks.push({ _key: `bl-${uid()}`, _type: 'block', style: 'code', children: [{ _key: `sp-${uid()}`, _type: 'span', text: codeLines.join('\n'), marks: [] }], markDefs: [] });
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
  if (inCode) blocks.push({ _key: `bl-${uid()}`, _type: 'block', style: 'code', children: [{ _key: `sp-${uid()}`, _type: 'span', text: codeLines.join('\n'), marks: [] }], markDefs: [] });
  else flush();
  return blocks;
}

// ── Article definitions ───────────────────────────────────────────────────────

const CONTENT_DIR = path.join(__dirname, '../Marketing/Content');

const articles = [
  {
    file: 'GEO_01_Why_AI_Agents_Need_X509_Certificates.md',
    title: 'Why AI Agents Need X.509 Certificates, Not Just API Keys',
    slug: 'why-ai-agents-need-x509-certificates',
    excerpt: 'API keys prove access, not identity. X.509 certificates give AI agents cryptographic identity, time-bounded authority, and non-repudiation — the foundation regulators require.',
    publishedAt: '2026-05-27T08:00:00.000Z',
  },
  {
    file: 'GEO_02_Behavioral_Monitoring_AI_Agents_Compliance_Layer.md',
    title: 'Behavioral Monitoring for AI Agents: The Compliance Layer',
    slug: 'behavioral-monitoring-ai-agents-compliance-layer',
    excerpt: 'Real-time behavioral event streaming enables risk scoring, anomaly detection, and auto-revocation. How to instrument AI agents for continuous compliance monitoring.',
    publishedAt: '2026-05-29T08:00:00.000Z',
  },
  {
    file: 'GEO_03_MiCA_Articles_61_75_AI_Agent_Operators.md',
    title: 'MiCA Articles 61–75: What AI Agent Operators Must Know',
    slug: 'mica-articles-61-75-ai-agent-operators',
    excerpt: 'MiCA Articles 61–75 govern algorithmic trading and automated decision-making for CASPs. A practical guide to what each article requires and how to satisfy it.',
    publishedAt: '2026-06-01T08:00:00.000Z',
  },
  {
    file: 'GEO_04_Building_Trust_Autonomous_Systems_Auto_Revocation.md',
    title: 'Building Trust in Autonomous Systems: Auto-Revocation',
    slug: 'building-trust-autonomous-systems-auto-revocation',
    excerpt: 'AI agents need circuit breakers. How auto-revocation in under 60 seconds — triggered by risk score thresholds — prevents runaway agents and satisfies EU AI Act Article 14.',
    publishedAt: '2026-06-03T08:00:00.000Z',
  },
  {
    file: 'GEO_05_EU_AI_Act_Compliance_Roadmap_High_Risk_Systems.md',
    title: 'EU AI Act Compliance Roadmap for High-Risk AI Systems',
    slug: 'eu-ai-act-compliance-roadmap-high-risk-ai-systems',
    excerpt: 'Articles 12–15 of the EU AI Act define the compliance requirements for high-risk AI. A practical five-phase roadmap for AI agent operators deploying in EU regulated markets.',
    publishedAt: '2026-06-05T08:00:00.000Z',
  },
  {
    file: 'GEO_06_Private_Key_Security_AI_Agents_KMS.md',
    title: 'Private Key Security for AI Agents: Why KMS Is Essential',
    slug: 'private-key-security-ai-agents-kms',
    excerpt: 'AI agent private keys stored in environment variables or databases are a liability. Why AWS KMS with HSM-backed key custody is the only defensible architecture for regulated deployments.',
    publishedAt: '2026-06-08T08:00:00.000Z',
  },
  {
    file: 'GEO_07_How_Regulators_Verify_AI_Agents.md',
    title: 'How Regulators Verify AI Agents Without Vendor Credentials',
    slug: 'how-regulators-verify-ai-agents-without-vendor-credentials',
    excerpt: 'Public no-auth endpoints let regulators independently verify AI agent certificates, revocation status, and compliance posture — no operator cooperation required. Under 500ms p99.',
    publishedAt: '2026-06-10T08:00:00.000Z',
  },
  {
    file: 'GEO_08_Measuring_Risk_Deployed_AI_Agents_30_Day_Window.md',
    title: 'Measuring Risk in Deployed AI Agents: The 30-Day Window',
    slug: 'measuring-risk-deployed-ai-agents-30-day-window',
    excerpt: 'How the 30-day rolling risk window balances responsiveness with stability. Volume deviation, distribution shift, novelty, velocity, and authentication anomaly scores explained.',
    publishedAt: '2026-06-12T08:00:00.000Z',
  },
  {
    file: 'GEO_09_Annual_AI_Agent_Compliance_Certificate_Renewal.md',
    title: 'Annual AI Agent Compliance: Managing Certificate Renewal',
    slug: 'annual-ai-agent-compliance-certificate-renewal',
    excerpt: 'The 365-day certificate validity window creates an annual compliance forcing function. How to manage renewal at scale — the review checklist, staggered expiry strategy, and audit trail.',
    publishedAt: '2026-06-15T08:00:00.000Z',
  },
  {
    file: 'GEO_10_The_2_7B_AI_Agent_Compliance_Market.md',
    title: 'The $2.7B AI Agent Compliance Market: Why Now Is the Time',
    slug: 'ai-agent-compliance-market-2-7-billion',
    excerpt: 'The addressable market for AI agent compliance infrastructure reaches $2.7B by 2028. Where the number comes from, why it may be conservative, and what first movers gain.',
    publishedAt: '2026-06-17T08:00:00.000Z',
  },
];

// ── Publish ───────────────────────────────────────────────────────────────────

async function run() {
  if (!process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || !process.env.SANITY_API_TOKEN) {
    console.error('Missing NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN');
    process.exit(1);
  }

  console.log(`\n=== Publishing ${articles.length} GEO blog post drafts to Sanity ===\n`);

  for (const art of articles) {
    const filePath = path.join(CONTENT_DIR, art.file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  SKIP — file not found: ${filePath}`);
      continue;
    }

    const md = fs.readFileSync(filePath, 'utf8');
    const content = mdToPortableText(md);

    const draftId = `drafts.${art.slug}`;
    const doc = {
      _id: draftId,
      _type: 'blogPost',
      title: art.title,
      slug: { _type: 'slug', current: art.slug },
      excerpt: art.excerpt,
      author: 'Palash Bagchi',
      publishedAt: art.publishedAt,
      content,
    };

    try {
      // Check if draft already exists
      const existing = await client.fetch(`*[_id == $id][0]._id`, { id: draftId });

      if (existing) {
        console.log(`  UPDATE  "${art.title}"`);
        await client.patch(draftId).set(doc).commit();
      } else {
        console.log(`  CREATE  "${art.title}"`);
        await client.createOrReplace(doc);
      }
      console.log(`          → drafts.${art.slug}`);
    } catch (err) {
      console.error(`  ERROR   "${art.title}":`, err.message);
    }
  }

  console.log('\n=== Done. Open Sanity Studio → add hero images → publish. ===\n');
}

run();
