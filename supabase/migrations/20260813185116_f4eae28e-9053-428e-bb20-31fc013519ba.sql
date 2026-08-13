-- 1) Analytics columns on the existing attribution table (no new tables)
ALTER TABLE public.partner_leads
  ADD COLUMN IF NOT EXISTS attribution_source text NOT NULL DEFAULT 'referral_link',
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE INDEX IF NOT EXISTS idx_partner_leads_attribution_source
  ON public.partner_leads (attribution_source);

-- 2) Public, safe validation of a partner referral code.
--    Returns only { valid, status, partner_name } — never partner_id, so the
--    frontend can never force an arbitrary attribution.
CREATE OR REPLACE FUNCTION public.validate_partner_referral_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text := lower(regexp_replace(coalesce(_code, ''), '[^a-zA-Z0-9]', '', 'g'));
  v_partner record;
BEGIN
  IF length(v_code) < 3 THEN
    RETURN jsonb_build_object('valid', false, 'status', 'not_found');
  END IF;

  SELECT id, full_name, status, referral_code
    INTO v_partner
  FROM public.partners
  WHERE lower(referral_code) = v_code
  LIMIT 1;

  IF v_partner.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'status', 'not_found');
  END IF;

  IF v_partner.status <> 'active' THEN
    RETURN jsonb_build_object('valid', false, 'status', 'inactive');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'status', 'active',
    'code', upper(v_partner.referral_code),
    'partner_name', v_partner.full_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_partner_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_partner_referral_code(text) TO anon, authenticated, service_role;

-- 3) Extend the existing attribution RPC (same signature) to:
--    - record attribution_source / referral_code
--    - honour an explicitly typed code over an automatic link attribution
--      (only while the lead has not converted to a paying client)
CREATE OR REPLACE FUNCTION public.attribute_partner_lead(
  p_user_id uuid,
  p_email text,
  p_name text DEFAULT NULL::text,
  p_referral_code text DEFAULT NULL::text,
  p_click_id uuid DEFAULT NULL::uuid,
  p_partner_id uuid DEFAULT NULL::uuid,
  p_referral_link_id uuid DEFAULT NULL::uuid,
  p_source text DEFAULT 'client'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid := p_partner_id;
  v_referral_link_id uuid := p_referral_link_id;
  v_referral_code text := lower(nullif(regexp_replace(coalesce(p_referral_code, ''), '[^a-zA-Z0-9]', '', 'g'), ''));
  v_click_referral_code text;
  v_check jsonb;
  v_lead_id uuid;
  v_existing public.partner_leads%ROWTYPE;
  -- explicit code typed by the user (trial / checkout) has priority over links
  v_is_manual_code boolean := (p_source = 'referral_code');
BEGIN
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'status', 'missing_user');
  END IF;

  IF p_source IS DISTINCT FROM 'auth_trigger' THEN
    IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'not_allowed_partner_attribution' USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Manual code: ignore any click/partner sent by the client and resolve
  -- strictly from the code server-side.
  IF v_is_manual_code THEN
    v_partner_id := NULL;
    v_referral_link_id := NULL;
    p_click_id := NULL;
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

  SELECT * INTO v_existing
  FROM public.partner_leads
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.partner_leads (
      partner_id, user_id, email, name, click_id, referral_link_id,
      is_trial, attributed_at, attribution_source, referral_code
    ) VALUES (
      v_partner_id,
      p_user_id,
      COALESCE(NULLIF(trim(p_email), ''), 'sem-email@wiize.local'),
      NULLIF(trim(coalesce(p_name, '')), ''),
      p_click_id,
      v_referral_link_id,
      true,
      now(),
      CASE WHEN v_is_manual_code THEN 'referral_code' ELSE 'referral_link' END,
      v_referral_code
    )
    RETURNING id INTO v_lead_id;

    IF p_click_id IS NOT NULL THEN
      UPDATE public.partner_clicks
      SET converted_to_lead_at = COALESCE(converted_to_lead_at, now()),
          converted_user_id = COALESCE(converted_user_id, p_user_id)
      WHERE id = p_click_id AND partner_id = v_partner_id;
    END IF;

    IF v_referral_link_id IS NOT NULL THEN
      PERFORM public.recompute_partner_referral_link_stats(v_referral_link_id);
    END IF;

    RETURN jsonb_build_object('ok', true, 'status', 'created', 'lead_id', v_lead_id,
                              'partner_id', v_partner_id, 'referral_link_id', v_referral_link_id);
  END IF;

  v_lead_id := v_existing.id;

  -- Priority rule: an explicitly typed code overrides a previous automatic
  -- link attribution, but never overrides a paid/converted lead nor a
  -- previous explicit code.
  IF v_is_manual_code
     AND v_existing.partner_id <> v_partner_id
     AND v_existing.is_paid = false
     AND COALESCE(v_existing.attribution_source, 'referral_link') <> 'referral_code'
  THEN
    UPDATE public.partner_leads
    SET partner_id = v_partner_id,
        referral_link_id = NULL,
        click_id = NULL,
        attribution_source = 'referral_code',
        referral_code = v_referral_code,
        attributed_at = now()
    WHERE id = v_lead_id;

    IF v_existing.referral_link_id IS NOT NULL THEN
      PERFORM public.recompute_partner_referral_link_stats(v_existing.referral_link_id);
    END IF;

    RETURN jsonb_build_object('ok', true, 'status', 'reattributed', 'lead_id', v_lead_id,
                              'partner_id', v_partner_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', 'already_attributed', 'lead_id', v_lead_id,
                            'partner_id', v_existing.partner_id);
END;
$$;