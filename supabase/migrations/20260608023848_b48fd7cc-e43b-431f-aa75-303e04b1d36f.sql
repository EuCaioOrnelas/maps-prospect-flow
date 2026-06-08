SET lock_timeout = '5s';

CREATE OR REPLACE FUNCTION public.is_account_member(_target_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _target_owner IS NOT NULL
    AND (
      _target_owner = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.parent_owner_id = _target_owner
      )
      OR EXISTS (
        SELECT 1
        FROM public.account_members am
        WHERE am.owner_user_id = _target_owner
          AND am.user_id = auth.uid()
          AND am.status = 'active'
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.get_account_owner(_uid uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT p.parent_owner_id FROM public.profiles p WHERE p.id = _uid),
    (SELECT am.owner_user_id FROM public.account_members am WHERE am.user_id = _uid AND am.status = 'active' LIMIT 1),
    _uid
  );
$$;

DROP POLICY IF EXISTS "Account members update leads" ON public.leads;
CREATE POLICY "Account members update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (public.is_account_member(owner_user_id))
WITH CHECK (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Account members create leads" ON public.leads;
CREATE POLICY "Account members create leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));

DROP POLICY IF EXISTS "Account members view leads" ON public.leads;
CREATE POLICY "Account members view leads"
ON public.leads
FOR SELECT
TO authenticated
USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "account_members_select_own_account" ON public.account_members;
CREATE POLICY "account_members_select_own_account"
ON public.account_members
FOR SELECT
TO authenticated
USING (public.is_account_member(owner_user_id));