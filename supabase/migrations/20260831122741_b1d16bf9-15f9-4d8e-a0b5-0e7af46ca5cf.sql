-- ============================================================
-- 2FA (TOTP) opcional por usuário + gate de MFA em dados sensíveis
-- Idempotente e não destrutivo.
-- ============================================================

-- 1) Tabelas -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_security (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  two_factor_enabled boolean NOT NULL DEFAULT false,
  totp_secret_encrypted text,
  pending_secret_encrypted text,
  pending_created_at timestamptz,
  enabled_at timestamptz,
  last_verified_at timestamptz,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_recovery_codes_user ON public.user_recovery_codes(user_id);

CREATE TABLE IF NOT EXISTS public.user_mfa_sessions (
  session_id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ip_address text,
  user_agent text
);
CREATE INDEX IF NOT EXISTS idx_user_mfa_sessions_user ON public.user_mfa_sessions(user_id);

-- Segredos: NENHUM grant para anon/authenticated. Somente service_role (backend).
REVOKE ALL ON public.user_security FROM anon, authenticated;
REVOKE ALL ON public.user_recovery_codes FROM anon, authenticated;
REVOKE ALL ON public.user_mfa_sessions FROM anon, authenticated;
GRANT ALL ON public.user_security TO service_role;
GRANT ALL ON public.user_recovery_codes TO service_role;
GRANT ALL ON public.user_mfa_sessions TO service_role;

ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recovery_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_mfa_sessions ENABLE ROW LEVEL SECURITY;
-- Sem policies: nenhum acesso via Data API. service_role (BYPASSRLS) acessa pelo backend.

-- updated_at
CREATE OR REPLACE FUNCTION public.user_security_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_user_security_touch ON public.user_security;
CREATE TRIGGER trg_user_security_touch BEFORE UPDATE ON public.user_security
FOR EACH ROW EXECUTE FUNCTION public.user_security_touch();

-- 2) Helpers -------------------------------------------------
-- Dono da conta -> subusuário (hierarquia atual via profiles.parent_owner_id)
CREATE OR REPLACE FUNCTION public.is_my_account_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _uid AND p.parent_owner_id = auth.uid()
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_my_account_member(uuid) TO authenticated;

-- Gate de MFA: true se o usuário não usa 2FA OU se a sessão atual já validou o 2º fator
CREATE OR REPLACE FUNCTION public.mfa_satisfied()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN true
    WHEN NOT EXISTS (
      SELECT 1 FROM public.user_security s
      WHERE s.user_id = auth.uid() AND s.two_factor_enabled
    ) THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.user_mfa_sessions m
      WHERE m.user_id = auth.uid()
        AND m.session_id = COALESCE(auth.jwt() ->> 'session_id', '')
        AND m.expires_at > now()
    )
  END;
$$;
GRANT EXECUTE ON FUNCTION public.mfa_satisfied() TO authenticated;

-- 3) View de status (sem segredos) ---------------------------
DROP VIEW IF EXISTS public.user_2fa_status;
CREATE VIEW public.user_2fa_status AS
  SELECT s.user_id,
         s.two_factor_enabled,
         s.enabled_at,
         s.updated_at
  FROM public.user_security s
  WHERE s.user_id = auth.uid() OR public.is_my_account_member(s.user_id);
GRANT SELECT ON public.user_2fa_status TO authenticated;

-- 4) Gate restritivo em dados sensíveis (só afeta quem ATIVOU 2FA)
DROP POLICY IF EXISTS "mfa_gate" ON public.chat_conversations;
CREATE POLICY "mfa_gate" ON public.chat_conversations AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.mfa_satisfied());

DROP POLICY IF EXISTS "mfa_gate" ON public.chat_messages;
CREATE POLICY "mfa_gate" ON public.chat_messages AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.mfa_satisfied());

DROP POLICY IF EXISTS "mfa_gate" ON public.user_waba_connections;
CREATE POLICY "mfa_gate" ON public.user_waba_connections AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.mfa_satisfied());

DROP POLICY IF EXISTS "mfa_gate" ON public.user_instagram_connections;
CREATE POLICY "mfa_gate" ON public.user_instagram_connections AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.mfa_satisfied());

DROP POLICY IF EXISTS "mfa_gate" ON public.user_ai_credentials;
CREATE POLICY "mfa_gate" ON public.user_ai_credentials AS RESTRICTIVE
  FOR ALL TO authenticated USING (public.mfa_satisfied());