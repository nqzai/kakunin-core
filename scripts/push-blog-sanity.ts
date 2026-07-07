import { sanityClient } from '../src/lib/sanity/client.js';

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
    publishedAt: new Date().toISOString(),
    author: 'Kakunin Team',
    content: [
      {
        _type: 'block',
        style: 'h2',
        _key: 'intro',
        markDefs: [],
        children: [{ _type: 'span', text: 'The Problem: Unbound Execution', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'prob1',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Imagine a trading bot running on a server. It has an API key in memory. A vulnerability is discovered—an attacker gains code execution on the server.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'prob2',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Without runtime binding:', marks: ['strong'] },
          {
            _type: 'span',
            text: ' Attacker gains shell access, finds API key in memory, runs unauthorized trade.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'prob3',
        markDefs: [],
        children: [
          { _type: 'span', text: 'With runtime binding:', marks: ['strong'] },
          {
            _type: 'span',
            text: ' Agent attempts action, signing service checks identity, request is refused from unauthorized IP/region.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'prob4',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'The difference: the agent\'s identity is cryptographically bound to the runtime environment, not just stored in an API key.',
            marks: ['em'],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        _key: 'howitworks',
        markDefs: [],
        children: [{ _type: 'span', text: 'How Runtime Binding Works', marks: [] }],
      },
      {
        _type: 'block',
        style: 'h3',
        _key: 'step1',
        markDefs: [],
        children: [{ _type: 'span', text: 'Step 1: Bind Certificate at Startup', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'step1text',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'When the agent launches, it gets an X.509 certificate from Kakunin with agent name, public key, and scope policy.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h3',
        _key: 'step2',
        markDefs: [],
        children: [{ _type: 'span', text: 'Step 2: Sign Every Action', marks: [] }],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'step2text',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Before executing any significant action, the agent signs it with its certificate, then submits with proof of identity.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h3',
        _key: 'step3',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Step 3: Verify Signature at Receiver', marks: [] },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'step3text',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'The exchange verifies certificate validity, checks revocation, verifies signature, extracts scope, and enforces limits.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        _key: 'realworld',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Real-World Example: MiCA Compliance', marks: [] },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'rwtext1',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'A crypto exchange in the EU deploys a trading bot that executes algorithmic trades autonomously, stays within regulatory limits, and provides audit trails.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'rwtext2',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Bot trades within scope, agent submits with certificate and signature, exchange verifies and logs. At audit, regulator verifies cryptographic proof.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        _key: 'threelayers',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Three Layers of Protection', marks: [] },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'layer1',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Layer 1: OS-Level Scope Enforcement — ', marks: ['strong'] },
          {
            _type: 'span',
            text: 'Agent process labeled with policy, OS enforces file access limits.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'layer2',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Layer 2: Network-Level Identity (mTLS) — ', marks: ['strong'] },
          {
            _type: 'span',
            text: 'Agent presents certificate to API, mutual authentication established.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'layer3',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Layer 3: Application-Level Signature Verification — ',
            marks: ['strong'],
          },
          {
            _type: 'span',
            text: 'Every request includes signature, application verifies and enforces scope.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'defense',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Defense-in-depth: attacker needs to compromise all three layers.',
            marks: ['em'],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        _key: 'whymatters',
        markDefs: [],
        children: [
          {
            _type: 'span',
            text: 'Why This Matters for LLMs',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'llm1',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Prompt Injection: ', marks: ['strong'] },
          {
            _type: 'span',
            text: 'Malicious input tries to convince bot to ignore scope limits. Runtime binding says "No, your certificate says max €25k."',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'llm2',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Memory Corruption: ', marks: ['strong'] },
          {
            _type: 'span',
            text: 'Attacker corrupts agent state to execute oversized trade. Signing service enforces scope independently. Trade refused.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'normal',
        _key: 'llm3',
        markDefs: [],
        children: [
          { _type: 'span', text: 'Code Injection: ', marks: ['strong'] },
          {
            _type: 'span',
            text: 'Injected code tries to bypass checks but still needs ',
            marks: [],
          },
          {
            _type: 'span',
            text: 'kakunin.sign()',
            marks: ['code'],
          },
          {
            _type: 'span',
            text: '. Service enforces scope. Injection contained.',
            marks: [],
          },
        ],
      },
      {
        _type: 'block',
        style: 'h2',
        _key: 'gestarted',
        markDefs: [
          {
            _type: 'link',
            _key: 'doclink',
            href: '/docs/runtime-binding',
          },
        ],
        children: [
          {
            _type: 'span',
            text: 'Ready to bind your agent to cryptographic identity? Read the implementation guide',
            marks: [],
          },
          {
            _type: 'span',
            text: ' for Kubernetes deployment patterns, mTLS setup, and continuous verification strategies.',
            marks: [{ _type: 'link', _key: 'doclink' }],
          },
        ],
      },
    ],
  };

  try {
    const result = await sanityClient.create(blogPost);
    console.log('✅ Blog post draft created:', result._id);
    console.log('   Open Sanity Studio to add hero image and publish');
    console.log('   Link: https://manage.sanity.io/projects/3wz2eknt/dataset/production/desk/blogPost;' + result._id);
  } catch (error) {
    console.error('❌ Failed to create draft:', error);
    process.exit(1);
  }
}

createBlogPostDraft();
