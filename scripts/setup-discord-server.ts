/**
 * Discord Server Setup Script
 *
 * Creates the full Kakunin Discord server structure via REST API:
 * - Categories + channels with correct permissions
 * - Posts + pins #start-here welcome message
 * - Posts + pins #introductions prompt
 * - Creates "Agent Builder" role
 *
 * Run: npx tsx scripts/setup-discord-server.ts
 */

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;
const API       = 'https://discord.com/api/v10';

if (!BOT_TOKEN || !GUILD_ID) {
  throw new Error('Set DISCORD_BOT_TOKEN and DISCORD_GUILD_ID in your environment.');
}

const HEADERS = {
  Authorization: `Bot ${BOT_TOKEN}`,
  'Content-Type': 'application/json',
};

// Channel types
const CATEGORY   = 4;
const TEXT       = 0;

// ── Channel structure ─────────────────────────────────────────────────────────

const STRUCTURE = [
  {
    category: '📌 Important',
    channels: [
      { name: '🚀│start-here',       topic: 'Read this first. Community guide and quick start.' },
      { name: '📣│announcements',    topic: 'Product updates, releases, and company news.', readonly: true },
      { name: '🔄│kakunin-updates',  topic: 'Changelog and new API features.' },
    ],
  },
  {
    category: '🌐 Community',
    channels: [
      { name: '👋│new-joiners',          topic: 'Just arrived? Say hi!' },
      { name: '🙋│introductions',        topic: 'Introduce yourself and tell us what you\'re building.' },
      { name: '💬│general',              topic: 'Anything AI agents, compliance, or identity.' },
      { name: '🛠│build-with-kakunin',   topic: 'Share integrations, code snippets, and questions.' },
      { name: '🐛│bugs-and-issues',      topic: 'Found something broken? Report it here.' },
      { name: '💡│feature-requests',     topic: 'Shape the Kakunin roadmap.' },
      { name: '📰│ai-compliance-news',   topic: 'EU AI Act, MiCA, and regulatory updates.' },
    ],
  },
  {
    category: '🏆 Show Case',
    channels: [
      { name: '🤖│your-agents',      topic: 'Show off what you\'ve built with Kakunin.' },
      { name: '🔐│compliance-wins',  topic: 'Passed an audit? Got a cert issued? Share it.' },
    ],
  },
  {
    category: '🆘 Support',
    channels: [
      { name: '❓│questions',  topic: 'Ask anything. We respond fast.' },
      { name: '📖│resources',  topic: 'Docs, OpenAPI spec, HF demo, and blog posts.' },
    ],
  },
];

// ── Messages ──────────────────────────────────────────────────────────────────

const START_HERE_MSG = `🔐 **Welcome to Kakunin!**

Kakunin issues X.509 certificates to AI agents, monitors behavioral risk in real time, and generates MiCA + EU AI Act compliance reports — all via a single API.

━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **Important**
🚀│start-here — You're here. Read this first.
📣│announcements — Product updates and releases.
🔄│kakunin-updates — Changelog and new API features.

🌐 **Community**
👋│new-joiners — Just arrived? Say hi!
🙋│introductions — Tell us what you're building.
💬│general — Anything AI agents, compliance, or identity.
🛠│build-with-kakunin — Share integrations, code snippets, questions.
🐛│bugs-and-issues — Found something broken? Report it here.
💡│feature-requests — Shape the roadmap.
📰│ai-compliance-news — EU AI Act, MiCA, regulatory updates.

🏆 **Show Case**
🤖│your-agents — Show off what you've built with Kakunin.
🔐│compliance-wins — Passed an audit? Got a cert issued? Share it.

🆘 **Support**
❓│questions — Ask anything. We respond fast.
📖│resources — Docs, OpenAPI spec, HF demo, blog posts.

━━━━━━━━━━━━━━━━━━━━━━━━━━

🚀 **Get started in 3 steps:**
1️⃣ Introduce yourself in 🙋│introductions
2️⃣ Try the sandbox demo (no API key needed) → https://huggingface.co/spaces/kakunin-ai/compliance-demo
3️⃣ Get your free API key → https://kakunin.ai

📖 Docs: https://kakunin.ai/docs
⚡ OpenAPI: https://kakunin.ai/api/v1/openapi.json
📊 Dashboard: https://kakunin.ai/dashboard

━━━━━━━━━━━━━━━━━━━━━━━━━━
> ⚠️ No spam, recruitment, financial advice, or off-topic crypto discussion.`;

const INTRODUCTIONS_PROMPT = `👋 **Introduce yourself!**

Tell the community who you are and what you're building.
Copy the template below and drop your intro here 👇

━━━━━━━━━━━━━━━━━━━━━━━━━━

**🤖 What I'm building:**
(e.g. "A LangChain trading agent for EU crypto markets")

**🛠️ Stack:**
(e.g. "Python, CrewAI, AWS, Supabase")

**🎯 Why Kakunin:**
(e.g. "Need X.509 certs + audit trail for MiCA compliance")

**🔗 Find me:**
(GitHub / LinkedIn / X — optional)

━━━━━━━━━━━━━━━━━━━━━━━━━━`;

