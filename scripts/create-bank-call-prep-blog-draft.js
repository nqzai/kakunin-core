const fs = require('fs');
const path = require('path');
const { createClient } = require('@sanity/client');

const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
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

let keyCounter = 0;
function k(prefix = 'k') {
  keyCounter += 1;
  return `${prefix}-${keyCounter}`;
}

function span(text, marks = []) {
  return { _type: 'span', _key: k('s'), text, marks };
}

function normalizePart(part, markDefs) {
  if (typeof part === 'string') return span(part);
  if (part.href) {
    const markKey = k('link');
    markDefs.push({
      _key: markKey,
      _type: 'link',
      href: part.href,
      blank: part.blank ?? false,
    });
    return span(part.text, [markKey, ...(part.marks || [])]);
  }
  return span(part.text, part.marks || []);
}

function block(style, children) {
  const markDefs = [];
  return {
    _type: 'block',
    _key: k('b'),
    style,
    markDefs,
    children: children.map((child) => normalizePart(child, markDefs)),
  };
}

function p(...parts) {
  return block('normal', parts);
}

function h2(text) {
  return block('h2', [span(text)]);
}

function h3(text) {
  return block('h3', [span(text)]);
}

function li(text) {
  return {
    _type: 'block',
    _key: k('li'),
    style: 'normal',
    markDefs: [],
    level: 1,
    listItem: 'bullet',
    children: [span(text)],
  };
}

function faqAnswerParagraph(text) {
  return {
    _type: 'block',
    _key: k('ab'),
    style: 'normal',
    markDefs: [],
    children: [span(text)],
  };
}

function faqItem(question, ...answers) {
  return {
    _type: 'faqItem',
    _key: k('faqi'),
    question,
    answer: answers.map((answer) => faqAnswerParagraph(answer)),
  };
}

const slug = 'questions-banks-will-ask-about-ai-agent-governance';
const SITE_URL = 'https://www.kakunin.ai';

