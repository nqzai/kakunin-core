const { createClient } = require('@sanity/client');
require('dotenv').config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function createBlogPostDraft() {
  const blogPost = {
    _type: 'blogPost',
    title: 'Secure Runtime Binding: Proving LLM Agent Identity at Execution',
    slug: {
      _type: 'slug',
      current: 'secure-runtime-binding-llm-agents',
    },
    excerpt:
      'Learn how runtime binding uses X.509 certificates to verify agent identity, enforce scope limits, and prevent privilege escalation in autonomous systems.',
    author: 'Kakunin Team',
    publishedAt: new Date().toISOString(),
    content: [
      { _type: 'block', style: 'h2', _key: 'h1', children: [{ _type: 'span', text: 'The Problem: Unbound Execution', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p1', children: [{ _type: 'span', text: 'Imagine a trading bot running on a server. It has an API key in memory. A vulnerability is discovered—an attacker gains code execution on the server.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p2', children: [{ _type: 'span', text: 'Without runtime binding: ', marks: ['strong'] }, { _type: 'span', text: 'attacker gains shell access, finds API key in memory, runs unauthorized trade.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p3', children: [{ _type: 'span', text: 'With runtime binding: ', marks: ['strong'] }, { _type: 'span', text: 'agent attempts action, signing service checks identity, request is refused from unauthorized IP/region.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p4', children: [{ _type: 'span', text: "The difference: the agent's identity is cryptographically bound to the runtime environment, not just stored in an API key.", marks: ['em'] }] },
      { _type: 'block', style: 'h2', _key: 'h2', children: [{ _type: 'span', text: 'How Runtime Binding Works', marks: [] }] },
      { _type: 'block', style: 'h3', _key: 'h3a', children: [{ _type: 'span', text: 'Step 1: Bind Certificate at Startup', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p5', children: [{ _type: 'span', text: 'When the agent launches, it gets an X.509 certificate from Kakunin with agent name, public key, and scope policy.', marks: [] }] },
      { _type: 'block', style: 'h3', _key: 'h3b', children: [{ _type: 'span', text: 'Step 2: Sign Every Action', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p6', children: [{ _type: 'span', text: 'Before executing any significant action, the agent signs it with its certificate, then submits with proof of identity.', marks: [] }] },
      { _type: 'block', style: 'h3', _key: 'h3c', children: [{ _type: 'span', text: 'Step 3: Verify Signature at Receiver', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p7', children: [{ _type: 'span', text: 'The exchange verifies certificate validity, checks revocation, verifies signature, extracts scope, and enforces limits.', marks: [] }] },
      { _type: 'block', style: 'h2', _key: 'h4', children: [{ _type: 'span', text: 'Real-World Example: MiCA Compliance', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p8', children: [{ _type: 'span', text: 'A crypto exchange in the EU deploys a trading bot that executes algorithmic trades autonomously, stays within regulatory limits, and provides audit trails.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p9', children: [{ _type: 'span', text: 'Bot trades within scope, agent submits with certificate and signature, exchange verifies and logs. At audit, regulator verifies cryptographic proof.', marks: [] }] },
      { _type: 'block', style: 'h2', _key: 'h5', children: [{ _type: 'span', text: 'Three Layers of Protection', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p10', children: [{ _type: 'span', text: 'Layer 1: OS-Level Scope Enforcement — ', marks: ['strong'] }, { _type: 'span', text: 'Agent process labeled with policy, OS enforces file access limits.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p11', children: [{ _type: 'span', text: 'Layer 2: Network-Level Identity (mTLS) — ', marks: ['strong'] }, { _type: 'span', text: 'Agent presents certificate to API, mutual authentication established.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p12', children: [{ _type: 'span', text: 'Layer 3: Application-Level Signature Verification — ', marks: ['strong'] }, { _type: 'span', text: 'Every request includes signature, application verifies and enforces scope.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p13', children: [{ _type: 'span', text: 'Defense-in-depth: attacker needs to compromise all three layers.', marks: ['em'] }] },
      { _type: 'block', style: 'h2', _key: 'h6', children: [{ _type: 'span', text: 'Why This Matters for LLMs', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p14', children: [{ _type: 'span', text: 'Prompt Injection: ', marks: ['strong'] }, { _type: 'span', text: 'Malicious input tries to convince bot to ignore scope limits. Runtime binding says "No, your certificate says max €25k."', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p15', children: [{ _type: 'span', text: 'Memory Corruption: ', marks: ['strong'] }, { _type: 'span', text: 'Attacker corrupts agent state to execute oversized trade. Signing service enforces scope independently. Trade refused.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p16', children: [{ _type: 'span', text: 'Code Injection: ', marks: ['strong'] }, { _type: 'span', text: 'Injected code tries to bypass checks but still needs kakunin.sign(). Service enforces scope. Injection contained.', marks: [] }] },
      { _type: 'block', style: 'normal', _key: 'p17', children: [{ _type: 'span', text: 'Ready to bind your agent to cryptographic identity? Add hero image in Sanity Studio, then publish.', marks: [] }] },
    ],
  };

  try {
    const result = await sanityClient.create(blogPost);
    console.log('✅ Blog post draft created:', result._id);
    console.log('   Document ID:', result._id);
    console.log('   Slug:', result.slug.current);
    console.log('\n   Open Sanity Studio to add hero image and publish:');
    console.log(
      '   https://manage.sanity.io/projects/3wz2eknt/dataset/production/desk/blogPost;' +
        result._id,
    );
  } catch (error) {
    console.error('❌ Failed to create draft:', error.message);
    process.exit(1);
  }
}

createBlogPostDraft();
