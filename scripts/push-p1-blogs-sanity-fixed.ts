import { sanityClient } from '../src/lib/sanity/client.js';
import { randomBytes } from 'crypto';

function genKey() {
  return randomBytes(8).toString('hex');
}

async function createP1Blogs() {
  const blogs = [
    {
      title: 'Know Your Agent: Identity Verification for AI Agents',
      slug: 'know-your-agent-explained',
      excerpt:
        'Understand KYA — the regulatory requirement to verify agent identity, establish behavioral baselines, and detect anomalies in real-time.',
      author: 'Kakunin Team',
      content: [
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Banks have "Know Your Customer" (KYC). When you open an account, they verify who you are, understand your business, and monitor for suspicious activity.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Now regulators are asking the same question about autonomous AI agents: ',
              marks: [],
            },
            {
              _type: 'span',
              text: '"How do we know who this agent is? What is it supposed to do? How do we detect if it\'s doing something wrong?"',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Enter ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'Know Your Agent (KYA)',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — the framework for governing autonomous systems.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The Problem: Agents Without Identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'An AI trading bot is running in your Kubernetes cluster. It has authority to execute trades. A vulnerability is discovered. An attacker gains access to the container.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Question: How do you know the trades being executed are still from your authorized agent, and not the attacker?',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Traditional answer: "Check the API key."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The problem: API keys are just strings. They live in memory. An attacker with shell access finds it, uses it, and the API server has no way to tell the difference between the legitimate bot and the attacker.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'KYA changes this. Instead of "this string matches an API key," you verify: "this action was cryptographically signed by agent X, operating within defined limits, and the behavior is consistent with what we expect from agent X."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Three Pillars of KYA',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '1. Cryptographic Identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Every agent gets an X.509 certificate — the same technology that secures HTTPS. The certificate contains:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Agent name (',
              marks: [],
            },
            {
              _type: 'span',
              text: 'trading_bot_eu_v2',
              marks: ['code'],
            },
            {
              _type: 'span',
              text: ')',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scope policy (max €50K trades, EUR_USD market only)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Public key (proves agent identity)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Issuer (Kakunin — a trusted authority)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The agent uses this certificate to sign every action. Receivers verify the signature. ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'Signature verification proves the action came from the specific agent, not someone else.',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '2. Behavioral Baseline',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Over the first week of operation, the agent establishes what "normal" looks like:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Typical trade size: €25K (median)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Frequency: 8 trades/hour',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Preferred markets: EUR_USD, GBP_EUR',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trading hours: 08:00–17:00 UTC only',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'These metrics become the ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'baseline for anomaly detection',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: '.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '3. Continuous Monitoring',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'At every action, the system checks:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '✓ Is the agent\'s certificate still valid?',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '✓ Is the signature valid?',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '✓ Does the action match the agent\'s scope policy?',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '✓ Does the behavior match the baseline?',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'If something deviates, an anomaly score rises. If the score exceeds a threshold, the certificate is automatically revoked, stopping the agent.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Real-World Scenario: Detecting a Breach',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 1, 09:00 UTC: Agent executes normal €25K trade (EUR_USD, baseline behavior). ✓ Allowed.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 1, 14:30 UTC: Attacker gains container access, dumps the agent\'s private key (from KMS).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 1, 14:31 UTC: Attacker tries to execute €500K trade using the stolen key.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'What happens next:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Certificate valid? ✓ Not revoked yet',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Signature valid? ✓ Matches agent\'s public key',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Within scope? ✗ €500K > €50K limit',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Anomaly score: ',
              marks: [],
            },
            {
              _type: 'span',
              text: '0.92 (HIGH)',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — 10x baseline size',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Action: ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'BLOCKED',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — Automatic pre-revocation warning issued',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Operator sees alert: "Agent trading_bot_eu_v2 tried to exceed scope. Certificate revoked in 5 minutes unless you ACK."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Operator investigates, finds the breach, revokes certificate. New agent spun up. Attacker locked out.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Timeline: Breach to lockout = ',
              marks: [],
            },
            {
              _type: 'span',
              text: '< 30 seconds',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: '.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Why Regulators Demand KYA',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'EU AI Act (Article 13)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Requires "effective human oversight" and "appropriate safeguards." KYA delivers:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Documented agent identity (X.509 cert)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Authority limits (scope policy)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Automatic detection of out-of-policy behavior',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Complete audit trail',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'MiCA (Article 67–72)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Requires crypto exchanges to maintain "governance, risk and control frameworks" for algorithmic trading. KYA is the framework:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Governance: Baseline defines what agent is authorized to do',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Risk: Anomaly detection flags deviations',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Control: Automatic revocation stops unauthorized actions',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Best Practice (Basel III Compliance)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Banks use behavioral profiling to detect fraud. Regulators expect the same discipline for AI agents.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'KYA vs. Traditional API Keys',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Identity proof: API Key = Just a string. KYA = Cryptographic signature',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Can be stolen? API Key = Yes, easily. KYA = Private key stays in KMS — can\'t be stolen',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scope limits: API Key = Per endpoint (coarse). KYA = Per certificate + baseline (fine-grained)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Anomaly detection: API Key = None. KYA = Continuous behavioral monitoring',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Revocation speed: API Key = Minutes (manual). KYA = Milliseconds (automatic)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regulatory acceptance: API Key = Grudging. KYA = Strong (required for MiCA/EU AI Act)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The Larger Picture: Trust & Governance',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'KYA is not just about security. It\'s about ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'demonstrable governance',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ':',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'To regulators: "We can prove our agent traded within scope. Here\'s the certificate, here\'s the signature, here\'s the baseline behavior, here\'s the anomaly detection logs."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'To auditors: "We have a complete, cryptographically verified audit trail of every agent action."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'To customers: "If our agent goes rogue, it\'s automatically stopped within milliseconds."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'This level of governance is necessary for autonomous agents to operate in regulated industries (finance, healthcare, energy).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Getting Started',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/know-your-agent',
              _key: 'link1',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Understand KYA framework',
              marks: [{ _type: 'link', _key: 'link1' }],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/mica-trading-bot-quickstart',
              _key: 'link2',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Deploy your first agent',
              marks: [{ _type: 'link', _key: 'link2' }],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/dashboard',
              _key: 'link3',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Monitor behavior',
              marks: [{ _type: 'link', _key: 'link3' }],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Ready to make your agents verifiable? Start with Kakunin\'s KYA framework implementation.',
              marks: [],
            },
          ],
        },
      ],
    },
    {
      title: 'MiCA Trading Bot Case Study: Proving Compliance to Regulators',
      slug: 'mica-trading-bot-case-study',
      excerpt:
        'See how a crypto exchange deployed a MiCA-compliant autonomous trading bot and provided cryptographic proof to regulators.',
      author: 'Kakunin Team',
      content: [
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scenario: A crypto exchange in the EU wants to launch an autonomous trading bot that executes algorithmic trades 24/7, stays within regulatory limits, and generates audit trails that regulators can verify.',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Challenge: How do you prove the bot stayed within scope? How do you show regulators the bot wasn\'t being manipulated?',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Solution: Use Kakunin runtime binding + behavioral profiling (KYA).',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The Setup',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange: CryptoEX AG (licensed in Switzerland, operates in EU)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Bot: algo_trader_v2 (proprietary algorithm)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scope:',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Markets: EUR/USD, GBP/EUR (liquid pairs only)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Max trade size: €25,000 (MiCA requires individual trade limits)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Max daily volume: €500,000',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trading hours: 08:00–17:00 UTC (business hours only, no weekend trading)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regions: eu-west-1 (AWS Ireland, GDPR-compliant)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Deployment: Kubernetes cluster running Kakunin agent framework.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Week 1: Binding Agent Identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 1: Board resolution "CryptoEX AG authorizes deployment of algo_trader_v2 with scope: EUR/USD + GBP/EUR, max €25K trades"',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 2: Kakunin issues X.509 certificate containing: Agent name: algo_trader_v2, Public key: used to verify signatures, Scope: {maxTradeSize: 25000, markets: [...]}, Serial number: F1D4E8C7B2A9F3E6, Issuer: Kakunin Root CA, Valid: 365 days',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 3: Agent deployed to Kubernetes receiving certificate, private key stays in AWS KMS (not exposed), every trade will be signed with this identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Week 2–3: Establishing Behavioral Baseline',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Agent runs for 14 days. System observes:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Median trade size: €18,500',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade frequency: 6 trades/hour (48/day)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Preferred markets: 73% EUR/USD, 27% GBP/EUR',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Peak time: 10:00–12:00 UTC',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Typical counterparties: CoinEx, Kraken, Binance',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Success rate: 99.2% (occasional network timeouts)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'System locks in baseline. This becomes the reference for anomaly detection.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Week 4: Production Deployment',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 15, 09:00 UTC: Bot goes live with locked baseline.',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'First 7 days: Normal Operations',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 1: 09:15 UTC, EUR/USD, BUY €20,000 ✓ Allowed (Certificate valid, Signature verified, Size €20K < scope €25K, Matches baseline, Time 09:15 in trading hours)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 2: 10:45 UTC, GBP/EUR, SELL €15,000 ✓ Allowed (All checks pass, Anomaly score: 0.08 very low)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '[... 320 trades over 7 days ...] All trades logged. Signatures verified. Baseline respected.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 22: Incident — Bot Tries to Exceed Scope',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '10:30 UTC: Market opportunity detected. Algorithm decides to make a large trade.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 321: EUR/USD, BUY €180,000 ❌ BLOCKED',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Reason: Exceeds scope limit (€25,000)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'What happened:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '1. Agent signed the trade with its certificate',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '2. Signing service checked: Certificate valid? YES. Signature valid? YES. Trade size €180K vs. scope €25K? EXCEEDS. Anomaly score: 0.92 (CRITICAL)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '3. Pre-trade control rejected it immediately',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '4. Trade never sent to exchange',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '5. Alert issued to exchange operations team',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange operations investigates: Check market conditions (Normal, no extreme volatility), Check algorithm logs (Algorithm made a legitimate calculation, just exceeded scope), Check for breach (No evidence of unauthorized access), Conclusion (Bug or logic error in algorithm, not a security incident)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange CTO ACKs the warning: No action taken. Grace period elapsed. Certificate revocation scheduled.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 23: Revocation & Recovery',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '11:00 UTC: Original certificate revoked. Agent stops trading immediately.',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 322 attempt: EUR/USD, BUY €22,000 ❌ BLOCKED',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Reason: Certificate revoked',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange deploys replacement agent: New certificate issued, Baseline inherited from original, Scope remains the same, All subsequent trades signed with new cert',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Audit Trail: 7 Days Later',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 30: Swiss regulator (FINMA) asks: "Can you prove this bot stayed within scope?"',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange response: Hand over complete audit trail.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Audit trail includes: agent_id: algo_trader_v2, agent_certificate_serial: F1D4E8C7B2A9F3E6, issuer: Kakunin Root CA, period: 2026-05-15 to 2026-05-30, total_trades: 1021, trades_allowed: 1020, trades_blocked: 1, reason_blocked: Exceeds scope limit',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regulator verification: 1. Verify certificate signature (Kakunin Root CA public key) ✓, 2. Verify at least 1000 trade signatures using agent\'s public key ✓, 3. Confirm scope policy matches board resolution ✓, 4. Confirm no trades exceeded scope limits ✓, 5. Confirm 1 trade was blocked for exceeding scope ✓, 6. Confirm baseline was properly established ✓, 7. Check incident response procedure ✓',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Conclusion: Bot operated within scope. Pre-trade controls worked. Regulatory approval: GRANTED',
              marks: ['strong'],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'What Made This Possible',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '1. Cryptographic Identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'X.509 certificate issued by trusted third party (Kakunin)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Agent signs every trade',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regulator can verify signatures without trusting the exchange',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '2. Documented Scope Policy',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Board resolution specifies exact limits',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Certificate contains these limits',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Pre-trade controls enforce them',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Evidence that rules were set before the bot ran',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '3. Behavioral Profiling',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '14-day baseline established before production',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Anomaly detection caught the €180K trade immediately',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Baseline proves normal trading pattern',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '4. Immutable Audit Log',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Every trade logged with signature',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Cannot be altered or deleted',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Complete historical record for regulators',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '5. Automatic Enforcement',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Pre-trade control blocked scope violation in milliseconds',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'No human could bypass the rules',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Grace period allows investigation, but default is enforce',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'The Regulatory Advantage',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Before (traditional bot): Exchange says: "We logged the trades. Trust us." Regulator says: "How do I know you didn\'t change the logs?" Exchange says: "We have internal controls..." Regulator says: "That\'s not good enough. Show us cryptographic proof."',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'After (Kakunin runtime binding): Exchange says: "Here\'s the certificate chain, here are all 1021 signatures, here\'s the baseline. Verify it yourself." Regulator uses free tools to verify signatures. Regulator confirms scope policy was enforced. Regulator approves the bot.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Key Metrics from This Deployment',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trades executed: 1,020',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trades blocked: 1',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Median trade size: €18,500',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Max allowed: €25,000',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Incidents: 1 (scope exceeded)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Time to block: 47ms (pre-trade control)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Time to revoke cert: 5 min (grace period)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regulatory approval: ✓ Granted in 48 hours',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Lessons',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '1. Baseline matters. Establish normal behavior before going live. It\'s your anomaly detection.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '2. Pre-trade controls work. The bot tried to break scope; the system caught it before the exchange even saw the trade.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '3. Cryptographic proof is strong. Regulator verified 1000+ signatures without needing to trust the exchange\'s infrastructure.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '4. Grace periods are valuable. When anomalies happen, give operators time to investigate (not everything is a breach).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '5. Revocation is fast. From alert to certificate revoked = 5 minutes. From revoked to recovery bot live = 1 hour.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/mica-trading-bots',
              _key: 'linkA',
            },
            {
              _type: 'link',
              url: '/docs/mica-trading-bot-quickstart',
              _key: 'linkB',
            },
            {
              _type: 'link',
              url: '/docs/know-your-agent',
              _key: 'linkC',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Next Steps',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/mica-trading-bots',
              _key: 'link1',
            },
          ],
          children: [
            {
              _type: 'span',
              text: '1. Read the MiCA compliance guide',
              marks: [{ _type: 'link', _key: 'link1' }],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/mica-trading-bot-quickstart',
              _key: 'link2',
            },
          ],
          children: [
            {
              _type: 'span',
              text: '2. Follow the quickstart',
              marks: [{ _type: 'link', _key: 'link2' }],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: genKey(),
          markDefs: [
            {
              _type: 'link',
              url: '/docs/know-your-agent',
              _key: 'link3',
            },
          ],
          children: [
            {
              _type: 'span',
              text: '3. Get regulatory approval',
              marks: [{ _type: 'link', _key: 'link3' }],
            },
          ],
        },
      ],
    },
  ];

  for (const blog of blogs) {
    try {
      const result = await sanityClient.create({
        _type: 'blogPost',
        title: blog.title,
        slug: { _type: 'slug', current: blog.slug },
        excerpt: blog.excerpt,
        publishedAt: new Date().toISOString(),
        author: blog.author,
        content: blog.content,
      });

      console.log(
        `✅ Blog post draft created: ${blog.title}`
      );
      console.log(
        `   Open Sanity Studio to add hero image and publish`
      );
      console.log(
        `   Link: https://manage.sanity.io/projects/3wz2eknt/dataset/production/desk/blogPost;${result._id}`
      );
    } catch (error) {
      console.error(
        `❌ Failed to create ${blog.title}:`,
        error
      );
    }
  }
}

createP1Blogs().catch(console.error);
