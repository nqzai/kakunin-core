export const customDocsLoaders = {
  'authentication': () => import('./_pages/authentication.mdx'),
  'agent-security': () => import('./_pages/agent-security.mdx'),
  'ai-agent-identity': () => import('./_pages/ai-agent-identity.mdx'),
  'eu-ai-act-annex-iii': () => import('./_pages/eu-ai-act-annex-iii.mdx'),
  'eu-ai-act-checklist': () => import('./_pages/eu-ai-act-checklist.mdx'),
  'know-your-agent': () => import('./_pages/know-your-agent.mdx'),
  'kyc-for-ai-agents': () => import('./_pages/kyc-for-ai-agents.mdx'),
  'kyc-integration': () => import('./_pages/kyc-integration.mdx'),
  'kyc-regulatory-mapping': () => import('./_pages/kyc-regulatory-mapping.mdx'),
  'mica-trading-bot-quickstart': () => import('./_pages/mica-trading-bot-quickstart.mdx'),
  'mica-trading-bots': () => import('./_pages/mica-trading-bots.mdx'),
  'quickstart-mica-trading-bots': () => import('./_pages/quickstart-mica-trading-bots.mdx'),
  'runtime-binding': () => import('./_pages/runtime-binding.mdx'),
  'tutorial-runtime-binding': () => import('./_pages/tutorial-runtime-binding.mdx'),
} as const;

export const customDocsSlugs = Object.keys(customDocsLoaders);
