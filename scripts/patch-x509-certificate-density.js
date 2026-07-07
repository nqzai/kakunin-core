/**
 * KAKUN-70: Reduce "certificate" keyword density in X.509 blog post
 * Target: certificate ≤1.2%, add "non-human identity" ≥2x, boost "machine identity"
 *
 * Run: node scripts/patch-x509-certificate-density.js
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

// Replacement map: [pattern, replacement, maxReplacements]
// Ordered from most to least specific — run in order so we don't double-replace
const REPLACEMENTS = [
  // "certificates" plural → synonyms
  ['AI agent certificates', 'AI agent machine identities', 3],
  ['X.509 certificates are', 'X.509 credentials are', 2],
  ['X.509 certificates and', 'X.509 credentials and', 2],
  ['X.509 certificates that', 'X.509 credentials that', 1],
  ['presents a certificate', 'presents a machine identity credential', 2],
  ['holding an X.509 certificate', 'holding an X.509 machine identity', 1],
  ['agent\'s certificate identity', 'agent\'s machine identity', 2],
  ['certificate material', 'credential material', 2],
  ['certificate serial', 'machine identity serial', 2],
  // "certificate" singular → synonyms in specific contexts
  ['a certificate is issued', 'a machine identity credential is issued', 1],
  ['certificate contains a subject', 'credential contains a subject', 1],
  ['certificate can carry extensions', 'credential can carry extensions', 1],
  ['certificate is revoked', 'credential is revoked', 2],
  ['certificate was revoked', 'credential was revoked', 1],
  ['verify the certificate', 'verify the machine identity', 2],
  ['presents the certificate', 'presents the machine identity', 1],
  ['certificate into its TLS', 'machine identity credential into its TLS', 1],
  ['their certificate', 'their machine identity', 1],
  // Additional reductions to hit ≤1.2%
  ['the certificate is valid', 'the machine identity is valid', 1],
  ['agent\'s certificate', 'agent\'s non-human identity credential', 2],
  ['the certificate PEM', 'the identity credential PEM', 1],
  // Add "non-human identity" (currently 0, target ≥2) — covered by above replacements
  // Extra explicit injection for NHI term
  ['cryptographic identity for AI agents', 'non-human identity (NHI) infrastructure for AI agents', 1],
  ['AI agent identity does not require', 'non-human identity (NHI) migration does not require', 1],
];

function applyReplacement(text, pattern, replacement, maxCount) {
  let count = 0;
  let result = text;
  const lower = pattern.toLowerCase();
  while (count < maxCount) {
    const idx = result.toLowerCase().indexOf(lower);
    if (idx === -1) break;
    // Preserve original casing of first char if pattern starts uppercase
    const actualMatch = result.substring(idx, idx + pattern.length);
    const rep = actualMatch[0] === actualMatch[0].toUpperCase() && pattern[0] === pattern[0].toLowerCase()
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
    result = result.substring(0, idx) + rep + result.substring(idx + actualMatch.length);
    count++;
  }
  return { text: result, replaced: count };
}

function countOccurrences(text, word) {
  const re = new RegExp(`\\b${word}\\b`, 'gi');
  return (text.match(re) || []).length;
}

function extractAllText(blocks) {
  return blocks
    .filter(b => b._type === 'block')
    .flatMap(b => (b.children || []).map(c => c.text || ''))
    .join(' ');
}

function patchSpanText(span, replacements) {
  let text = span.text || '';
  let totalReplaced = 0;
  for (const [pattern, replacement, maxCount] of replacements) {
    const { text: newText, replaced } = applyReplacement(text, pattern, replacement, maxCount);
    text = newText;
    totalReplaced += replaced;
  }
  return { ...span, text };
}

// Track remaining quota per replacement across all blocks
function patchBlocks(blocks, replacements) {
  const quota = replacements.map(([, , max]) => max);
  const used = replacements.map(() => 0);

  return blocks.map(block => {
    if (block._type !== 'block') return block;
    const children = (block.children || []).map(child => {
      if (child._type !== 'span') return child;
      let text = child.text || '';
      for (let i = 0; i < replacements.length; i++) {
        if (used[i] >= quota[i]) continue;
        const remaining = quota[i] - used[i];
        const [pattern, replacement] = replacements[i];
        const { text: newText, replaced } = applyReplacement(text, pattern, replacement, remaining);
        text = newText;
        used[i] += replaced;
      }
      return { ...child, text };
    });
    return { ...block, children };
  });
}

async function main() {
  console.log('Fetching blog post: why-ai-agents-need-x509-certificates');

  const doc = await client.fetch(
    `*[_type == "blogPost" && slug.current == "why-ai-agents-need-x509-certificates"][0]{ _id, title, content }`,
  );

  if (!doc) {
    console.error('Post not found. Check slug.');
    process.exit(1);
  }

  const allText = extractAllText(doc.content || []);
  const wordCount = allText.split(/\s+/).filter(Boolean).length;
  const certCountBefore = countOccurrences(allText, 'certificate');
  const nhiCountBefore = countOccurrences(allText, 'non-human identity');
  const machineCountBefore = countOccurrences(allText, 'machine identity');

  console.log(`\nBEFORE:`);
  console.log(`  Words: ${wordCount}`);
  console.log(`  "certificate": ${certCountBefore} (${((certCountBefore / wordCount) * 100).toFixed(2)}%)`);
  console.log(`  "non-human identity": ${nhiCountBefore}`);
  console.log(`  "machine identity": ${machineCountBefore}`);

  const patchedContent = patchBlocks(doc.content || [], REPLACEMENTS);

  const allTextAfter = extractAllText(patchedContent);
  const certCountAfter = countOccurrences(allTextAfter, 'certificate');
  const nhiCountAfter = countOccurrences(allTextAfter, 'non-human identity');
  const machineCountAfter = countOccurrences(allTextAfter, 'machine identity');

  console.log(`\nAFTER:`);
  console.log(`  "certificate": ${certCountAfter} (${((certCountAfter / wordCount) * 100).toFixed(2)}%)`);
  console.log(`  "non-human identity": ${nhiCountAfter}`);
  console.log(`  "machine identity": ${machineCountAfter}`);

  const certDensityAfter = (certCountAfter / wordCount) * 100;
  if (certDensityAfter > 1.5) {
    console.warn(`\nWARNING: "certificate" density ${certDensityAfter.toFixed(2)}% still above 1.5%. More replacements needed.`);
  }

  if (process.argv.includes('--dry-run')) {
    console.log('\nDry run — no changes written to Sanity.');
    return;
  }

  console.log(`\nPatching Sanity document ${doc._id}...`);
  await client.patch(doc._id).set({ content: patchedContent }).commit();
  console.log('Done. Verify at https://www.kakunin.ai/blog/why-ai-agents-need-x509-certificates');
}

main().catch(err => { console.error(err); process.exit(1); });
