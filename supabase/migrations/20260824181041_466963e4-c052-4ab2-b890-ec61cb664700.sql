CREATE OR REPLACE FUNCTION public.resolve_partner_referral_link(_slug text)
RETURNS TABLE(referral_code text, utm_source text, utm_medium text, utm_campaign text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.referral_code, prl.utm_source, prl.utm_medium, prl.utm_campaign
  FROM public.partner_referral_links prl
  JOIN public.partners p ON p.id = prl.partner_id
  WHERE lower(prl.slug) = lower(btrim(coalesce(_slug, '')))
    AND prl.is_active = true
    AND (prl.expires_at IS NULL OR prl.expires_at > now())
    AND p.status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_partner_referral_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_partner_referral_link(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recompute_partner_totals(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_partner_id IS NULL THEN RETURN; END IF;

  UPDATE public.partners p
  SET
    total_clicks = COALESCE((SELECT count(*)::int FROM public.partner_clicks pc WHERE pc.partner_id = p_partner_id), 0),
    total_leads = COALESCE((SELECT count(*)::int FROM public.partner_leads pl WHERE pl.partner_id = p_partner_id), 0),
    total_paid_clients = COALESCE((
      SELECT count(DISTINCT u)::int FROM (
        SELECT pl.user_id AS u FROM public.partner_leads pl
        WHERE pl.partner_id = p_partner_id AND pl.is_paid = true AND pl.is_cancelled = false
        UNION
        SELECT ps.customer_user_id FROM public.partner_sales ps
        WHERE ps.partner_id = p_partner_id
      ) s
    ), 0),
    lifetime_revenue_cents = COALESCE((SELECT sum(ps.amount_cents)::bigint FROM public.partner_sales ps WHERE ps.partner_id = p_partner_id), 0),
    updated_at = now()
  WHERE p.id = p_partner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recompute_partner_totals(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.partners LOOP
    PERFORM public.recompute_partner_totals(r.id);
  END LOOP;
END $$;