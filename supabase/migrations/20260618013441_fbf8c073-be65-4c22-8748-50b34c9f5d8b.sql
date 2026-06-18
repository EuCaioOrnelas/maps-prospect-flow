DROP POLICY IF EXISTS "Users can view own meta campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Users can insert own meta campaigns" ON public.meta_campaigns;
DROP POLICY IF EXISTS "Users can delete own meta campaigns" ON public.meta_campaigns;

CREATE POLICY "Account users can view meta campaigns"
ON public.meta_campaigns
FOR SELECT
TO authenticated
USING (owner_user_id = public.get_account_owner(auth.uid()));

CREATE POLICY "Users can insert own meta campaigns"
ON public.meta_campaigns
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own meta campaigns"
ON public.meta_campaigns
FOR DELETE
TO authenticated
USING (user_id = auth.uid());