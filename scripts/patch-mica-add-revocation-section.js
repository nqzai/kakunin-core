/**
 * KAKUN-71: Add auto-revocation + Kakunin CTA section to MiCA Art.72 blog post
 * Appends a new "Automatic Revocation as MiCA Article 72 Compliance" section
 *
 * Run: node scripts/patch-mica-add-revocation-section.js
 * Dry run: node scripts/patch-mica-add-revocation-section.js --dry-run
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

function span(text, marks = []) {
  return { _key: `sp-${uid()}`, _type: 'span', text, marks };
}

function block(style, children, listItem, markDefs = []) {
  const b = { _key: `bl-${uid()}`, _type: 'block', style, children, markDefs };
  if (listItem) b.listItem = listItem;
  return b;
}

function linkSpan(text, href) {
  const linkKey = `lnk-${uid()}`;
  return {
    markDefs: [{ _key: linkKey, _type: 'link', href }],
    spans: [span(text, [linkKey])],
  };
}

function normalBlock(...parts) {
  const children = [];
  const markDefs = [];
  for (const part of parts) {
    if (typeof part === 'string') {
      children.push(span(part));
    } else if (part.spans) {
      children.push(...part.spans);
      markDefs.push(...part.markDefs);
    }
  }
  return { ...block('normal', children, null, markDefs) };
}

// ── New section blocks ────────────────────────────────────────────────────────

const newSection = [
  // H2 heading
  block('h2', [span('Automatic Revocation as MiCA Article 72 Compliance')], null),

  // Para 1: framing
  normalBlock(
    'MiCA Article 72 does not merely recommend that AI agent operators monitor risk — it requires the operational capability to withdraw agent authority when risk conditions are met. ',
    'The word "capability" is key: regulators are not asking for a post-incident report. They are asking for a system that can act ',
    span('before', ['em']),
    ' a harmful transaction completes.',
  ),

  // Para 2: Kakunin auto-revocation
  normalBlock(
    'Kakunin implements this requirement directly. When an AI agent\'s rolling 30-day behavioral risk score reaches 0.85, the platform revokes the agent\'s X.509 machine identity automatically — no human approval required. The revocation is written to the public Certificate Revocation List within seconds. Any gateway calling ',
    span('GET /api/v1/verify/{serial}', ['code']),
    ' on the next inbound request from that agent will receive a revoked status and return a 403. Total time from risk threshold breach to first blocked request: under 60 seconds.',
  ),

  // Para 3: WORM audit trail
  normalBlock(
    'Every revocation event is written to Kakunin\'s append-only WORM audit log with the following data: the triggering risk score, the timestamp of threshold breach, the affected agent\'s machine identity serial, the operator tenant, and the full behavioral event history that produced the score. This creates the regulator-accessible audit trail that Article 72 compliance demonstrations require — not a dashboard screenshot, but a cryptographically tamper-evident record that the authority withdrawal happened, when it happened, and why.',
  ),

  // Para 4: pre-revocation warning
  normalBlock(
    'For operators who want a human-review window before automatic revocation, Kakunin also fires a pre-revocation warning at risk score 0.75. This warning is pushed to ',
    span('/api/v1/notifications', ['code']),
    ' and delivered via webhook, giving the operations team a 10-point risk buffer to investigate the anomaly, determine whether it is a bug or a genuine threat, and either remediate or manually revoke before the automatic threshold is reached. The pre-revocation warning is itself logged, creating a documented audit trail of the operator\'s review decision.',
  ),

  // Para 5: CTA
  normalBlock(
    'See how Kakunin implements the full Article 72 auto-revocation pipeline — including behavioral risk scoring, threshold configuration, and WORM audit trail — in the ',
    ...(() => {
      const l = linkSpan('enforcement documentation', 'https://www.kakunin.ai/docs/enforcement');
      return l.spans.map ? [{ spans: l.spans, markDefs: l.markDefs }] : [l];
    })(),
    '.',
  ),
];

// Flatten the CTA paragraph (special case for link spans)
const ctaChildren = [];
const ctaMarkDefs = [];

const ctaLinkKey = `lnk-${uid()}`;
ctaMarkDefs.push({ _key: ctaLinkKey, _type: 'link', href: 'https://www.kakunin.ai/docs/enforcement' });

ctaChildren.push(span('See how Kakunin implements the full Article 72 auto-revocation pipeline — including behavioral risk scoring, threshold configuration, and WORM audit trail — in the '));
ctaChildren.push(span('enforcement documentation', [ctaLinkKey]));
ctaChildren.push(span('.'));

// Replace the last normalBlock (para 5) with correctly constructed link block
newSection[newSection.length - 1] = {
  _key: `bl-${uid()}`,
  _type: 'block',
  style: 'normal',
  children: ctaChildren,
  markDefs: ctaMarkDefs,
};

async function main() {
  console.log('Fetching blog post: mica-article-72-ai-agents');

  const doc = await client.fetch(
    `*[_type == "blogPost" && slug.current == "mica-article-72-ai-agents"][0]{ _id, title, content }`,
  );

  if (!doc) {
    console.error('Post not found. Trying alternate slug...');
    // Try the GEO slug
    const doc2 = await client.fetch(
      `*[_type == "blogPost" && (slug.current match "*mica*" || slug.current match "*article-72*")][0]{ _id, title, slug, content }`,
    );
    if (doc2) {
      console.log(`Found post: ${doc2.slug.current} (${doc2._id})`);
    } else {
      console.error('No MiCA post found. Check Sanity for the correct slug.');
      process.exit(1);
    }
  }

  const target = doc;
  const wordsBefore = (target.content || [])
    .filter(b => b._type === 'block')
    .flatMap(b => (b.children || []).map(c => c.text || ''))
    .join(' ')
    .split(/\s+/).filter(Boolean).length;

  console.log(`Found: "${target.title}" (${target._id})`);
  console.log(`Current word count: ~${wordsBefore}`);
  console.log(`Appending ${newSection.length} blocks (~250 words)`);

  if (process.argv.includes('--dry-run')) {
    console.log('\nNew section blocks:');
    newSection.forEach((b, i) => {
      const text = (b.children || []).map(c => c.text || '').join('');
      console.log(`  [${i}] ${b.style}: ${text.substring(0, 80)}${text.length > 80 ? '...' : ''}`);
    });
    console.log('\nDry run — no changes written.');
    return;
  }

  console.log('\nPatching Sanity document...');
  await client
    .patch(target._id)
    .set({ content: [...(target.content || []), ...newSection] })
    .commit();

  console.log('Done.');
  console.log('Verify at: https://www.kakunin.ai/blog/mica-article-72-ai-agents');
}

main().catch(err => { console.error(err); process.exit(1); });