const doc = {
  _id: `drafts.${slug}`,
  _type: 'blogPost',
  title: 'What Banks Ask Before Buying AI Agent Governance Infrastructure',
  slug: {
    _type: 'slug',
    current: slug,
  },
  excerpt:
    'A buyer-facing guide to the questions banks and financial institutions ask about AI agent identity, auditability, runtime control, and compliance before they adopt a governance platform.',
  author: 'Kakunin Team',
  publishedAt: new Date().toISOString(),
  tags: ['compliance', 'identity', 'agent-security', 'architecture', 'eu-ai-act'],
  content: [
    p(
      'When a bank or regulated financial institution evaluates AI-agent governance infrastructure, the conversation usually converges on two themes: ',
      { text: 'regulatory defensibility', marks: ['strong'] },
      ' and ',
      { text: 'implementation risk', marks: ['strong'] },
      '.'
    ),
    p(
      'The compliance lead wants to understand whether the institution can prove accountability, constrain delegated authority, and produce regulator-ready evidence. The technology lead wants to know whether the platform fits the existing architecture without creating a new operational fragility.'
    ),
    p(
      'This article is a practical briefing for those conversations. It outlines the questions financial institutions are likely to ask, the objections they may raise, and the control themes they tend to care about before approving any AI agent to act inside a regulated workflow. If you want a shorter primer first, start with ',
      { text: 'AI agent identity explained', href: `${SITE_URL}/blog/ai-agent-identity-explained` },
      ' or the ',
      { text: 'non-human identity overview', href: `${SITE_URL}/platform/non-human-identity` },
      '.'
    ),

    h2('Why This Conversation Is Different In Financial Services'),
    p(
      'In a regulated enterprise, an AI agent is not just another software feature. The moment it starts taking actions on behalf of a team, a customer workflow, or an internal control process, the institution has to answer four linked questions: who is this agent, what is it allowed to do, what did it actually do, and how can it be stopped quickly if something goes wrong?'
    ),
    p(
      'Banks already have IAM, PKI, logging, model governance, and operational risk processes. The difficulty is that those systems were not originally designed around autonomous software actors that can operate with delegated authority across tools, APIs, and data domains. That gap is where AI-agent governance questions usually begin. It is also why buyers increasingly compare AI controls against broader ',
      { text: 'AI governance infrastructure requirements', href: `${SITE_URL}/platform/ai-governance-tools` },
      ' rather than against a single monitoring or identity tool.'
    ),

    h2('Questions The Compliance Team Will Usually Ask'),
    p('Compliance and risk leaders are typically trying to determine whether the institution can govern the agent with the same rigor expected of any other high-impact control surface.'),
    li('What exact problem does this platform solve for a bank or financial institution?'),
    li('How is this different from ordinary KYC, IAM, PKI, API keys, or service-account management?'),
    li('How do we prove which agent acted, under whose authority, and within what scope?'),
    li('Can authority be constrained by action type, value thresholds, or workflow boundaries?'),
    li('What happens if an agent exceeds scope or behaves anomalously?'),
    li('Is the audit trail tamper-evident, exportable, and suitable for investigations or regulatory review?'),
    li('How are revocation, suspension, and emergency halt handled?'),
    li('What evidence can be produced for internal audit, supervisory review, or incident response?'),
    li('How does this support human oversight rather than bypass it?'),
    p(
      'These questions usually become more urgent when the proposed use case touches payments, customer communications, operational approvals, fraud workflows, or any other area where the institution may later need a defensible record. Teams already mapping controls to evidence often find the ',
      { text: 'attestation template', href: `${SITE_URL}/attestation-template` },
      ' helpful as a concrete example of the documentation buyers and reviewers expect to see.'
    ),

    h2('Questions The Technology Team Will Usually Ask'),
    p('Engineering and security stakeholders tend to focus on whether the control model can be introduced without breaking delivery, latency, or existing enterprise architecture patterns.'),
    li('What is the deployment model and where does data live?'),
    li('How does runtime authentication work for an agent?'),
    li('How are certificates, keys, and signing operations managed?'),
    li('Can the institution keep key custody in its own KMS or HSM boundary?'),
    li('How does the platform integrate with API gateways, SIEM, alerting, and existing governance systems?'),
    li('What happens if the control plane or a dependency is unavailable?'),
    li('What is the latency impact of verification, logging, and risk scoring?'),
    li('How does the system scale across many agents, certificates, and events?'),
    li('How are sandbox, test, and production environments separated?'),
    p(
      'Technical buyers also want to see the implementation surface early. That is why strong product conversations usually include a path from architecture to execution, such as the ',
      { text: 'API reference', href: `${SITE_URL}/api-docs` },
      ', the ',
      { text: 'quickstart docs', href: `${SITE_URL}/docs/quickstart-ai-agents` },
      ', and concrete runtime topics like ',
      { text: 'runtime monitoring', href: `${SITE_URL}/blog/runtime-monitoring-ai-agents-compliance` },
      ' or ',
      { text: 'secure runtime binding', href: `${SITE_URL}/docs/runtime-binding` },
      '.'
    ),

    h2('The Underlying Objection Behind Most Questions'),
    p(
      'Most objections in banking are a version of the same concern: ',
      { text: 'does this make autonomous software more controllable than it is today, or does it add another layer we now have to trust?', marks: ['strong'] }
    ),
    p(
      'That is why conversations often compare AI-agent governance infrastructure to existing IAM, observability, or model governance stacks. In practice, the control gap is not simply identity, logging, or policy. It is the combination of verifiable identity, bounded authority, action-level traceability, and fast intervention when an agent crosses a line. That same concern often surfaces in adjacent topics like ',
      { text: 'guardrails', href: `${SITE_URL}/blog/guardrails-for-ai-agents` },
      ', ',
      { text: 'circuit breakers', href: `${SITE_URL}/blog/circuit-breakers-for-ai-agents` },
      ', and ',
      { text: 'prompt-injection resilience', href: `${SITE_URL}/blog/top-10-prompt-injection-attacks` },
      '.'
    ),

    h2('A Useful Framing For The First Call'),
    p(
      'The most productive framing is not to present AI-agent governance as a wholesale replacement for the bank’s existing controls. It is better positioned as a trust layer that complements existing IAM, PKI, SIEM, and governance tooling by making AI agents explicit, attributable, and interruptible actors inside the operating environment.'
    ),
    p(
      'That framing tends to land well because it speaks to how control owners already think: preserve the current stack, reduce ambiguity, and add stronger evidence around an emerging class of software actors. For teams still early in the buying cycle, the ',
      { text: 'free compliance readiness report', href: `${SITE_URL}/assessment` },
      ' can be a useful way to identify where public trust signals and internal control expectations are most likely to diverge.'
    ),
    h2('What Prospective Customers Usually Want To Validate'),
    p(
      'In practice, prospective customers are not just buying a feature set. They are validating whether the platform will help them clear internal security review, satisfy compliance stakeholders, and reduce the time it takes to move from experimental agents to governed production workflows.'
    ),
    li('Can this platform make an AI agent more reviewable by risk, compliance, and internal audit?'),
    li('Can we introduce it without redesigning the bank’s existing identity and monitoring stack?'),
    li('Will it shorten the path from proof of concept to production approval?'),
    li('Can it create evidence that is useful to both engineering teams and control owners?'),
    li('Is there a credible low-risk pilot path before broader rollout?'),
    p(
      'Those are buyer questions, not just technical ones. A public-facing article should therefore help readers understand both the control problem and the commercial buying criteria behind it.'
    ),

    h2('FAQ: Questions Financial Institutions Often Ask'),
    h3('What exact problem does AI-agent governance infrastructure solve for a bank?'),
    p(
      'It addresses the control gap that appears when AI systems move from advisory behavior to action-taking behavior. The bank needs to know which agent acted, what authority it had, whether its behavior stayed within policy, and how to stop it quickly if risk conditions change.'
    ),
    p(
      'That is a different operational problem from basic access management alone, because the institution also needs runtime attribution, evidence, and intervention controls around autonomous actions.'
    ),
    h3('Why is existing IAM or PKI not enough on its own?'),
    p(
      'Existing IAM and PKI remain foundational, but they were not designed specifically to model an AI agent as a bounded software actor with delegated authority, behavioral monitoring, and a regulator-friendly evidence trail.'
    ),
    p(
      'The practical need is usually not to replace those systems, but to extend them with agent-specific identity lifecycle, scope verification, and event-level accountability.'
    ),
    h3('What evidence will compliance, audit, or regulators expect to see?'),
    p(
      'They usually want to see a clear identity record for the agent, proof of allowed scope, a tamper-evident action history, and a documented intervention path such as suspension, halt, or revocation.'
    ),
    p(
      'They also care about whether that evidence can be exported cleanly for incident response, internal review, or supervisory engagement.'
    ),
    h3('What happens if an agent exceeds its authority or behaves anomalously?'),
    p(
      'The expected answer is that the institution can detect that condition, alert the right operators, and intervene quickly through an explicit control path such as blocking, halting, or revoking the agent’s authority.'
    ),
    p(
      'In other words, observability is not enough by itself. The control model also needs an enforcement and intervention layer.'
    ),
    h3('How should a bank think about human oversight in an agentic workflow?'),
    p(
      'Human oversight should be designed as an operational control around authority, escalation, and interruption. The goal is not to force a human into every step, but to ensure that meaningful intervention remains possible when risk thresholds or workflow boundaries are crossed.'
    ),
    p(
      'That distinction matters because regulated institutions usually want controlled autonomy, not uncontrolled automation.'
    ),
    h3('What deployment and integration concerns matter most to technology teams?'),
    p(
      'Architecture teams usually focus on data residency, key custody, failure modes, integration with gateways and SIEM tooling, and whether the system can fit inside existing enterprise control patterns without creating a brittle dependency.'
    ),
    p(
      'A credible implementation plan should therefore talk about boundaries, interoperability, and phased rollout rather than only product features.'
    ),
    h3('What is a realistic first pilot for a financial institution?'),
    p(
      'The strongest pilot candidates are usually internal or tightly bounded workflows where the institution wants stronger control evidence before allowing broader autonomy.'
    ),
    p(
      'Examples include internal operations agents, evidence-collection agents, approval-chain assistants, or narrowly scoped workflow agents that operate with clear boundaries and low blast radius.'
    ),
    h3('What content should a prospective customer review after this article?'),
    p(
      'The next useful step is usually to compare the public explanation of AI agent identity with the practical product surfaces that matter during evaluation, including the API reference, quickstart documentation, attestation template, and platform overview pages.'
    ),
    p(
      'That combination helps both business and technical buyers move from theory to implementation questions without having to piece the story together themselves.'
    ),

    h2('What A Good Outcome Looks Like'),
    p(
      'A strong first conversation does not end with a broad enterprise rollout. It ends with agreement on one bounded use case where stronger identity, scope control, auditability, and intervention would materially improve the institution’s confidence in using AI agents.'
    ),
    p(
      'That is usually the right entry point for both sides: small enough to govern properly, but concrete enough to prove whether the control model holds in a real financial-services environment. If that is the stage you are at now, the best next reading path is usually ',
      { text: 'AI agent identity explained', href: `${SITE_URL}/blog/ai-agent-identity-explained` },
      ', ',
      { text: 'runtime monitoring for compliance', href: `${SITE_URL}/blog/runtime-monitoring-ai-agents-compliance` },
      ', and the ',
      { text: 'attestation template', href: `${SITE_URL}/attestation-template` },
      ' before moving into ',
      { text: 'quickstart implementation docs', href: `${SITE_URL}/docs/quickstart-ai-agents` },
      '.'
    ),
  ],
};

async function main() {
  try {
    const result = await client.createOrReplace(doc);
    console.log('Draft created or updated:', result._id);
    console.log(`Studio link: https://manage.sanity.io/projects/${projectId}/dataset/${dataset}/desk/blogPost;${result._id}`);
  } catch (error) {
    console.error('Failed to create draft:', error.message);
    process.exit(1);
  }
}

main();
