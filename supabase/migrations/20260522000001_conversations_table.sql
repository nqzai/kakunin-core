-- Migration: add conversations table for multi-turn chat sessions
-- Week: 11
-- Reason: Support for Discord bot + future web chat widget. Tracks conversation metadata (source, external thread ID, status).
--         Enables multi-turn memory where each conversation can have multiple messages.
-- Author: auto-generated
-- Date: 2026-05-22

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'api' CHECK (source IN ('discord', 'web', 'api', 'email')),
  external_thread_id TEXT, -- Discord thread ID, if applicable
  external_message_id TEXT, -- First message ID (for grouping)
  user_id TEXT, -- Discord user ID, customer ID, or email (not a FK — external identifier)
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'escalated', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations: tenant scope"
  ON conversations FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

CREATE INDEX conversations_tenant_source_thread
  ON conversations(tenant_id, source, external_thread_id) WHERE external_thread_id IS NOT NULL;

CREATE INDEX conversations_tenant_user
  ON conversations(tenant_id, user_id, created_at DESC);

CREATE INDEX conversations_tenant_agent
  ON conversations(tenant_id, agent_id) WHERE agent_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
