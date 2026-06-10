CREATE OR REPLACE FUNCTION public.recompute_partner_referral_link_stats(p_referral_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_referral_link_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.partner_referral_links prl
  SET
    total_clicks = COALESCE((
      SELECT count(*)::int
      FROM public.partner_clicks pc
      WHERE pc.referral_link_id = p_referral_link_id
    ), 0),
    total_leads = COALESCE((
      SELECT count(*)::int
      FROM public.partner_leads pl
      WHERE pl.referral_link_id = p_referral_link_id
    ), 0),
    total_paid_clients = COALESCE((
      SELECT count(*)::int
      FROM public.partner_leads pl
      WHERE pl.referral_link_id = p_referral_link_id
        AND pl.is_paid = true
    ), 0),
    updated_at = now()
  WHERE prl.id = p_referral_link_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.attribute_partner_lead(
  p_user_id uuid,
  p_email text,
  p_name text DEFAULT NULL,
  p_referral_code text DEFAULT NULL,
  p_click_id uuid DEFAULT NULL,
  p_partner_id uuid DEFAULT NULL,
  p_referral_link_id uuid DEFAULT NULL,
  p_source text DEFAULT 'client'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := p_partner_id;
  v_referral_link_id uuid := p_referral_link_id;
  v_referral_code text := lower(nullif(trim(coalesce(p_referral_code, '')), ''));
  v_click_referral_code text;
  v_check jsonb;
  v_lead_id uuid;
  v_existing_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'missing_user');
  END IF;

  IF p_source IS DISTINCT FROM 'auth_trigger' THEN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'not_allowed_partner_attribution' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF p_click_id IS NOT NULL THEN
    SELECT pc.partner_id, pc.referral_link_id, pc.referral_code
      INTO v_partner_id, v_referral_link_id, v_click_referral_code
    FROM public.partner_clicks pc
    WHERE pc.id = p_click_id
    LIMIT 1;

    IF v_referral_code IS NULL THEN
      v_referral_code := lower(v_click_referral_code);
    END IF;
  END IF;

  IF v_partner_id IS NULL AND v_referral_code IS NOT NULL THEN
    SELECT p.id
      INTO v_partner_id
    FROM public.partners p
    WHERE lower(p.referral_code) = v_referral_code
      AND p.status = 'active'
    LIMIT 1;
  END IF;

  IF v_partner_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'partner_not_found');
  END IF;

  IF v_referral_link_id IS NOT NULL THEN
    SELECT prl.id
      INTO v_referral_link_id
    FROM public.partner_referral_links prl
    WHERE prl.id = v_referral_link_id
      AND prl.partner_id = v_partner_id
      AND prl.is_active = true
      AND (prl.expires_at IS NULL OR prl.expires_at > now())
    LIMIT 1;
  END IF;

  v_check := public.check_partner_self_referral(v_partner_id, p_user_id);
  IF COALESCE((v_check->>'blocked')::boolean, false) THEN
    INSERT INTO public.partner_fraud_attempts (
      partner_id, user_id, email, reason, matched_field, metadata
    ) VALUES (
      v_partner_id,
      p_user_id,
      p_email,
      COALESCE(v_check->>'reason', 'self_referral'),
      v_check->>'matched_field',
      jsonb_build_object('source', p_source, 'click_id', p_click_id)
    );

    RETURN jsonb_build_object('ok', false, 'status', 'blocked', 'reason', v_check->>'reason');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.partner_leads
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.partner_leads (
      partner_id,
      user_id,
      email,
      name,
      click_id,
      referral_link_id,
      is_trial,
      attributed_at
    ) VALUES (
      v_partner_id,
      p_user_id,
      COALESCE(NULLIF(trim(p_email), ''), 'sem-email@wiize.local'),
      NULLIF(trim(coalesce(p_name, '')), ''),
      p_click_id,
      v_referral_link_id,
      true,
      now()
    )
    RETURNING id INTO v_lead_id;
  ELSE
    v_lead_id := v_existing_id;
  END IF;

  IF p_click_id IS NOT NULL THEN
    UPDATE public.partner_clicks
    SET converted_to_lead_at = COALESCE(converted_to_lead_at, now()),
        converted_user_id = COALESCE(converted_user_id, p_user_id)
    WHERE id = p_click_id
      AND partner_id = v_partner_id;
  END IF;

  IF v_referral_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(v_referral_link_id);
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'status', CASE WHEN v_existing_id IS NULL THEN 'created' ELSE 'already_attributed' END,
    'lead_id', v_lead_id,
    'partner_id', v_partner_id,
    'referral_link_id', v_referral_link_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.attribute_partner_lead(uuid,text,text,text,uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribute_partner_lead(uuid,text,text,text,uuid,uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recompute_partner_referral_link_stats(uuid) TO authenticated, service_role;

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
  WHERE lower(referral_code) = v_code AND status = 'active'
  LIMIT 1;

  IF v_partner_id IS NULL THEN
    RETURN;
  END IF;

  IF _referral_link_slug IS NOT NULL AND length(trim(_referral_link_slug)) > 0 THEN
    SELECT id INTO v_link_id
    FROM public.partner_referral_links
    WHERE lower(slug) = lower(trim(_referral_link_slug))
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

  IF v_link_id IS NOT NULL THEN
    PERFORM public.recompute_partner_referral_link_stats(v_link_id);
  END IF;

  RETURN QUERY SELECT v_click_id, v_partner_id, v_link_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_partner_click(text,text,text,text,text,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_partner_click(text,text,text,text,text,text,text,text,text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_with_card boolean := false;
  v_stripe_whitelisted boolean := false;
  v_trial_plan text := null;
  v_trial_will_charge_at timestamptz := null;
  v_plan text := 'free';
  v_searches_limit int := 120;
  v_subscription_end timestamptz := null;
  v_trial_start timestamptz := now();
  v_trial_end timestamptz;
  v_requires_payment boolean := false;
  v_provider text := null;
  v_billing_period text := null;
  v_extra_numbers int := 0;
  v_extra_contacts int := 0;
  v_extra_opps int := 0;
  v_partner_click_id uuid := null;
  v_partner_id uuid := null;
  v_partner_referral_link_id uuid := null;
  v_profile_name text;
BEGIN
  v_trial_with_card := COALESCE(NEW.raw_user_meta_data ->> 'trial_with_card', 'false') = 'true';
  v_stripe_whitelisted := COALESCE(NEW.raw_user_meta_data ->> 'stripe_whitelisted', 'false') = 'true';
  v_trial_plan := NEW.raw_user_meta_data ->> 'trial_plan_chosen';
  v_provider := NEW.raw_app_meta_data ->> 'provider';
  v_billing_period := COALESCE(NEW.raw_user_meta_data ->> 'trial_billing_period', 'monthly');
  v_profile_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NEW.email);

  BEGIN v_extra_numbers := COALESCE((NEW.raw_user_meta_data ->> 'extra_numbers')::int, 0); EXCEPTION WHEN others THEN v_extra_numbers := 0; END;
  BEGIN v_extra_contacts := COALESCE((NEW.raw_user_meta_data ->> 'extra_contacts_packs')::int, 0); EXCEPTION WHEN others THEN v_extra_contacts := 0; END;
  BEGIN v_extra_opps := COALESCE((NEW.raw_user_meta_data ->> 'extra_opportunities_packs')::int, 0); EXCEPTION WHEN others THEN v_extra_opps := 0; END;
  BEGIN v_partner_click_id := NULLIF(NEW.raw_user_meta_data ->> 'partner_click_id', '')::uuid; EXCEPTION WHEN others THEN v_partner_click_id := null; END;
  BEGIN v_partner_id := NULLIF(NEW.raw_user_meta_data ->> 'partner_id', '')::uuid; EXCEPTION WHEN others THEN v_partner_id := null; END;
  BEGIN v_partner_referral_link_id := NULLIF(NEW.raw_user_meta_data ->> 'partner_referral_link_id', '')::uuid; EXCEPTION WHEN others THEN v_partner_referral_link_id := null; END;

  IF v_provider = 'google'
     AND NOT v_trial_with_card
     AND NOT v_stripe_whitelisted
  THEN
    RAISE EXCEPTION 'google_signup_not_allowed: Conta não encontrada. Cadastre-se com cartão na página de planos.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.raw_user_meta_data ->> 'trial_will_charge_at' IS NOT NULL THEN
    BEGIN
      v_trial_will_charge_at := (NEW.raw_user_meta_data ->> 'trial_will_charge_at')::timestamptz;
    EXCEPTION WHEN others THEN
      v_trial_will_charge_at := now() + interval '7 days';
    END;
  END IF;

  IF v_trial_with_card AND v_trial_plan IN ('start','growth','scale') THEN
    v_plan := v_trial_plan;
    v_searches_limit := CASE v_trial_plan
      WHEN 'start'  THEN 1000
      WHEN 'growth' THEN 3000
      WHEN 'scale'  THEN 10000
      ELSE 1000
    END;
    v_subscription_end := COALESCE(v_trial_will_charge_at, now() + interval '7 days');
    v_trial_end := COALESCE(v_trial_will_charge_at, now() + interval '7 days');
  ELSIF v_stripe_whitelisted THEN
    v_trial_end := now() + interval '7 days';
  ELSE
    v_trial_end := now();
    v_requires_payment := true;
  END IF;

  INSERT INTO public.profiles (
    id, email, name, avatar_url,
    signup_ip, device_fingerprint, terms_accepted_at,
    trial_start_at, trial_end_at,
    plan, searches_limit, searches_used,
    payment_provider, trial_plan_chosen, trial_billing_period,
    trial_will_charge_at, subscription_current_period_end,
    trial_asaas_subscription_id, trial_asaas_customer_id,
    trial_card_last4, trial_card_brand,
    requires_payment_setup,
    extra_numbers, extra_contacts_packs, extra_opportunities_packs
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_profile_name,
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'signup_ip', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'device_fingerprint', NULL),
    CASE WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now() ELSE NULL END,
    v_trial_start,
    v_trial_end,
    v_plan,
    v_searches_limit,
    0,
    CASE WHEN v_trial_with_card THEN 'stripe' ELSE NULL END,
    v_trial_plan,
    CASE WHEN v_trial_with_card THEN v_billing_period ELSE NULL END,
    v_trial_will_charge_at,
    v_subscription_end,
    NEW.raw_user_meta_data ->> 'stripe_subscription_id',
    NEW.raw_user_meta_data ->> 'stripe_customer_id',
    NEW.raw_user_meta_data ->> 'trial_card_last4',
    NEW.raw_user_meta_data ->> 'trial_card_brand',
    v_requires_payment,
    GREATEST(0, LEAST(99, v_extra_numbers)),
    GREATEST(0, LEAST(99, v_extra_contacts)),
    GREATEST(0, LEAST(99, v_extra_opps))
  );

  IF COALESCE(NEW.raw_user_meta_data ->> 'partner_referral_code', '') <> ''
     OR v_partner_click_id IS NOT NULL
     OR v_partner_id IS NOT NULL
  THEN
    BEGIN
      PERFORM public.attribute_partner_lead(
        NEW.id,
        NEW.email,
        v_profile_name,
        NEW.raw_user_meta_data ->> 'partner_referral_code',
        v_partner_click_id,
        v_partner_id,
        v_partner_referral_link_id,
        'auth_trigger'
      );
    EXCEPTION WHEN others THEN
      RAISE WARNING 'partner attribution failed for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;