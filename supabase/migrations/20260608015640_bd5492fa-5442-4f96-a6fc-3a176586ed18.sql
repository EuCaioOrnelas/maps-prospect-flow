
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;

DROP POLICY IF EXISTS account_members_select_own_account ON public.account_members;
CREATE POLICY account_members_select_own_account
ON public.account_members FOR SELECT
TO authenticated
USING (
  owner_user_id = auth.uid()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.parent_owner_id = public.account_members.owner_user_id
      AND p.account_role IN ('owner','admin')
  )
);
