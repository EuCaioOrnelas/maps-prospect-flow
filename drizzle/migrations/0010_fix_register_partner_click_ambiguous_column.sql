CREATE OR REPLACE FUNCTION public.register_partner_click(_referral_code text, _referral_link_slug text DEFAULT NULL::text, _landing_page text DEFAULT NULL::text, _user_agent text DEFAULT NULL::text, _utm_source text DEFAULT NULL::text, _utm_medium text DEFAULT NULL::text, _utm_campaign text DEFAULT NULL::text, _utm_term text DEFAULT NULL::text, _utm_content text DEFAULT NULL::text, _session_id text DEFAULT NULL::text)
 RETURNS TABLE(click_id uuid, partner_id uuid, referral_link_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_code text := lower(trim(_referral_code));
  v_partner_id uuid;
  v_link_id uuid;
  v_click_id uuid;
BEGIN
  IF v_code IS NULL OR length(v_code) = 0 THEN
    RETURN;
  END IF;

  SELECT p.id INTO v_partner_id
  FROM public.partners p
  WHERE lower(p.referral_code) = v_code AND p.status = 'active'
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  IF _referral_link_slug IS NOT NULL AND length(trim(_referral_link_slug)) > 0 THEN
    SELECT l.id INTO v_link_id
    FROM public.partner_referral_links l
    WHERE lower(l.slug) = lower(trim(_referral_link_slug))
      AND l.partner_id = v_partner_id
      AND l.is_active = true
      AND (l.expires_at IS NULL OR l.expires_at > now())
    LIMIT 1;
  END IF;

  INSERT INTO public.partner_clicks (
    partner_id, referral_code, referral_link_id,
    landing_page, user_agent,
    utm_source, utm_medium, utm_campaign, utm_term, utm_content,
    session_id
  ) VALUES (
    v_partner_id, v_code, v_link_id,
    _landing_page, left(coalesce(_user_agent, ''), 500),
    _utm_source, _utm_medium, _utm_campaign, _utm_term, _utm_content,
    coalesce(_session_id, gen_random_uuid()::text)
  )
  RETURNING id INTO v_click_id;

  IF v_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(v_link_id);
  END IF;

  RETURN QUERY SELECT v_click_id, v_partner_id, v_link_id;
END;
$function$;