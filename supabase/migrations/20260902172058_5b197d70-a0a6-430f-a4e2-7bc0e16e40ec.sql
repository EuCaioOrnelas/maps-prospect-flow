
-- 1) Contagem de clientes ATIVOS de um parceiro
CREATE OR REPLACE FUNCTION public.count_partner_active_clients(p_partner_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(DISTINCT ps.customer_user_id)::int
  FROM partner_sales ps
  JOIN profiles pr ON pr.id = ps.customer_user_id
  WHERE ps.partner_id = p_partner_id
    AND ps.customer_user_id IS NOT NULL
    AND ps.refunded_at IS NULL
    AND ps.chargeback_at IS NULL
    AND pr.plan IS NOT NULL
    AND pr.plan NOT IN ('free', 'canceled', 'cancelled', 'expired', 'none')
    AND (pr.subscription_current_period_end IS NULL
         OR pr.subscription_current_period_end > now());
$$;

-- 2) Recalcula o nível do parceiro (pode subir E descer)
CREATE OR REPLACE FUNCTION public.recalc_partner_level(p_partner_id uuid, p_reason text DEFAULT 'auto_active_clients')
RETURNS partner_level
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner partners%ROWTYPE;
  v_settings partner_settings%ROWTYPE;
  v_active INTEGER;
  v_new_level partner_level;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = p_partner_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;

  v_active := public.count_partner_active_clients(p_partner_id);

  IF v_active >= COALESCE(v_settings.platinum_threshold_clients, 500) THEN
    v_new_level := 'platinum';
  ELSIF v_active >= COALESCE(v_settings.gold_threshold_clients, 250) THEN
    v_new_level := 'gold';
  ELSIF v_active >= COALESCE(v_settings.silver_threshold_clients, 100) THEN
    v_new_level := 'silver';
  ELSE
    v_new_level := 'bronze';
  END IF;

  UPDATE partners
  SET level = v_new_level,
      total_paid_clients = v_active,
      updated_at = now()
  WHERE id = p_partner_id;

  IF v_new_level IS DISTINCT FROM v_partner.level THEN
    INSERT INTO partner_levels_history (partner_id, from_level, to_level, reason)
    VALUES (p_partner_id, v_partner.level, v_new_level, p_reason);
  END IF;

  RETURN v_new_level;
END;
$$;

-- 3) Comissão: nível passa a ser recalculado por clientes ativos
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
  v_first_paid_at TIMESTAMPTZ;
  v_prior_commissions INTEGER := 0;
  v_commission_window_months INTEGER := 12;
  v_max_commissioned_payments INTEGER := 12;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = NEW.partner_id;
  IF NOT FOUND OR v_partner.status <> 'active' THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN RETURN NEW; END IF;

  IF NEW.customer_user_id IS NOT NULL THEN
    SELECT MIN(ps.paid_at) INTO v_first_paid_at
    FROM partner_sales ps
    WHERE ps.partner_id = NEW.partner_id
      AND ps.customer_user_id = NEW.customer_user_id;

    IF v_first_paid_at IS NOT NULL
       AND NEW.paid_at > v_first_paid_at + (v_commission_window_months || ' months')::interval
    THEN
      PERFORM public.recalc_partner_level(NEW.partner_id, 'sale');
      RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_prior_commissions
    FROM partner_commissions pc
    JOIN partner_sales ps ON ps.id = pc.partner_sale_id
    WHERE pc.partner_id = NEW.partner_id
      AND ps.customer_user_id = NEW.customer_user_id;

    IF v_prior_commissions >= v_max_commissioned_payments THEN
      PERFORM public.recalc_partner_level(NEW.partner_id, 'sale');
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
  );

  UPDATE partners
  SET lifetime_revenue_cents = lifetime_revenue_cents + NEW.amount_cents,
      lifetime_commission_cents = lifetime_commission_cents + v_commission_cents,
      updated_at = now()
  WHERE id = NEW.partner_id;

  PERFORM public.recalc_partner_level(NEW.partner_id, 'sale');

  RETURN NEW;
END;
$function$;

-- 4) Recalcula quando o cliente muda de plano / expira / cancela
CREATE OR REPLACE FUNCTION public.partner_level_on_customer_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r RECORD;
BEGIN
  IF NEW.plan IS NOT DISTINCT FROM OLD.plan
     AND NEW.subscription_current_period_end IS NOT DISTINCT FROM OLD.subscription_current_period_end THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT DISTINCT partner_id FROM partner_sales WHERE customer_user_id = NEW.id
  LOOP
    PERFORM public.recalc_partner_level(r.partner_id, 'customer_status_change');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_level_on_customer_change ON public.profiles;
CREATE TRIGGER trg_partner_level_on_customer_change
AFTER UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.partner_level_on_customer_change();

-- 5) Recalcula quando venda é reembolsada/estornada
CREATE OR REPLACE FUNCTION public.partner_level_on_sale_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.recalc_partner_level(COALESCE(NEW.partner_id, OLD.partner_id), 'sale_status_change');
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_partner_level_on_sale_change ON public.partner_sales;
CREATE TRIGGER trg_partner_level_on_sale_change
AFTER UPDATE OF refunded_at, chargeback_at OR DELETE ON public.partner_sales
FOR EACH ROW EXECUTE FUNCTION public.partner_level_on_sale_change();

-- 6) Sincroniza níveis atuais
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT id FROM partners LOOP
    PERFORM public.recalc_partner_level(p.id, 'backfill_active_clients');
  END LOOP;
END $$;
