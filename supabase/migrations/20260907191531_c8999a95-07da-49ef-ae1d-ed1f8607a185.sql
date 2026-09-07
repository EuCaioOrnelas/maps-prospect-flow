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
  v_bump_units INTEGER := 0;
  v_product_count INTEGER := 1;
  v_effective_percent NUMERIC;
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

    -- Produtos ativos do cliente: cada expansão (order bump) soma +1 comissão.
    -- extra_numbers = números extras; extra_contacts_packs = pacotes de contatos;
    -- extra_opportunities_packs = pacotes de oportunidades.
    SELECT COALESCE(p.extra_numbers, 0)
         + COALESCE(p.extra_contacts_packs, 0)
         + COALESCE(p.extra_opportunities_packs, 0)
      INTO v_bump_units
    FROM profiles p
    WHERE p.user_id = NEW.customer_user_id;
  END IF;

  v_bump_units := GREATEST(COALESCE(v_bump_units, 0), 0);
  v_product_count := 1 + v_bump_units; -- 1 = assinatura; cada expansão soma +1

  v_percent := public.get_partner_commission_percent(NEW.partner_id);
  v_effective_percent := v_percent * v_product_count;
  v_commission_cents := (NEW.amount_cents * v_effective_percent / 100)::BIGINT;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_effective_percent,
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