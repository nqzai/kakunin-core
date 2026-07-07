-- Migration: add message_signed and message_verification_failed to behavior_events action_type CHECK
-- Week: V1.1
-- Reason: Inter-agent message signing (RA-73) adds two new action types for cryptographic
--         message signing events. message_verification_failed is treated as high-risk (0.95)
--         and triggers risk.alert webhook — equivalent to unauthorized_access_attempt.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE behavior_events DROP CONSTRAINT IF EXISTS behavior_events_action_type_check;

ALTER TABLE behavior_events ADD CONSTRAINT behavior_events_action_type_check CHECK (action_type IN (
  'api_call', 'authentication_attempt', 'authentication_failure',
  'data_access', 'data_mutation', 'transaction_initiated',
  'transaction_anomaly', 'unauthorized_access_attempt',
  'message_signed', 'message_verification_failed'
));
