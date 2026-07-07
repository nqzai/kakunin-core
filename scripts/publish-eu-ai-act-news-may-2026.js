/**
 * KAKUN-73: Publish first EU AI Act Implementation News post (May 2026)
 * Series: Monthly update, published first week of each month
 *
 * Run: node scripts/publish-eu-ai-act-news-may-2026.js
 * Dry run: node scripts/publish-eu-ai-act-news-may-2026.js --dry-run
 */

const fs = require('fs');
const path = require('path');

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

// ── Post content ──────────────────────────────────────────────────────────────

const POST_MARKDOWN = `
The EU AI Act is now in active enforcement. For AI agent operators, May 2026 brings two significant developments: new guidance from the EU AI Office on audit logging requirements, and the first enforcement actions under the high-risk AI system provisions beginning to take shape in member states.

This is the first edition of our monthly EU AI Act Implementation Update — a concise brief for AI agent operators on what changed, what it means for your compliance posture, and what actions to take now.

## Enforcement Timeline: Where We Are

The EU AI Act entered application on 2 August 2024 for prohibited practices (Article 5). High-risk AI system requirements under Annex III — which cover AI systems used in critical infrastructure, financial services, employment decisions, and credit scoring — have a compliance deadline of **2 August 2026**.

That means operators of high-risk AI agents in financial services, healthcare, and public sector deployments have under three months before the full regulatory framework applies to their systems.

## What Changed in May 2026

**EU AI Office Guidance on Article 12 Audit Logs**

The EU AI Office published updated guidance clarifying what "logging capabilities" means under Article 12. The key clarification: log entries for high-risk AI systems must include sufficient data to attribute actions to a specific system instance — not just to a deployment or API credential.

This is directly relevant to multi-agent deployments. If you run multiple AI agent instances sharing a credential, your logs currently cannot prove which instance generated a specific output or took a specific action. The EU AI Office guidance names this as a gap that operators are expected to close before the August 2026 deadline.

**Member State Supervisory Authority Activity**

Three EU member states (Germany, France, and the Netherlands) have confirmed they will begin supervisory reviews of high-risk AI system deployments in Q3 2026. These reviews are expected to request audit trail documentation, incident response procedures, and evidence of human oversight mechanisms.

Operators without documented audit logging that meets Article 12 requirements will be asked to provide remediation plans within 30 days.

**Technical Standards Progress**

CEN-CENELEC technical committee TC 21 published a draft of the harmonised standard for high-risk AI systems. Key requirements for AI agent operators:

- Per-agent identity tracking in audit logs
- Documented revocation procedures for non-compliant agents
- Validity periods on agent operating authority (maximum 12 months before re-verification)

These align directly with the X.509 machine identity and behavioral monitoring approach that Kakunin implements.

## What Changed for AI Agent Operators

If you operate AI agents in any of the Annex III high-risk categories, three things require immediate attention:

**1. Per-agent identity in logs.** Log entries attributed to a shared API key do not satisfy the EU AI Office's Article 12 guidance. Each agent instance needs a unique, cryptographically verifiable identity so that actions can be attributed to the specific agent that took them.

**2. Documented revocation capability.** Supervisory authorities will ask: what happens when an agent behaves unexpectedly? You need a documented procedure for withdrawing agent operating authority, with evidence that it can be executed in a defined timeframe. Manual procedures may be accepted initially, but automated revocation will be expected for production deployments.

**3. Validity period controls.** The draft harmonised standard calls for maximum 12-month validity on AI agent operating authority. If you are using non-expiring API keys as agent credentials, you will need to migrate to time-bounded credentials before the standard becomes mandatory.

## Kakunin Compliance Angle

Kakunin addresses all three requirements through a single infrastructure layer:

- **Per-agent identity**: Each agent receives an X.509 machine identity (RSA-2048, AWS KMS) with a unique serial embedded in every audit log entry. Log attribution is cryptographic, not credential-based.
- **Automated revocation**: Behavioral risk score ≥0.85 triggers automatic revocation in under 60 seconds. Every revocation is logged in the WORM audit trail with the triggering evidence — exactly the documentation supervisory authorities will request.
- **365-day validity**: X.509 credentials expire by design. Annual renewal forces re-verification against the draft standard's 12-month requirement, with an audit log entry generated at every renewal.

[See the full compliance checklist →](https://www.kakunin.ai/docs/compliance-checklist)

## Internal Links

For deeper background:

- [MiCA Articles 70–72 deep dive](https://www.kakunin.ai/blog/mica-article-72-ai-agents) — how MiCA's financial services requirements map to AI agent compliance
- [EU AI Act enforcement architecture](https://www.kakunin.ai/docs/enforcement) — Kakunin's revocation and audit trail implementation

---

*Next edition: June 2026 EU AI Act Implementation Update — August enforcement deadline countdown, member state supervisory authority updates, and harmonised standard finalisation.*
`.trim();

const POST = {
  _type: 'blogPost',
  title: 'EU AI Act Implementation Update — May 2026',
  slug: { _type: 'slug', current: 'eu-ai-act-implementation-update-may-2026' },
  excerpt: 'EU AI Office clarifies Article 12 audit log requirements for agents. Member states begin supervisory reviews Q3 2026. What changed and what to do now.',
  publishedAt: '2026-05-30T08:00:00.000Z',
  author: 'Palash Bagchi',
  content: mdToPortableText(POST_MARKDOWN),
};

async function main() {
  console.log(`Publishing: "${POST.title}"`);
  console.log(`Slug: ${POST.slug.current}`);
  console.log(`Blocks: ${POST.content.length}`);
  console.log(`Excerpt length: ${POST.excerpt.length} chars`);

  if (process.argv.includes('--dry-run')) {
    console.log('\nContent preview (first 5 blocks):');
    POST.content.slice(0, 5).forEach((b, i) => {
      const text = (b.children || []).map(c => c.text || '').join('').substring(0, 100);
      console.log(`  [${i}] ${b.style}: ${text}${text.length >= 100 ? '...' : ''}`);
    });
    console.log('\nDry run — not published.');
    return;
  }

  // Check for existing post
  const existing = await client.fetch(
    `*[_type == "blogPost" && slug.current == "${POST.slug.current}"][0]{ _id }`,
  );
  if (existing) {
    console.log(`Post already exists (${existing._id}). Use --force to overwrite.`);
    if (!process.argv.includes('--force')) process.exit(0);
    await client.delete(existing._id);
    console.log('Deleted existing post.');
  }

  const result = await client.create(POST);
  console.log(`\nCreated: ${result._id}`);
  console.log('Add hero image in Sanity Studio, then publish.');
  console.log('Preview: https://www.kakunin.ai/blog/eu-ai-act-implementation-update-may-2026');
}

main().catch(err => { console.error(err); process.exit(1); });
