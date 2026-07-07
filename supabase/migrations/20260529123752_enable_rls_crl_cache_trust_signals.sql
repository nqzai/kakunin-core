-- Migration: enable RLS on crl_cache + trust_signals
-- Week: pilot-hardening (RA-161)
-- Reason: Supabase advisor flagged both public tables as rls_disabled_in_public
--         (ERROR) — reachable via PostgREST by anon/authenticated. Both are
--         system tables written/read only by server-side service-role code
--         (lib/certificates/crl.ts, the trust-signals cron). service_role
--         bypasses RLS, so enabling RLS with no permissive policy locks out
--         anon/authenticated while leaving server flows untouched.
-- Author: RA-161 Codex review remediation (advisor follow-up)
-- Date: 2026-05-29

ALTER TABLE public.crl_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_signals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.crl_cache FROM anon, authenticated;
REVOKE ALL ON public.trust_signals FROM anon, authenticated;

GRANT ALL ON public.crl_cache TO service_role;
GRANT ALL ON public.trust_signals TO service_role;

COMMENT ON TABLE public.crl_cache IS
  'System table — CRL cache. Service-role only (RLS enabled, no anon/authenticated policy).';
COMMENT ON TABLE public.trust_signals IS
  'System table — compliance news feed. Service-role only (RLS enabled, no anon/authenticated policy).';
