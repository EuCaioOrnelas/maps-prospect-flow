
-- ========== 1. Colunas em chat_messages para custo real Meta ==========
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS billing_amount NUMERIC(12,6),
  ADD COLUMN IF NOT EXISTS billing_currency TEXT,
  ADD COLUMN IF NOT EXISTS billing_category TEXT,
  ADD COLUMN IF NOT EXISTS billing_source TEXT,
  ADD COLUMN IF NOT EXISTS pricing_model TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_messages_billing_template
  ON public.chat_messages ((metadata->>'template_name'), billing_amount)
  WHERE direction = 'outbound' AND billing_amount IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_campaign_meta
  ON public.chat_messages ((metadata->>'campaign_id'))
  WHERE direction = 'outbound';

-- ========== 2. Colunas em meta_campaigns para custo ==========
ALTER TABLE public.meta_campaigns
  ADD COLUMN IF NOT EXISTS template_category TEXT,
  ADD COLUMN IF NOT EXISTS total_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost NUMERIC(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_source TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS cost_currency TEXT NOT NULL DEFAULT 'BRL',
  ADD COLUMN IF NOT EXISTS cost_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_template_owner
  ON public.meta_campaigns (owner_user_id, template_name, created_at DESC);

-- ========== 3. Função: custo médio por template (com fallback de categoria) ==========
CREATE OR REPLACE FUNCTION public.get_template_avg_cost(
  p_template TEXT,
  p_category TEXT,
  p_owner UUID
) RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg NUMERIC;
  v_cat TEXT := UPPER(COALESCE(p_category, ''));
BEGIN
  -- 1) Média do mesmo template (últimos 90 dias) para o mesmo dono
  SELECT AVG(billing_amount)
  INTO v_avg
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND billing_amount IS NOT NULL
    AND billing_amount > 0
    AND owner_user_id = p_owner
    AND (metadata->>'template_name') = p_template
    AND created_at > now() - interval '90 days';

  IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

  -- 2) Média do mesmo template em qualquer conta (últimos 30 dias) — usa amostra global
  SELECT AVG(billing_amount)
  INTO v_avg
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND billing_amount IS NOT NULL
    AND billing_amount > 0
    AND (metadata->>'template_name') = p_template
    AND created_at > now() - interval '30 days';

  IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

  -- 3) Média da categoria para o mesmo dono (últimos 90 dias)
  IF v_cat <> '' THEN
    SELECT AVG(billing_amount)
    INTO v_avg
    FROM public.chat_messages
    WHERE direction = 'outbound'
      AND billing_amount IS NOT NULL
      AND billing_amount > 0
      AND owner_user_id = p_owner
      AND UPPER(billing_category) = v_cat
      AND created_at > now() - interval '90 days';

    IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;

    -- 4) Média da categoria globalmente (últimos 30 dias)
    SELECT AVG(billing_amount)
    INTO v_avg
    FROM public.chat_messages
    WHERE direction = 'outbound'
      AND billing_amount IS NOT NULL
      AND billing_amount > 0
      AND UPPER(billing_category) = v_cat
      AND created_at > now() - interval '30 days';

    IF v_avg IS NOT NULL AND v_avg > 0 THEN RETURN v_avg; END IF;
  END IF;

  -- 5) Default oficial Meta BR por categoria
  RETURN CASE v_cat
    WHEN 'MARKETING'     THEN 0.12
    WHEN 'UTILITY'       THEN 0.08
    WHEN 'AUTHENTICATION'THEN 0.10
    WHEN 'SERVICE'       THEN 0.00
    ELSE 0.12
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_template_avg_cost(TEXT, TEXT, UUID) TO authenticated, service_role;

-- ========== 4. Função: recalcular custo de uma campanha Meta ==========
CREATE OR REPLACE FUNCTION public.recompute_meta_campaign_cost(p_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_template TEXT;
  v_category TEXT;
  v_total_msgs INT := 0;
  v_with_real INT := 0;
  v_real_sum NUMERIC := 0;
  v_currency TEXT := 'BRL';
  v_avg NUMERIC;
  v_missing INT;
  v_estimated NUMERIC := 0;
  v_source TEXT := 'pending';
BEGIN
  SELECT owner_user_id, template_name, template_category, cost_currency
  INTO v_owner, v_template, v_category, v_currency
  FROM public.meta_campaigns
  WHERE id = p_campaign_id;

  IF v_owner IS NULL THEN RETURN; END IF;

  -- Agrega mensagens outbound vinculadas a esta campanha
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE billing_amount IS NOT NULL AND billing_amount >= 0),
    COALESCE(SUM(billing_amount) FILTER (WHERE billing_amount IS NOT NULL), 0),
    COALESCE(MAX(billing_currency) FILTER (WHERE billing_currency IS NOT NULL), v_currency)
  INTO v_total_msgs, v_with_real, v_real_sum, v_currency
  FROM public.chat_messages
  WHERE direction = 'outbound'
    AND (metadata->>'campaign_id') = p_campaign_id::text;

  -- Se não há mensagens linkadas ainda, usa success_count como base
  IF v_total_msgs = 0 THEN
    SELECT success_count INTO v_total_msgs FROM public.meta_campaigns WHERE id = p_campaign_id;
  END IF;

  v_missing := GREATEST(v_total_msgs - v_with_real, 0);

  IF v_missing > 0 THEN
    v_avg := public.get_template_avg_cost(v_template, v_category, v_owner);
    v_estimated := v_missing * COALESCE(v_avg, 0);
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
  SET real_cost = ROUND(v_real_sum::numeric, 4),
      estimated_cost = ROUND(v_estimated::numeric, 4),
      total_cost = ROUND((v_real_sum + v_estimated)::numeric, 4),
      cost_source = v_source,
      cost_currency = COALESCE(v_currency, 'BRL'),
      cost_updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_meta_campaign_cost(UUID) TO authenticated, service_role;
