import { type NextRequest, NextResponse } from 'next/server';
import { writeAuditLog } from '@/lib/audit/audit-log';
import { createServiceClient } from '@/lib/supabase/server';
import {
  verifyDiscordRequest,
  ephemeralReply,
  ephemeralEmbedReply,
  getOptionValue,
  INTERACTION_TYPE,
  type Interaction,
  type InteractionResponse,
} from '@/lib/discord/interactions';
import { log } from '@/lib/logging';

/**
 * POST /api/integrations/discord/interactions
 *
 * Discord interactions webhook — handles slash commands.
 * Discord sends signed POST requests here when users invoke slash commands.
 *
 * Supported commands:
 *   /agent-register name:<string> model:<string> version:<string>
 *     → Registers agent + issues X.509 certificate via POST /api/v1/agents
 *     → Returns ephemeral message with agent ID and cert serial
 *
 * Auth: Ed25519 signature from Discord (DISCORD_PUBLIC_KEY env var).
 * No API key required — Discord verifies its own signature.
 */
export async function POST(req: NextRequest): Promise<NextResponse<InteractionResponse | { error: string }>> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-signature-ed25519') ?? '';
  const timestamp = req.headers.get('x-signature-timestamp') ?? '';

  const valid = await verifyDiscordRequest(rawBody, signature, timestamp);
  if (!valid) {
    log.warn('[discord-interactions] invalid signature');
    return NextResponse.json({ error: 'Invalid request signature' }, { status: 401 });
  }

  let interaction: Interaction;
  try {
    interaction = JSON.parse(rawBody) as Interaction;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Discord PING — must respond with PONG to pass endpoint verification
  if (interaction.type === INTERACTION_TYPE.PING) {
    return NextResponse.json({ type: 1 });
  }

  // Slash commands
  if (interaction.type === INTERACTION_TYPE.APPLICATION_COMMAND) {
    const commandName = interaction.data?.name;

    if (commandName === 'agent-register') {
      return handleAgentRegister(req, interaction);
    }

    return NextResponse.json(ephemeralReply(`Unknown command: /${commandName}`));
  }

  return NextResponse.json({ error: 'Unhandled interaction type' }, { status: 400 });
}

async function handleAgentRegister(
  _req: NextRequest,
  interaction: Interaction,
): Promise<NextResponse<InteractionResponse>> {
  const options = interaction.data?.options;

  const name = getOptionValue(options, 'name');
  const model = getOptionValue(options, 'model') ?? 'gpt-4o';
  const version = getOptionValue(options, 'version') ?? '1.0.0';
  const invokerUsername =
    interaction.member?.user?.username ?? interaction.user?.username ?? 'unknown';

  if (!name) {
    return NextResponse.json(ephemeralReply('❌ `name` is required.'));
  }

  // Derive tenant from guild_id — guild must have an associated tenant
  const guildId = interaction.guild_id;
  if (!guildId) {
    return NextResponse.json(ephemeralReply('❌ Command must be run in a server, not DMs.'));
  }

  const supabase = createServiceClient();

  // Resolve guild → tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('discord_guild_id', guildId)
    .maybeSingle();

  if (!tenant) {
    return NextResponse.json(
      ephemeralReply(
        '❌ This Discord server is not linked to a Kakunin tenant.\n' +
          'Visit https://www.kakunin.ai/dashboard to connect your server.',
      ),
    );
  }

  const tenantId = tenant.id;

  // Build a model hash from the name + model + version (deterministic, reproducible)
  const hashInput = `${name}-${model}-${version}`;
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
  const modelHash = `sha256:${Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')}`;

  // Insert agent directly — service client has full access; no HTTP round-trip needed
  // (avoids having to pass an API key through middleware for an already-authenticated server action)
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .insert({
      tenant_id: tenantId,
      name,
      model_hash: modelHash,
      model: model ?? null,
      version: version ?? null,
      metadata: {},
      status: 'pending',
    })
    .select('id, name, status')
    .single();

  if (agentError || !agent) {
    log.error('[discord-interactions] agent insert failed', { tenantId, error: agentError });
    return NextResponse.json(
      ephemeralReply('❌ Registration failed. Check dashboard for details.'),
    );
  }

  // Write audit log
  await writeAuditLog(supabase, {
    tenant_id: tenantId,
    event_type: 'agent.registered',
    actor_type: 'user',
    actor_id: interaction.member?.user?.id ?? interaction.user?.id ?? 'discord-unknown',
    description: `Agent registered via Discord /agent-register by ${invokerUsername}`,
    affected_id: agent.id,
    metadata: {
      source: 'discord',
      guild_id: guildId,
      discord_username: invokerUsername,
      model,
      version,
    },
  });

  log.info('[discord-interactions] agent registered', {
    tenantId,
    agentId: agent.id,
    invoker: invokerUsername,
  });

  return NextResponse.json(
    ephemeralEmbedReply('✅ Agent registered!', {
      title: `Agent: ${agent.name}`,
      description:
        `**ID:** \`${agent.id}\`\n` +
        `**Status:** ${agent.status}\n` +
        `**Model:** ${model} v${version}\n\n` +
        `Certificate will be issued automatically.\n` +
        `Track progress: https://www.kakunin.ai/dashboard`,
      color: 0x22c55e,
    }),
  );
}
