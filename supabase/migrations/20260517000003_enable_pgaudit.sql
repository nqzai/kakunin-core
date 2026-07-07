-- Migration: enable pgaudit extension for tamper-evident audit_log protection
-- Week: 9
-- Reason: RA-59 — PostgreSQL RULE immutability alone does not satisfy WORM requirements.
--         pgaudit logs all DDL + role changes on audit_log, providing tamper evidence
--         for the audit mechanism itself. Required for enterprise security reviews.
-- Author: auto-generated
-- Date: 2026-05-17

-- Enable pgaudit — available on Supabase by default
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- Configure pgaudit to log DDL operations on the audit_log table.
-- Applies to the current session; permanent config lives in supabase dashboard
-- under Database → Extensions → pgaudit settings.
-- DDL includes: ALTER TABLE, DROP TABLE, CREATE RULE, DROP RULE on audit_log.
ALTER SYSTEM SET pgaudit.log = 'ddl, role';
ALTER SYSTEM SET pgaudit.log_relation = 'on';
SELECT pg_reload_conf();
