
-- Backfill owner_user_id
UPDATE public.campaign_drafts d
SET owner_user_id = COALESCE(d.owner_user_id, (SELECT COALESCE(p.parent_owner_id, d.user_id) FROM public.profiles p WHERE p.id = d.user_id))
WHERE owner_user_id IS NULL;

-- Replace policies
DROP POLICY IF EXISTS "Users can view their own drafts" ON public.campaign_drafts;
DROP POLICY IF EXISTS "Users can create their own drafts" ON public.campaign_drafts;
DROP POLICY IF EXISTS "Users can update their own drafts" ON public.campaign_drafts;
DROP POLICY IF EXISTS "Users can delete their own drafts" ON public.campaign_drafts;

CREATE POLICY "Account members view drafts" ON public.campaign_drafts
  FOR SELECT USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members create drafts" ON public.campaign_drafts
  FOR INSERT WITH CHECK (public.is_account_member(COALESCE(owner_user_id, public.current_account_owner())));
CREATE POLICY "Account members update drafts" ON public.campaign_drafts
  FOR UPDATE USING (public.is_account_member(COALESCE(owner_user_id, user_id))) WITH CHECK (public.is_account_member(COALESCE(owner_user_id, user_id)));
CREATE POLICY "Account members delete drafts" ON public.campaign_drafts
  FOR DELETE USING (public.is_account_member(COALESCE(owner_user_id, user_id)));
