-- Defense in depth: audit log is write-only via backend
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.security_audit_log FROM anon, authenticated;
REVOKE SELECT ON public.security_audit_log FROM anon;
GRANT SELECT ON public.security_audit_log TO authenticated;
GRANT ALL ON public.security_audit_log TO service_role;

-- Anti-replay for TOTP codes (a code can only be used once)
ALTER TABLE public.user_security ADD COLUMN IF NOT EXISTS last_totp_counter BIGINT;