-- ============================================================
-- Phase 5: Security audit fixes
-- 1) Block privilege escalation via profiles.account_role / account_owner_id
-- 2) Extend RLS on chat/WABA tables to honor account membership
-- ============================================================

-- 1) Patch the sensitive-fields trigger to also protect account_role and account_owner_id
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_service_role boolean;
  is_superuser boolean;
BEGIN
  is_service_role := (
    auth.uid() IS NULL AND
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );
  is_superuser := (
    session_user = current_user AND
    current_setting('role', true) IN ('rds_superuser', 'supabase_admin', 'postgres')
  );

  IF is_service_role OR is_superuser THEN
    RETURN NEW;
  END IF;

  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.plan IS DISTINCT FROM OLD.plan THEN
    RAISE EXCEPTION 'Não é permitido alterar o plano diretamente';
  END IF;
  IF NEW.searches_limit IS DISTINCT FROM OLD.searches_limit THEN
    RAISE EXCEPTION 'Não é permitido alterar o limite de buscas';
  END IF;
  IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
    RAISE EXCEPTION 'Não é permitido alterar o status de bloqueio';
  END IF;
  IF NEW.fraud_flags IS DISTINCT FROM OLD.fraud_flags THEN
    RAISE EXCEPTION 'Não é permitido alterar flags de fraude';
  END IF;
  IF NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint THEN
    RAISE EXCEPTION 'Não é permitido alterar fingerprint do dispositivo';
  END IF;
  IF NEW.signup_ip IS DISTINCT FROM OLD.signup_ip THEN
    RAISE EXCEPTION 'Não é permitido alterar IP de cadastro';
  END IF;

  -- NEW: prevent self-escalation of multi-user role / account ownership
  IF NEW.account_role IS DISTINCT FROM OLD.account_role THEN
    RAISE EXCEPTION 'Não é permitido alterar o papel da conta (account_role) diretamente';
  END IF;
  IF NEW.account_owner_id IS DISTINCT FROM OLD.account_owner_id THEN
    RAISE EXCEPTION 'Não é permitido alterar a conta associada (account_owner_id) diretamente';
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Chat / WABA / numbers RLS aligned with account membership
--    Owner/admin see everything in the account; operational sees only their own (responsible).

-- whatsapp_numbers
DROP POLICY IF EXISTS "Users can view their own numbers" ON public.whatsapp_numbers;
CREATE POLICY "Account members view numbers (scoped by role)"
ON public.whatsapp_numbers FOR SELECT
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own numbers" ON public.whatsapp_numbers;
CREATE POLICY "Account members update numbers (scoped by role)"
ON public.whatsapp_numbers FOR UPDATE
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own numbers" ON public.whatsapp_numbers;
CREATE POLICY "Owners/admins delete numbers"
ON public.whatsapp_numbers FOR DELETE
USING (
  public.is_account_member(user_id)
  AND public.current_account_role() IN ('owner','admin')
);

-- user_waba_connections
DROP POLICY IF EXISTS "Users can view own waba connections" ON public.user_waba_connections;
CREATE POLICY "Account members view waba connections (scoped by role)"
ON public.user_waba_connections FOR SELECT
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own waba connections" ON public.user_waba_connections;
CREATE POLICY "Account members update waba connections (scoped by role)"
ON public.user_waba_connections FOR UPDATE
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own waba connections" ON public.user_waba_connections;
CREATE POLICY "Owners/admins delete waba connections"
ON public.user_waba_connections FOR DELETE
USING (
  public.is_account_member(user_id)
  AND public.current_account_role() IN ('owner','admin')
);

-- chat_conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Account members view chat conversations (scoped by role)"
ON public.chat_conversations FOR SELECT
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Account members update chat conversations (scoped by role)"
ON public.chat_conversations FOR UPDATE
USING (
  public.is_account_member(user_id)
  AND (
    public.current_account_role() IN ('owner','admin')
    OR responsible_user_id = auth.uid()
    OR user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Owners/admins delete chat conversations"
ON public.chat_conversations FOR DELETE
USING (
  public.is_account_member(user_id)
  AND public.current_account_role() IN ('owner','admin')
);