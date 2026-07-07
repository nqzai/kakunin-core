-- Migration: add discord_guild_id to tenants
-- Week: post-MVP
-- Reason: Discord /agent-register slash command resolves guild_id to tenant
--         so commands can be run in Discord without explicit tenant ID input
-- Author: auto-generated
-- Date: 2026-05-25

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS discord_guild_id TEXT UNIQUE;

-- Index for guild_id lookups in the interactions webhook (hot path)
CREATE INDEX IF NOT EXISTS tenants_discord_guild_id_idx
  ON public.tenants (discord_guild_id)
  WHERE discord_guild_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenants TO authenticated;
GRANT ALL ON public.tenants TO service_role;
