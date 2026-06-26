-- Seed default FX rates (idempotent)
INSERT INTO public.system_settings (key, value)
VALUES
  ('meta_fx_usd_brl', to_jsonb(5.20::numeric)),
  ('meta_fx_eur_brl', to_jsonb(5.65::numeric))
ON CONFLICT (key) DO NOTHING;

-- FX helper: converts any supported currency to BRL using system_settings
CREATE OR REPLACE FUNCTION public.meta_fx_to_brl(p_amount numeric, p_currency text)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cur TEXT := UPPER(COALESCE(NULLIF(TRIM(p_currency), ''), 'BRL'));
  v_rate NUMERIC;
BEGIN
  IF p_amount IS NULL THEN RETURN NULL; END IF;
  IF v_cur = 'BRL' OR v_cur = 'R$' THEN RETURN p_amount; END IF;
  IF v_cur IN ('USD','US$','$') THEN
    SELECT (value)::text::numeric INTO v_rate FROM public.system_settings WHERE key = 'meta_fx_usd_brl';
    RETURN p_amount * COALESCE(v_rate, 5.20);
  END IF;
  IF v_cur IN ('EUR','€') THEN
    SELECT (value)::text::numeric INTO v_rate FROM public.system_settings WHERE key = 'meta_fx_eur_brl';
    RETURN p_amount * COALESCE(v_rate, 5.65);
  END IF;
  RETURN p_amount;
END;
$$;

-- Template average cost — normalized to BRL
CREATE OR REPLACE FUNCTION public.get_template_avg_cost(p_template text, p_category text, p_owner uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_avg NUMERIC;
  v_cat TEXT := UPPER(COALESCE(p_category, ''));
BEGIN
  SELECT AVG(public.meta_fx_to_brl(billing_amount, billing_currency))
  INTO v_avg
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND billing_amount IS NOT NULL AND billing_amount > 0
    AND owner_user_id = p_owner
    AND (metadata->>'template_name') = p_template
    AND created_at > now() - interval '90 days';
  IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

  SELECT AVG(public.meta_fx_to_brl(billing_amount, billing_currency))
  INTO v_avg
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND billing_amount IS NOT NULL AND billing_amount > 0
    AND (metadata->>'template_name') = p_template
    AND created_at > now() - interval '30 days';
  IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

  IF v_cat <> '' THEN
    SELECT AVG(public.meta_fx_to_brl(billing_amount, billing_currency))
    INTO v_avg
    FROM public.chat_messages
    WHERE direction = 'outbound'
      AND billing_amount IS NOT NULL AND billing_amount > 0
      AND owner_user_id = p_owner
      AND UPPER(billing_category) = v_cat
      AND created_at > now() - interval '90 days';
    IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

    SELECT AVG(public.meta_fx_to_brl(billing_amount, billing_currency))
    INTO v_avg
    FROM public.chat_messages
    WHERE direction = 'outbound'
      AND billing_amount IS NOT NULL AND billing_amount > 0
      AND UPPER(billing_category) = v_cat
      AND created_at > now() - interval '30 days';
    IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;
  END IF;

  RETURN CASE v_cat
    WHEN 'MARKETING'      THEN 0.12
    WHEN 'UTILITY'        THEN 0.08
    WHEN 'AUTHENTICATION' THEN 0.10
    WHEN 'SERVICE'        THEN 0.00
    ELSE 0.12
  END;
END;
$$;

-- Recompute campaign cost — converts every message to BRL before aggregating
CREATE OR REPLACE FUNCTION public.recompute_meta_campaign_cost(p_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner UUID;
  v_template TEXT;
  v_category TEXT;
  v_total_msgs INT := 0;
  v_with_real INT := 0;
  v_real_sum_brl NUMERIC := 0;
  v_avg_brl NUMERIC;
  v_missing INT;
  v_estimated NUMERIC := 0;
  v_source TEXT := 'pending';
BEGIN
  SELECT owner_user_id, template_name, template_category
  INTO v_owner, v_template, v_category
  FROM public.meta_campaigns
  WHERE id = p_campaign_id;
  IF v_owner IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE billing_amount IS NOT NULL AND billing_amount >= 0),
    COALESCE(SUM(public.meta_fx_to_brl(billing_amount, billing_currency)) FILTER (WHERE billing_amount IS NOT NULL), 0)
  INTO v_total_msgs, v_with_real, v_real_sum_brl
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND (metadata->>'campaign_id') = p_campaign_id::text;

  IF v_total_msgs = 0 THEN
    SELECT success_count INTO v_total_msgs FROM public.meta_campaigns WHERE id = p_campaign_id;
  END IF;

  v_missing := GREATEST(v_total_msgs - v_with_real, 0);
  IF v_missing > 0 THEN
    v_avg_brl := public.get_template_avg_cost(v_template, v_category, v_owner);
    v_estimated := v_missing * COALESCE(v_avg_brl, 0);
  END IF;

  IF v_with_real = 0 AND v_missing > 0 THEN
    v_source := 'estimated';
  ELSIF v_with_real > 0 AND v_missing = 0 THEN
    v_source := 'real';
  ELSIF v_with_real > 0 AND v_missing > 0 THEN
    v_source := 'mixed';
  ELSE
    v_source := 'pending';
  END IF;

  UPDATE public.meta_campaigns
  SET real_cost = ROUND(v_real_sum_brl::numeric, 4),
      estimated_cost = ROUND(v_estimated::numeric, 4),
      total_cost = ROUND((v_real_sum_brl + v_estimated)::numeric, 4),
      cost_source = v_source,
      cost_currency = 'BRL',
      cost_updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;