// ── REST helpers ──────────────────────────────────────────────────────────────

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${err}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function getGuildChannels(): Promise<any[]> {
  return api('GET', `/guilds/${GUILD_ID}/channels`);
}

async function getGuildRoles(): Promise<any[]> {
  return api('GET', `/guilds/${GUILD_ID}/roles`);
}

async function getEveryoneRole(): Promise<string> {
  const roles = await getGuildRoles();
  return roles.find((r: any) => r.name === '@everyone').id;
}

async function createRole(name: string, color: number): Promise<any> {
  return api('POST', `/guilds/${GUILD_ID}/roles`, { name, color });
}

async function createChannel(body: unknown): Promise<any> {
  return api('POST', `/guilds/${GUILD_ID}/channels`, body);
}

async function sendMessage(channelId: string, content: string): Promise<any> {
  return api('POST', `/channels/${channelId}/messages`, { content });
}

async function pinMessage(channelId: string, messageId: string): Promise<null> {
  return api('PUT', `/channels/${channelId}/pins/${messageId}`);
}

async function getPins(channelId: string): Promise<any[]> {
  return api('GET', `/channels/${channelId}/pins`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔐 Kakunin Discord Setup\n');

  // Fetch current state
  const [existingChannels, existingRoles, everyoneId] = await Promise.all([
    getGuildChannels(),
    getGuildRoles(),
    getEveryoneRole(),
  ]);

  const channelByName = (name: string) =>
    existingChannels.find((c: any) => c.name === name);
  const roleByName = (name: string) =>
    existingRoles.find((r: any) => r.name === name);

  // 1. Create "Agent Builder" role
  console.log('1. Roles');
  if (roleByName('🔐 Agent Builder')) {
    console.log('  ✓ Role already exists: 🔐 Agent Builder');
  } else {
    await createRole('🔐 Agent Builder', 0x2B934F);
    console.log('  ✅ Created role: 🔐 Agent Builder');
  }

  // 2. Create categories + channels
  console.log('\n2. Categories & Channels');
  const createdChannels: Record<string, string> = {}; // name → id

  for (const section of STRUCTURE) {
    console.log(`\n  ${section.category}`);

    // Category
    let catId: string;
    const existingCat = existingChannels.find(
      (c: any) => c.type === CATEGORY && c.name === section.category
    );
    if (existingCat) {
      catId = existingCat.id;
      console.log(`  ✓ Category exists: ${section.category}`);
    } else {
      const cat = await createChannel({ name: section.category, type: CATEGORY });
      catId = cat.id;
      console.log(`  ✅ Created category: ${section.category}`);
    }

    // Channels
    for (const ch of section.channels) {
      const existing = channelByName(ch.name);
      if (existing) {
        createdChannels[ch.name] = existing.id;
        console.log(`    ✓ Channel exists: #${ch.name}`);
        continue;
      }

      const body: any = {
        name: ch.name,
        type: TEXT,
        parent_id: catId,
        topic: ch.topic,
      };

      if ('readonly' in ch && ch.readonly) {
        body.permission_overwrites = [{
          id: everyoneId,
          type: 0,
          deny: '2048', // SEND_MESSAGES
        }];
      }

      const created = await createChannel(body);
      createdChannels[ch.name] = created.id;
      console.log(`    ✅ Created: #${ch.name}`);

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // 3. Post + pin messages
  console.log('\n3. Welcome Messages');

  // Find channels by partial name match
  const allChannels = await getGuildChannels();
  const findChannel = (partial: string) =>
    allChannels.find((c: any) => c.type === TEXT && c.name.includes(partial));

  const startHereCh  = findChannel('start-here');
  const introsCh     = findChannel('introductions');

  if (startHereCh) {
    const pins = await getPins(startHereCh.id);
    if (pins.length > 0) {
      console.log('  ✓ #start-here already pinned');
    } else {
      const msg = await sendMessage(startHereCh.id, START_HERE_MSG);
      await pinMessage(startHereCh.id, msg.id);
      console.log('  ✅ Posted + pinned #start-here');
    }
  }

  if (introsCh) {
    const pins = await getPins(introsCh.id);
    if (pins.length > 0) {
      console.log('  ✓ #introductions already pinned');
    } else {
      const msg = await sendMessage(introsCh.id, INTRODUCTIONS_PROMPT);
      await pinMessage(introsCh.id, msg.id);
      console.log('  ✅ Posted + pinned #introductions');
    }
  }

  console.log('\n✅ Kakunin Discord server setup complete!\n');
  console.log('Next: enable privileged intents in Discord Dev Portal to activate welcome DMs:');
  console.log('  → https://discord.com/developers/applications/1507248430525710356/bot');
  console.log('  → Enable: Server Members Intent + Message Content Intent\n');

  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
