import { sanityClient } from '../src/lib/sanity/client.js';

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
          _key: 'intro',
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
          _key: 'intro2',
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
          _key: 'intro3',
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
          _key: 'problem',
          markDefs: [],
          children: [
            { _type: 'span', text: 'The Problem: Agents Without Identity', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'prob1',
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
          _key: 'prob2',
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
          _key: 'prob3',
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
          _key: 'prob4',
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
          _key: 'prob5',
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
          _key: 'pillars',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Three Pillars of KYA', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar1',
          markDefs: [],
          children: [
            { _type: 'span', text: '1. Cryptographic Identity', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p1text',
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
          _key: 'p1b1',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Agent name (', marks: [] },
            { _type: 'span', text: 'trading_bot_eu_v2', marks: ['code'] },
            { _type: 'span', text: ')', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p1b2',
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
          _key: 'p1b3',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Public key (proves agent identity)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p1b4',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Issuer (Kakunin — a trusted authority)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p1end',
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
          _key: 'pillar2',
          markDefs: [],
          children: [
            { _type: 'span', text: '2. Behavioral Baseline', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p2text',
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
          _key: 'p2b1',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Typical trade size: €25K (median)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p2b2',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Frequency: 8 trades/hour', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p2b3',
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
          _key: 'p2b4',
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
          _key: 'p2end',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'These metrics become the baseline for anomaly detection.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar3',
          markDefs: [],
          children: [
            { _type: 'span', text: '3. Continuous Monitoring', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p3text',
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
          _key: 'p3b1',
          markDefs: [],
          children: [
            { _type: 'span', text: '✓ Is the agent\'s certificate still valid?', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p3b2',
          markDefs: [],
          children: [
            { _type: 'span', text: '✓ Is the signature valid?', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p3b3',
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
          _key: 'p3b4',
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
          _key: 'p3end',
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
          _key: 'scenario',
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
          _key: 'sc1',
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
          _key: 'sc2',
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
          _key: 'sc3',
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
          _key: 'sc4',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'What happens next: Certificate valid? ✓ Signature valid? ✓ Within scope? ✗ (€500K > €50K limit). Anomaly score: 0.92 (HIGH). Action: BLOCKED. Automatic pre-revocation warning issued.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'sc5',
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
          _key: 'sc6',
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
          _key: 'sc7',
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
          _key: 'why',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Why Regulators Demand KYA', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'why1',
          markDefs: [],
          children: [
            { _type: 'span', text: 'EU AI Act (Article 13)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'why1text',
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
          _key: 'why1b1',
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
          _key: 'why1b2',
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
          _key: 'why1b3',
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
          _key: 'why1b4',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Complete audit trail', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'why2',
          markDefs: [],
          children: [
            { _type: 'span', text: 'MiCA (Article 67–72)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'why2text',
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
          _key: 'why2b1',
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
          _key: 'why2b2',
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
          _key: 'why2b3',
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
          _key: 'why3',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Best Practice (Basel III Compliance)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'why3text',
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
          _key: 'comparison',
          markDefs: [],
          children: [
            { _type: 'span', text: 'KYA vs. Traditional API Keys', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comptext',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API keys are just strings — anyone with access can use them. KYA binds identity cryptographically:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comp1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API Key: Identity proof = just a string. KYA: Identity proof = cryptographic signature.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comp2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API Key: Can be stolen easily. KYA: Private key stays in KMS — cannot be stolen.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comp3',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API Key: Scope limits per endpoint (coarse). KYA: Scope limits per certificate + baseline (fine-grained).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comp4',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API Key: Anomaly detection = none. KYA: Anomaly detection = continuous behavioral monitoring.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'comp5',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'API Key: Revocation speed = minutes (manual). KYA: Revocation speed = milliseconds (automatic).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'trust',
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
          _key: 'trusttext',
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
          _key: 'trust1',
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
          _key: 'trust2',
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
          _key: 'trust3',
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
          _key: 'trustend',
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
          _key: 'getstarted',
          markDefs: [
            {
              _type: 'link',
              _key: 'kyadocs',
              href: '/docs/know-your-agent',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Getting started',
              marks: [],
            },
            {
              _type: 'span',
              text: ' — Ready to implement KYA for your agents? Check out the technical framework guide to dive deep into identity verification, behavioral profiling, and regulatory alignment.',
              marks: [{ _type: 'link', _key: 'kyadocs' }],
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
          _key: 'scenario',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scenario: A crypto exchange in the EU wants to launch an autonomous trading bot that executes algorithmic trades 24/7, stays within regulatory limits, and generates audit trails that regulators can verify.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'challenge',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Challenge: How do you prove the bot stayed within scope? How do you show regulators the bot wasn\'t being manipulated?',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'solution',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Solution: Use Kakunin runtime binding + behavioral profiling (KYA).',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'setup',
          markDefs: [],
          children: [
            { _type: 'span', text: 'The Setup', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'setuptext1',
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
          _key: 'setuptext2',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Bot: ', marks: [] },
            { _type: 'span', text: 'algo_trader_v2', marks: ['code'] },
            { _type: 'span', text: ' (proprietary algorithm)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'setuptext3',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Scope: Markets EUR/USD, GBP/EUR (liquid pairs only), Max trade size €25,000, Max daily volume €500,000, Trading hours 08:00–17:00 UTC (business hours only), Region eu-west-1 (AWS Ireland, GDPR-compliant)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'setuptext4',
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
          _key: 'week1',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Week 1: Binding Agent Identity', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w1day1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 1: Board resolution',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — "CryptoEX AG authorizes deployment of algo_trader_v2 with scope: EUR/USD + GBP/EUR, max €25K trades"',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w1day2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 2: Kakunin issues X.509 certificate',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — Certificate contains: Agent name algo_trader_v2, Public key used to verify signatures, Scope maxTradeSize 25000 markets [...], Serial number F1D4E8C7B2A9F3E6, Issuer Kakunin Root CA, Valid 365 days',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w1day3',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Day 3: Agent deployed to Kubernetes',
              marks: ['strong'],
            },
            {
              _type: 'span',
              text: ' — Receives certificate, Private key stays in AWS KMS (not exposed), Every trade will be signed with this identity',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'week23',
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
          _key: 'w23text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Agent runs for 14 days. System observes baseline metrics:',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w23b1',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Median trade size: €18,500', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w23b2',
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
          _key: 'w23b3',
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
          _key: 'w23b4',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Peak time: 10:00–12:00 UTC', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w23b5',
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
          _key: 'w23b6',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Success rate: 99.2% (occasional network timeouts)', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w23end',
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
          _key: 'week4',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Week 4: Production Deployment', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w4intro',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 15, 09:00 UTC: Bot goes live with locked baseline. First 7 days: Normal Operations.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w4trade1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 1: 09:15 UTC, EUR/USD, BUY €20,000 ✓ Allowed — Certificate valid, Signature verified, Size €20K < scope €25K, Matches baseline, Time 09:15 (trading hours)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w4trade2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 2: 10:45 UTC, GBP/EUR, SELL €15,000 ✓ Allowed — All checks pass, Anomaly score: 0.08 (very low)',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'w4trades3',
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
          _key: 'incident',
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
          _key: 'inctext1',
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
          _key: 'inctext2',
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
          _key: 'inctext3',
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
          _key: 'inctext4',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'What happened: (1) Agent signed the trade with its certificate (2) Signing service checked: Certificate valid? YES. Signature valid? YES. Trade size €180K vs scope €25K? EXCEEDS. Anomaly score: 0.92 (CRITICAL). (3) Pre-trade control rejected it immediately. (4) Trade never sent to exchange. (5) Alert issued to exchange operations team.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'inctext5',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange operations receives alert: Timestamp 2026-05-22T10:30:15Z, Alert type trade_blocked_scope_exceeded, Agent algo_trader_v2, Cert serial F1D4E8C7B2A9F3E6, Requested size €180,000, Scope limit €25,000, Anomaly score 0.92, Action Automatic pre-revocation warning issued, Grace period 5 minutes, Next action If not ACK\'d by operator, certificate will be revoked.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'inctext6',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange operations investigates: Check market conditions (Normal, no extreme volatility), Check algorithm logs (Algorithm made a legitimate calculation, just exceeded scope), Check for breach (No evidence of unauthorized access), Conclusion: Bug or logic error in algorithm, not a security incident.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'inctext7',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange CTO ACKs the warning: No action taken. Grace period elapsed.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'recovery',
          markDefs: [],
          children: [
            { _type: 'span', text: 'May 23: Revocation & Recovery', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'rectext1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '11:00 UTC: Original certificate revoked. Agent stops trading immediately.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'rectext2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Trade 322 attempt: EUR/USD, BUY €22,000 ❌ BLOCKED — Reason Certificate revoked.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'rectext3',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange deploys replacement agent: New certificate issued, Baseline inherited from original, Scope remains the same, All subsequent trades signed with new cert.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'audit',
          markDefs: [],
          children: [
            { _type: 'span', text: 'Audit Trail: 7 Days Later', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'audittext1',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'May 30: Swiss regulator (FINMA) asks: "Can you prove this bot stayed within scope?"',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'audittext2',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Exchange response: Hand over complete audit trail with agent ID algo_trader_v2, Certificate serial F1D4E8C7B2A9F3E6, Issuer Kakunin Root CA, Period 2026-05-15 to 2026-05-30, Total trades 1021, Trades allowed 1020, Trades blocked 1, Reason blocked Exceeds scope limit.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'audittext3',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Regulator verification: (1) Verify certificate signature (Kakunin Root CA public key) ✓ (2) Verify 1000+ trade signatures using agent\'s public key ✓ (3) Confirm scope policy matches board resolution ✓ (4) Confirm no trades exceeded scope limits ✓ (5) Confirm 1 trade was blocked for exceeding scope ✓ (6) Confirm baseline was properly established ✓ (7) Check incident response procedure ✓',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'audittext4',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Conclusion: Bot operated within scope. Pre-trade controls worked. Regulatory approval: GRANTED.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'whatmade',
          markDefs: [],
          children: [
            { _type: 'span', text: 'What Made This Possible', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar1',
          markDefs: [],
          children: [
            { _type: 'span', text: '1. Cryptographic Identity', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p1text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'X.509 certificate issued by trusted third party (Kakunin), Agent signs every trade, Regulator can verify signatures without trusting the exchange.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar2',
          markDefs: [],
          children: [
            { _type: 'span', text: '2. Documented Scope Policy', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p2text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Board resolution specifies exact limits, Certificate contains these limits, Pre-trade controls enforce them, Evidence that rules were set before the bot ran.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar3',
          markDefs: [],
          children: [
            { _type: 'span', text: '3. Behavioral Profiling', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p3text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: '14-day baseline established before production, Anomaly detection caught the €180K trade immediately, Baseline proves normal trading pattern.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar4',
          markDefs: [],
          children: [
            { _type: 'span', text: '4. Immutable Audit Log', marks: [] },
          ],
        },
        {
          _type: 'block',
          style: 'normal',
          _key: 'p4text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Every trade logged with signature, Cannot be altered or deleted, Complete historical record for regulators.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h3',
          _key: 'pillar5',
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
          _key: 'p5text',
          markDefs: [],
          children: [
            {
              _type: 'span',
              text: 'Pre-trade control blocked scope violation in milliseconds, No human could bypass the rules, Grace period allows investigation, but default is enforce.',
              marks: [],
            },
          ],
        },
        {
          _type: 'block',
          style: 'h2',
          _key: 'nextonly',
          markDefs: [
            {
              _type: 'link',
              _key: 'deepdive',
              href: '/docs/mica-trading-bots',
            },
            {
              _type: 'link',
              _key: 'quickstart',
              href: '/docs/mica-trading-bot-quickstart',
            },
          ],
          children: [
            {
              _type: 'span',
              text: 'Ready to deploy your own MiCA-compliant bot? Read the ',
              marks: [],
            },
            {
              _type: 'span',
              text: 'deep dive into Articles 67–72',
              marks: [{ _type: 'link', _key: 'deepdive' }],
            },
            {
              _type: 'span',
              text: ' for technical patterns, or follow the ',
              marks: [],
            },
            {
              _type: 'span',
              text: '30-minute quickstart',
              marks: [{ _type: 'link', _key: 'quickstart' }],
            },
            {
              _type: 'span',
              text: ' to get running in minutes.',
              marks: [],
            },
          ],
        },
      ],
    },
  ];

  try {
    for (const blog of blogs) {
      const result = await sanityClient.create({
        _type: 'blogPost',
        title: blog.title,
        slug: {
          _type: 'slug',
          current: blog.slug,
        },
        excerpt: blog.excerpt,
        publishedAt: new Date().toISOString(),
        author: blog.author,
        content: blog.content,
      });

      console.log(`✅ Blog post draft created: ${blog.title}`);
      console.log(
        `   Open Sanity Studio to add hero image and publish`
      );
      console.log(
        `   Link: https://manage.sanity.io/projects/3wz2eknt/dataset/production/desk/blogPost;${result._id}`
      );
    }
  } catch (error) {
    console.error('❌ Failed to create drafts:', error);
    process.exit(1);
  }
}

createP1Blogs();
