-- Fix critical RLS holes that prevented partner referral attribution from working

-- 1) Public lookup of an active partner by referral_code (anon + authenticated)
--    SECURITY DEFINER so we don't have to expose the partners table to anon.
CREATE OR REPLACE FUNCTION public.lookup_active_partner_by_code(_code text)
RETURNS TABLE(partner_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partners
  WHERE referral_code = lower(trim(_code))
    AND status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_active_partner_by_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_active_partner_by_code(text) TO anon, authenticated;

-- 2) Public lookup of an active referral link (slug must match partner)
CREATE OR REPLACE FUNCTION public.lookup_active_referral_link(_slug text, _partner_id uuid)
RETURNS TABLE(link_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.partner_referral_links
  WHERE slug = lower(trim(_slug))
    AND partner_id = _partner_id
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.lookup_active_referral_link(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_active_referral_link(text, uuid) TO anon, authenticated;

-- 3) Allow a newly-authenticated user to self-attribute by inserting their own partner_leads row.
DROP POLICY IF EXISTS "Users can self-attribute partner lead" ON public.partner_leads;
CREATE POLICY "Users can self-attribute partner lead"
ON public.partner_leads
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) Allow that same user to mark their click as converted (only their own click can be tagged).
DROP POLICY IF EXISTS "Users can mark own click converted" ON public.partner_clicks;
CREATE POLICY "Users can mark own click converted"
ON public.partner_clicks
FOR UPDATE
TO authenticated
USING (converted_user_id IS NULL)
WITH CHECK (converted_user_id = auth.uid());
