/**
 * Register Discord Slash Commands
 *
 * One-time script to register /agent-register globally across all Discord servers.
 * Run after adding a new slash command or updating existing ones.
 *
 * Usage:
 *   npx tsx scripts/register-discord-commands.ts
 *
 * Requires in .env.local:
 *   DISCORD_BOT_TOKEN=   (from Discord Developer Portal → Bot)
 *   DISCORD_APPLICATION_ID=  (from Discord Developer Portal → General Information)
 */

import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '..', '.env.local') });

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APP_ID = process.env.DISCORD_APPLICATION_ID;

if (!BOT_TOKEN || !APP_ID) {
  console.error('❌  DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID required in .env.local');
  process.exit(1);
}

const COMMANDS = [
  {
    name: 'agent-register',
    description: 'Register an AI agent and issue a Kakunin X.509 certificate',
    options: [
      {
        type: 3, // STRING
        name: 'name',
        description: 'Agent name (e.g. TradingBot-v2)',
        required: true,
      },
      {
        type: 3,
        name: 'model',
        description: 'Underlying model identifier (e.g. gpt-4o, claude-sonnet-4-6)',
        required: false,
      },
      {
        type: 3,
        name: 'version',
        description: 'Agent version string (e.g. 1.0.0)',
        required: false,
      },
    ],
  },
];

async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${APP_ID}/commands`;

  console.log(`Registering ${COMMANDS.length} global command(s)...`);

  const res = await fetch(url, {
    method: 'PUT', // PUT replaces all global commands atomically
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(COMMANDS),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`❌  Discord API error ${res.status}:`, err);
    process.exit(1);
  }

  const registered = await res.json() as Array<{ id: string; name: string }>;
  console.log('✅  Commands registered:');
  for (const cmd of registered) {
    console.log(`   /${cmd.name}  (id: ${cmd.id})`);
  }

  console.log('\nNext: configure Discord interaction endpoint');
  console.log('  Discord Developer Portal → Bot → Interactions Endpoint URL');
  console.log('  Set to: https://www.kakunin.ai/api/integrations/discord/interactions');
}

registerCommands().catch((err) => {
  console.error('❌  Fatal:', err);
  process.exit(1);
});
