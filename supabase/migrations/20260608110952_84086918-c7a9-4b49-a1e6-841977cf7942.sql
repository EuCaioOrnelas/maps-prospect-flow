UPDATE public.company_profiles
SET owner_user_id = user_id
WHERE owner_user_id IS NULL;

DROP POLICY IF EXISTS "Users can view own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Users can insert own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Users can update own company profile" ON public.company_profiles;
DROP POLICY IF EXISTS "Account members view company_profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Account members create company_profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Account members update company_profiles" ON public.company_profiles;
DROP POLICY IF EXISTS "Account members delete company_profiles" ON public.company_profiles;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_profiles TO authenticated;
GRANT ALL ON public.company_profiles TO service_role;

CREATE POLICY "Account members view company_profiles"
ON public.company_profiles
FOR SELECT
TO authenticated
USING (public.is_account_member(COALESCE(owner_user_id, user_id)));

CREATE POLICY "Account members create company_profiles"
ON public.company_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id, public.current_account_owner())));

CREATE POLICY "Account members update company_profiles"
ON public.company_profiles
FOR UPDATE
TO authenticated
USING (public.is_account_member(COALESCE(owner_user_id, user_id)))
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id)));

CREATE POLICY "Account members delete company_profiles"
ON public.company_profiles
FOR DELETE
TO authenticated
USING (public.is_account_member(COALESCE(owner_user_id, user_id)));