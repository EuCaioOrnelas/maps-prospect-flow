DROP VIEW IF EXISTS public.user_2fa_status;

CREATE OR REPLACE FUNCTION public.get_2fa_status(_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, two_factor_enabled boolean, enabled_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.user_id, s.two_factor_enabled, s.enabled_at
  FROM public.user_security s
  WHERE s.user_id = COALESCE(_user_id, auth.uid())
    AND (s.user_id = auth.uid() OR public.is_my_account_member(s.user_id));
$$;

REVOKE EXECUTE ON FUNCTION public.get_2fa_status(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_2fa_status(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_my_account_member(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.mfa_satisfied() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_my_account_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mfa_satisfied() TO authenticated, anon;