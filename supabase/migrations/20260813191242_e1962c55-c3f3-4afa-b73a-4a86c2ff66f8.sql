-- 1) Uma venda por cobrança externa (idempotência real, à prova de corrida)
CREATE UNIQUE INDEX IF NOT EXISTS partner_sales_external_reference_uniq
  ON public.partner_sales (external_reference)
  WHERE external_reference IS NOT NULL;

-- 2) Uma comissão por venda
CREATE UNIQUE INDEX IF NOT EXISTS partner_commissions_sale_uniq
  ON public.partner_commissions (partner_sale_id);

-- 3) Trigger de comissão idempotente
CREATE OR REPLACE FUNCTION public.generate_commission_for_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_percent NUMERIC;
  v_commission_cents BIGINT;
  v_new_paid_clients INTEGER;
  v_new_level partner_level;
  v_first_paid_at TIMESTAMPTZ;
  v_commission_window_months INTEGER := 24;
  v_inserted uuid;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = NEW.partner_id;
  IF NOT FOUND OR v_partner.status <> 'active' THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN RETURN NEW; END IF;

  IF NEW.customer_user_id IS NOT NULL THEN
    SELECT MIN(paid_at) INTO v_first_paid_at
    FROM partner_sales
    WHERE partner_id = NEW.partner_id
      AND customer_user_id = NEW.customer_user_id;

    IF v_first_paid_at IS NOT NULL
       AND NEW.paid_at > v_first_paid_at + (v_commission_window_months || ' months')::interval
    THEN
      RETURN NEW;
    END IF;
  END IF;

  v_percent := public.get_partner_commission_percent(NEW.partner_id);
  v_commission_cents := (NEW.amount_cents * v_percent / 100)::BIGINT;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_percent,
    NEW.amount_cents, v_commission_cents, 'pending',
    NEW.paid_at + (v_settings.release_days || ' days')::interval
  )
  ON CONFLICT (partner_sale_id) DO NOTHING
  RETURNING id INTO v_inserted;

  -- Se a comissão já existia, não soma lifetime de novo
  IF v_inserted IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(DISTINCT customer_user_id) INTO v_new_paid_clients
  FROM partner_sales WHERE partner_id = NEW.partner_id;

  v_new_level := v_partner.level;
  IF v_new_paid_clients >= COALESCE(v_settings.platinum_threshold_clients, 500) THEN
    v_new_level := 'platinum';
  ELSIF v_new_paid_clients >= COALESCE(v_settings.gold_threshold_clients, 250) THEN
    v_new_level := 'gold';
  ELSIF v_new_paid_clients >= COALESCE(v_settings.silver_threshold_clients, 100) THEN
    v_new_level := 'silver';
  END IF;

  IF array_position(ARRAY['bronze','silver','gold','platinum']::partner_level[], v_new_level)
     > array_position(ARRAY['bronze','silver','gold','platinum']::partner_level[], v_partner.level)
  THEN
    UPDATE partners
    SET level = v_new_level,
        lifetime_revenue_cents = lifetime_revenue_cents + NEW.amount_cents,
        lifetime_commission_cents = lifetime_commission_cents + v_commission_cents,
        total_paid_clients = v_new_paid_clients,
        updated_at = now()
    WHERE id = NEW.partner_id;
  ELSE
    UPDATE partners
    SET lifetime_revenue_cents = lifetime_revenue_cents + NEW.amount_cents,
        lifetime_commission_cents = lifetime_commission_cents + v_commission_cents,
        total_paid_clients = v_new_paid_clients,
        updated_at = now()
    WHERE id = NEW.partner_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4) Atribuição exclusiva: link OU código, nunca duplicado
CREATE OR REPLACE FUNCTION public.partner_leads_enforce_single_attribution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.attribution_source, 'referral_link') = 'referral_code' THEN
    NEW.referral_link_id := NULL;
    NEW.click_id := NULL;
  ELSE
    NEW.attribution_source := 'referral_link';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_leads_single_attribution ON public.partner_leads;
CREATE TRIGGER trg_partner_leads_single_attribution
  BEFORE INSERT OR UPDATE ON public.partner_leads
  FOR EACH ROW EXECUTE FUNCTION public.partner_leads_enforce_single_attribution();