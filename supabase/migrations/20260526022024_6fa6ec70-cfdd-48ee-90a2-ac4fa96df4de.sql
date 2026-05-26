CREATE OR REPLACE FUNCTION public.register_partner_click(
  _referral_code text,
  _referral_link_slug text DEFAULT NULL,
  _landing_page text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _utm_source text DEFAULT NULL,
  _utm_medium text DEFAULT NULL,
  _utm_campaign text DEFAULT NULL,
  _utm_term text DEFAULT NULL,
  _utm_content text DEFAULT NULL,
  _session_id text DEFAULT NULL
)
RETURNS TABLE(click_id uuid, partner_id uuid, referral_link_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := lower(trim(_referral_code));
  v_partner_id uuid;
  v_link_id uuid;
  v_click_id uuid;
BEGIN
  IF v_code IS NULL OR length(v_code) = 0 THEN
    RETURN;
  END IF;

  SELECT id INTO v_partner_id
  FROM public.partners
  WHERE referral_code = v_code AND status = 'active'
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  IF _referral_link_slug IS NOT NULL AND length(trim(_referral_link_slug)) > 0 THEN
    SELECT id INTO v_link_id
    FROM public.partner_referral_links
    WHERE slug = lower(trim(_referral_link_slug))
      AND partner_id = v_partner_id
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
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

  RETURN QUERY SELECT v_click_id, v_partner_id, v_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_partner_click(text,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_partner_click(text,text,text,text,text,text,text,text,text,text) TO anon, authenticated;
