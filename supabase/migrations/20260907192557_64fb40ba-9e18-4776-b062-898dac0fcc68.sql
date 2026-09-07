DROP TABLE IF EXISTS public.partner_customer_products;
DROP TABLE IF EXISTS public.partner_product_prices;

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
  v_window_months INTEGER := 12;
  v_max_payments INTEGER := 12;
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
       AND NEW.paid_at > v_first_paid_at + (v_window_months || ' months')::interval
    THEN
      PERFORM public.recalc_partner_level(NEW.partner_id, 'sale');
      RETURN NEW;
    END IF;

    SELECT COUNT(DISTINCT date_trunc('month', ps.paid_at)) INTO v_prior_commissions
    FROM partner_commissions pc
    JOIN partner_sales ps ON ps.id = pc.partner_sale_id
    WHERE pc.partner_id = NEW.partner_id
      AND ps.customer_user_id = NEW.customer_user_id
      AND date_trunc('month', ps.paid_at) <> date_trunc('month', NEW.paid_at);

    IF v_prior_commissions >= v_max_payments THEN
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