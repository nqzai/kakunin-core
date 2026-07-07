const fs = require('fs');
const path = require('path');

// Custom env loader
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

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error('Error: NEXT_PUBLIC_SANITY_PROJECT_ID or SANITY_API_TOKEN is missing in .env.local');
  process.exit(1);
}

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  token,
});

// parseInlineSpans and markdownToPortableText are redefined below (avoiding eval or dynamic require)

function parseInlineSpans(text, markDefs = []) {
  let tokens = [{ text, marks: [] }];
  tokens = parseRegexTokens(tokens, /\*\*([^*]+)\*\*/g, 'strong');
  tokens = parseRegexTokens(tokens, /\*([^*]+)\*/g, 'em');
  tokens = parseRegexTokens(tokens, /`([^`]+)`/g, 'code');

  let linkIndex = markDefs.length;
  const processedTokens = [];
  
  for (const token of tokens) {
    if (token.marks.includes('code')) {
      processedTokens.push(token);
      continue;
    }
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;
    const tText = token.text;
    let matched = false;

    while ((match = linkRegex.exec(tText)) !== null) {
      matched = true;
      const matchIndex = match.index;
      const linkText = match[1];
      const linkUrl = match[2];
      const markKey = `link-${linkIndex++}`;

      if (matchIndex > lastIndex) {
        processedTokens.push({ text: tText.substring(lastIndex, matchIndex), marks: [...token.marks] });
      }
      markDefs.push({ _key: markKey, _type: 'link', href: linkUrl });
      processedTokens.push({ text: linkText, marks: [...token.marks, markKey] });
      lastIndex = linkRegex.lastIndex;
    }

    if (matched) {
      if (lastIndex < tText.length) {
        processedTokens.push({ text: tText.substring(lastIndex), marks: [...token.marks] });
      }
    } else {
      processedTokens.push(token);
    }
  }

  return processedTokens.map((t, idx) => ({
    _key: `span-${idx}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    _type: 'span',
    text: t.text,
    marks: t.marks
  }));
}

function parseRegexTokens(tokens, regex, mark) {
  const result = [];
  for (const token of tokens) {
    if (token.marks.length > 0 && token.marks.includes('code')) {
      result.push(token);
      continue;
    }
    let lastIndex = 0;
    let match;
    const text = token.text;
    regex.lastIndex = 0;
    let matched = false;
    
    while ((match = regex.exec(text)) !== null) {
      matched = true;
      const matchIndex = match.index;
      const innerText = match[1];
      
      if (matchIndex > lastIndex) {
        result.push({ text: text.substring(lastIndex, matchIndex), marks: [...token.marks] });
      }
      result.push({ text: innerText, marks: [...token.marks, mark] });
      lastIndex = regex.lastIndex;
    }
    
    if (matched) {
      if (lastIndex < text.length) {
        result.push({ text: text.substring(lastIndex), marks: [...token.marks] });
      }
    } else {
      result.push(token);
    }
  }
  return result;
}

function markdownToPortableText(markdown) {
  const lines = markdown.split(/\r?\n/);
  const portableText = [];
  let inCodeBlock = false;
  let codeLines = [];
  let currentBlockType = null;
  let currentBlockLines = [];

  function commitCurrentBlock() {
    if (currentBlockLines.length === 0) return;
    const blockText = currentBlockLines.join('\n').trim();
    if (!blockText) {
      currentBlockLines = [];
      return;
    }
    const markDefs = [];
    const children = parseInlineSpans(blockText, markDefs);
    const block = {
      _key: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      _type: 'block',
      style: currentBlockType === 'bullet' ? 'normal' : currentBlockType,
      children,
      markDefs
    };
    if (currentBlockType === 'bullet') block.listItem = 'bullet';
    portableText.push(block);
    currentBlockLines = [];
    currentBlockType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        portableText.push({
          _key: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          _type: 'block',
          style: 'code',
          children: [{ _key: `span-${Date.now()}-${Math.floor(Math.random() * 1000)}`, _type: 'span', text: codeLines.join('\n') }]
        });
        codeLines = [];
        inCodeBlock = false;
      } else {
        commitCurrentBlock();
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    
    if (trimmed === '') {
      commitCurrentBlock();
      continue;
    }
    
    if (trimmed.startsWith('## ')) {
      commitCurrentBlock();
      currentBlockType = 'h2';
      currentBlockLines.push(trimmed.substring(3).trim());
      commitCurrentBlock();
    } else if (trimmed.startsWith('### ')) {
      commitCurrentBlock();
      currentBlockType = 'h3';
      currentBlockLines.push(trimmed.substring(4).trim());
      commitCurrentBlock();
    } else if (trimmed.startsWith('> ')) {
      commitCurrentBlock();
      currentBlockType = 'blockquote';
      currentBlockLines.push(trimmed.substring(2).trim());
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      commitCurrentBlock();
      currentBlockType = 'bullet';
      currentBlockLines.push(trimmed.substring(2).trim());
      commitCurrentBlock();
    } else {
      if (currentBlockType !== 'normal' && currentBlockType !== 'blockquote') {
        commitCurrentBlock();
        currentBlockType = 'normal';
      }
      currentBlockLines.push(line);
    }
  }
  
  if (inCodeBlock) {
    portableText.push({
      _key: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      _type: 'block',
      style: 'code',
      children: [{ _key: `span-${Date.now()}-${Math.floor(Math.random() * 1000)}`, _type: 'span', text: codeLines.join('\n') }]
    });
  } else {
    commitCurrentBlock();
  }
  
  return portableText;
}

async function publishDraft() {
  const filePath = path.join(__dirname, '../Marketing/Content/guardrails-for-ai-agents.md');
  const markdown = fs.readFileSync(filePath, 'utf8');
  
  // Extract title (assume first line is # Title)
  const lines = markdown.split('\n');
  let title = 'Guardrails for AI Agents';
  if (lines[0].startsWith('# ')) {
    title = lines[0].substring(2).trim();
  }

  const portableText = markdownToPortableText(markdown.replace(/^# .*\n/, ''));

  const doc = {
    _id: 'drafts.guardrails-for-ai-agents',
    _type: 'blogPost',
    title: title,
    slug: {
      _type: 'slug',
      current: 'guardrails-for-ai-agents'
    },
    excerpt: 'A deep dive into why static constraints fail in the autonomous era, and how continuous behavioral evaluation and cryptographic circuit breakers provide the ultimate guardrails for AI agents.',
    author: 'Kakunin Research',
    publishedAt: new Date().toISOString(),
    content: portableText
  };

  try {
    const existing = await client.fetch(`*[_type == "blogPost" && _id == "drafts.guardrails-for-ai-agents"][0]`);
    if (existing) {
      console.log(`Found existing draft. Overwriting (ID: ${existing._id})...`);
      await client.patch(existing._id).set(doc).commit();
      console.log(`Successfully updated draft!`);
    } else {
      console.log(`Creating new draft post...`);
      const result = await client.create(doc);
      console.log(`Successfully created draft with ID: ${result._id}`);
    }
  } catch (err) {
    console.error(`Failed to publish draft:`, err.message);
  }
}

publishDraft();
