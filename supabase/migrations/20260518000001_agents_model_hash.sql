-- Migration: add model_hash column to agents table
-- Week: V1.0 hotfix
-- Reason: model_hash is required for X.509 cert binding and Audit Test #1 (trade reconstruction).
--         Certs issued without model_hash cannot prove which model version made a decision.
--         Ref: RCM C-B1, MiCA Art. 63, EU AI Act Art. 9/12. Closes RA-72.
-- Author: auto-generated
-- Date: 2026-05-18

ALTER TABLE agents ADD COLUMN model_hash TEXT;

COMMENT ON COLUMN agents.model_hash IS
  'SHA-256 hash of the model artifact (or a canonical version string). '
  'Required for certificate issuance — certs encode this value in the X.509 extension '
  'so regulators can prove which model version made each decision.';
