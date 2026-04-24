-- 1. Adiciona threshold platinum + garante saque mínimo R$ 100
ALTER TABLE public.partner_settings
  ADD COLUMN IF NOT EXISTS platinum_threshold_clients INTEGER NOT NULL DEFAULT 500;

UPDATE public.partner_settings
  SET minimum_withdrawal_cents = GREATEST(minimum_withdrawal_cents, 10000)
  WHERE id = 1;

-- 2. Atualiza generate_commission_for_sale para fazer auto-upgrade de nível
CREATE OR REPLACE FUNCTION public.generate_commission_for_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_percent NUMERIC;
  v_commission_cents BIGINT;
  v_new_paid_clients INTEGER;
  v_new_level partner_level;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = NEW.partner_id;
  IF NOT FOUND OR v_partner.status <> 'active' THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN RETURN NEW; END IF;

  v_percent := public.get_partner_commission_percent(NEW.partner_id);
  v_commission_cents := (NEW.amount_cents * v_percent / 100)::BIGINT;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_percent,
    NEW.amount_cents, v_commission_cents, 'pending',
    NEW.paid_at + (v_settings.release_days || ' days')::interval
  );

  -- Recalcula clientes pagos únicos
  SELECT COUNT(DISTINCT customer_user_id) INTO v_new_paid_clients
  FROM partner_sales WHERE partner_id = NEW.partner_id;

  -- Determina novo nível baseado em thresholds (sem rebaixar)
  v_new_level := v_partner.level;
  IF v_new_paid_clients >= COALESCE(v_settings.platinum_threshold_clients, 500) THEN
    v_new_level := 'platinum';
  ELSIF v_new_paid_clients >= COALESCE(v_settings.gold_threshold_clients, 250) THEN
    v_new_level := 'gold';
  ELSIF v_new_paid_clients >= COALESCE(v_settings.silver_threshold_clients, 100) THEN
    v_new_level := 'silver';
  END IF;

  -- Só faz upgrade (nunca downgrade)
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
$function$;