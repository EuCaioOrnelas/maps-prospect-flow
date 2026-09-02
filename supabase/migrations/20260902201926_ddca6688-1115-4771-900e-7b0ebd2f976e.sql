REVOKE EXECUTE ON FUNCTION public.generate_commission_for_sale() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalc_partner_level(uuid, text) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_partner_referral_link_stats(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.partner_create_referral_link(text, text) FROM anon;