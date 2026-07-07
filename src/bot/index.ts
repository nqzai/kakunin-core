/**
 * Discord Bot Entry Point
 *
 * Persistent Node.js process — runs on Railway (not Vercel).
 * Initializes discord.js client and keeps it alive.
 *
 * Start: npx tsx src/bot/index.ts
 * Env vars required: DISCORD_BOT_TOKEN, QSTASH_TOKEN, QSTASH_URL, NEXT_PUBLIC_APP_URL
 */

import 'dotenv/config';
import { initializeDiscordClient } from '../lib/discord/client';
import { log } from '../lib/logging';

async function main() {
  log.info('[bot] starting Kakunin Discord bot');

  const required = ['DISCORD_BOT_TOKEN', 'QSTASH_TOKEN', 'NEXT_PUBLIC_APP_URL'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    log.error('[bot] missing env vars', { missing: missing.join(', ') });
    process.exit(1);
  }

  try {
    const client = await initializeDiscordClient();
    log.info('[bot] online', { tag: client.user?.tag });
  } catch (err) {
    log.error('[bot] failed to start', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }

  // Keep process alive — discord.js handles reconnects automatically
  process.on('SIGTERM', () => {
    log.info('[bot] SIGTERM received, shutting down');
    process.exit(0);
  });
}

main();
