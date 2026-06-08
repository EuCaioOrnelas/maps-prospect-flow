SET lock_timeout = '5s';

DROP POLICY IF EXISTS "Owners/admins insert crm_tags" ON public.crm_tags;
CREATE POLICY "Account members insert crm_tags"
ON public.crm_tags
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));

DROP POLICY IF EXISTS "Owners/admins update crm_tags" ON public.crm_tags;
CREATE POLICY "Account members update crm_tags"
ON public.crm_tags
FOR UPDATE
TO authenticated
USING (public.is_account_member(owner_user_id))
WITH CHECK (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Owners/admins delete crm_tags" ON public.crm_tags;
CREATE POLICY "Account members delete crm_tags"
ON public.crm_tags
FOR DELETE
TO authenticated
USING (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Owners/admins insert lead_origins" ON public.lead_origins;
CREATE POLICY "Account members insert lead_origins"
ON public.lead_origins
FOR INSERT
TO authenticated
WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));

DROP POLICY IF EXISTS "Owners/admins update lead_origins" ON public.lead_origins;
CREATE POLICY "Account members update lead_origins"
ON public.lead_origins
FOR UPDATE
TO authenticated
USING (public.is_account_member(owner_user_id))
WITH CHECK (public.is_account_member(owner_user_id));

DROP POLICY IF EXISTS "Owners/admins delete lead_origins" ON public.lead_origins;
CREATE POLICY "Account members delete lead_origins"
ON public.lead_origins
FOR DELETE
TO authenticated
USING (public.is_account_member(owner_user_id));