const fs = require('fs');
const path = require('path');

// Custom env loader (since dotenv is not in package.json)
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
    // Remove wrapping quotes if present
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

// Helper: parse inline markdown elements (strong, em, code)
function parseInlineSpans(text, markDefs = []) {
  let tokens = [{ text, marks: [] }];

  // 1. Bold: **text**
  tokens = parseRegexTokens(tokens, /\*\*([^*]+)\*\*/g, 'strong');
  // 2. Italic: *text*
  tokens = parseRegexTokens(tokens, /\*([^*]+)\*/g, 'em');
  // 3. Inline code: `text`
  tokens = parseRegexTokens(tokens, /`([^`]+)`/g, 'code');

  // 4. Links: [text](url)
  // To handle links, we extract them, add annotations, and assign the mark ID
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
        processedTokens.push({
          text: tText.substring(lastIndex, matchIndex),
          marks: [...token.marks]
        });
      }

      markDefs.push({
        _key: markKey,
        _type: 'link',
        href: linkUrl
      });

      processedTokens.push({
        text: linkText,
        marks: [...token.marks, markKey]
      });

      lastIndex = linkRegex.lastIndex;
    }

    if (matched) {
      if (lastIndex < tText.length) {
        processedTokens.push({
          text: tText.substring(lastIndex),
          marks: [...token.marks]
        });
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
        result.push({
          text: text.substring(lastIndex, matchIndex),
          marks: [...token.marks]
        });
      }
      
      result.push({
        text: innerText,
        marks: [...token.marks, mark]
      });
      
      lastIndex = regex.lastIndex;
    }
    
    if (matched) {
      if (lastIndex < text.length) {
        result.push({
          text: text.substring(lastIndex),
          marks: [...token.marks]
        });
      }
    } else {
      result.push(token);
    }
  }
  return result;
}

// Convert Markdown blocks to Sanity Portable Text
function markdownToPortableText(markdown) {
  const lines = markdown.split(/\r?\n/);
  const portableText = [];
  
  let inCodeBlock = false;
  let codeLines = [];
  
  let currentBlockType = null; // 'normal', 'h2', 'h3', 'blockquote', 'bullet'
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
    
    if (currentBlockType === 'bullet') {
      block.listItem = 'bullet';
    }
    
    portableText.push(block);
    currentBlockLines = [];
    currentBlockType = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End of code block
        portableText.push({
          _key: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          _type: 'block',
          style: 'code',
          children: [
            {
              _key: `span-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              _type: 'span',
              text: codeLines.join('\n')
            }
          ]
        });
        codeLines = [];
        inCodeBlock = false;
      } else {
        // Start of code block
        commitCurrentBlock();
        inCodeBlock = true;
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }
    
    // Normal markdown parsing
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
      commitCurrentBlock(); // Each bullet item is its own block
    } else {
      // Regular paragraph line
      if (currentBlockType !== 'normal' && currentBlockType !== 'blockquote') {
        commitCurrentBlock();
        currentBlockType = 'normal';
      }
      currentBlockLines.push(line); // keep original line with indentation/spaces
    }
  }
  
  // Commit any trailing block
  if (inCodeBlock) {
    portableText.push({
      _key: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      _type: 'block',
      style: 'code',
      children: [
        {
          _key: `span-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          _type: 'span',
          text: codeLines.join('\n')
        }
      ]
    });
  } else {
    commitCurrentBlock();
  }
  
  return portableText;
}

const articles = [
  {
    filePath: path.join(__dirname, '../Marketing/Content/MiCA_Article_72_AI_Agent_Operators_Deep_Dive.md'),
    title: 'MiCA Article 72: A Deep Dive for AI Agent Operators in Cryptocurrencies',
    slug: 'mica-article-72-ai-agents',
    excerpt: 'An in-depth analysis of the Markets in Crypto-Assets (MiCA) regulation\'s Article 72 logging and identity requirements for algorithmic trading and autonomous agent operators.',
    author: 'Palash Bagchi',
    publishedAt: new Date().toISOString(),
  },
  {
    filePath: path.join(__dirname, '../Marketing/Content/The_Coming_Identity_Crisis_of_AI_Agents.md'),
    title: 'Why AI Agents Need Cryptographic X.509 Certificates (Not Just API Keys)',
    slug: 'why-ai-agents-need-cryptographic-x509-certificates',
    excerpt: 'Why traditional API keys and static credentials fail to secure the autonomous web, and how X.509 cryptographic identity provides the necessary provenance and boundary layers.',
    author: 'Palash Bagchi',
    publishedAt: new Date().toISOString(),
  },
  {
    filePath: path.join(__dirname, '../Marketing/Content/Circuit_Breakers_for_AI_Agents_Operational_Safety.md'),
    title: 'Circuit Breakers for AI Agents: Prevent Runaway Loops',
    slug: 'circuit-breakers-for-ai-agents',
    excerpt: 'How to implement cryptographic circuit breakers, real-time behavior risk scoring, and spend limits to protect your API budget and prevent runaway loops.',
    author: 'Palash Bagchi',
    publishedAt: new Date().toISOString(),
    isDraft: true,
  }
];

async function publishArticles() {
  console.log('=== STARTING PROGRAMMATIC BLOG PUBLISHING TO SANITY ===\n');

  for (const article of articles) {
    if (!fs.existsSync(article.filePath)) {
      console.warn(`File not found: ${article.filePath}, skipping...`);
      continue;
    }

    console.log(`Processing article: "${article.title}"...`);
    const markdown = fs.readFileSync(article.filePath, 'utf8');
    const portableText = markdownToPortableText(markdown);

    const doc = {
      _type: 'blogPost',
      title: article.title,
      slug: {
        _type: 'slug',
        current: article.slug
      },
      excerpt: article.excerpt,
      author: article.author,
      publishedAt: article.publishedAt,
      content: portableText
    };

    if (article.isDraft) {
      doc._id = `drafts.${article.slug}`;
    }

    try {
      // Check if document already exists
      let existing;
      if (article.isDraft) {
        const draftId = `drafts.${article.slug}`;
        existing = await client.fetch(`*[_type == "blogPost" && _id == $draftId][0]`, { draftId });
      } else {
        existing = await client.fetch(`*[_type == "blogPost" && slug.current == $slug && !(_id in path("drafts.**"))][0]`, { slug: article.slug });
      }
      
      if (existing) {
        console.log(`  - Found existing blog post. Overwriting/Updating (ID: ${existing._id})...`);
        await client.patch(existing._id).set(doc).commit();
        console.log(`  - Successfully updated!`);
      } else {
        console.log(`  - Creating new blog post...`);
        const result = await client.create(doc);
        console.log(`  - Successfully created post with ID: ${result._id}`);
      }
    } catch (err) {
      console.error(`  - Failed to publish article:`, err.message);
    }
  }

  console.log('\n=== BLOG PUBLISHING OPERATIONS COMPLETED ===');
}

publishArticles();
