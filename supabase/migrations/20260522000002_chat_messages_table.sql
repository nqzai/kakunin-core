-- Migration: add chat_messages table for conversation history
-- Week: 11
-- Reason: Stores both user and assistant messages within conversations. Enables context fetching for multi-turn replies.
--         Denormalized tenant_id for audit_log consistency and RLS performance.
--         model_used + tokens_in/out for usage tracking and cost attribution.
-- Author: auto-generated
-- Date: 2026-05-22

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL, -- denormalized for audit and RLS efficiency
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_in INTEGER,
  tokens_out INTEGER,
  model_used TEXT, -- e.g., 'claude-sonnet-4-5', 'deepseek-v4-flash:free'
  needs_human_review BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages: tenant scope"
  ON chat_messages FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE auth.uid()::text = id::text));

CREATE INDEX chat_messages_conversation_created
  ON chat_messages(conversation_id, created_at DESC);

CREATE INDEX chat_messages_tenant_created
  ON chat_messages(tenant_id, created_at DESC);

CREATE INDEX chat_messages_needs_review
  ON chat_messages(tenant_id, needs_human_review) WHERE needs_human_review = true;

GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
