-- Migration: add debug_chat_enabled to feature_flags
-- Week: 10
-- Reason: Debug chat assistant — off by default, toggled per tenant via Retool admin
-- Date: 2026-05-19

ALTER TABLE feature_flags
  ADD COLUMN IF NOT EXISTS debug_chat_enabled BOOLEAN NOT NULL DEFAULT false;
