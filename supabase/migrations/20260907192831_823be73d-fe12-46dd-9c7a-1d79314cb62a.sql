CREATE TABLE IF NOT EXISTS public.partner_product_prices (
  product_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  monthly_price_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.partner_product_prices TO authenticated;
GRANT ALL ON public.partner_product_prices TO service_role;
ALTER TABLE public.partner_product_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prices readable by authenticated" ON public.partner_product_prices;
CREATE POLICY "prices readable by authenticated" ON public.partner_product_prices
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "prices managed by admins" ON public.partner_product_prices;
CREATE POLICY "prices managed by admins" ON public.partner_product_prices
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.partner_product_prices (product_key, label, monthly_price_cents) VALUES
  ('numbers', 'Número extra', 9600),
  ('contacts', 'Pacote de contatos', 4800),
  ('opportunities', 'Pacote de oportunidades', 19600)
ON CONFLICT (product_key) DO NOTHING;

ALTER TABLE public.partner_commissions
  ADD COLUMN IF NOT EXISTS product_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb;

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
  v_profile RECORD;
  v_breakdown JSONB := '[]'::jsonb;
  v_extras_cents BIGINT := 0;
  v_sub_cents BIGINT := 0;
  r RECORD;
  v_price BIGINT;
  v_amount BIGINT;
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

  -- Detalhamento por produto (assinatura + expansões ativas do cliente)
  IF NEW.customer_user_id IS NOT NULL THEN
    SELECT COALESCE(extra_numbers, 0) AS numbers,
           COALESCE(extra_contacts_packs, 0) AS contacts,
           COALESCE(extra_opportunities_packs, 0) AS opportunities
      INTO v_profile
    FROM profiles WHERE user_id = NEW.customer_user_id;

    FOR r IN
      SELECT 'numbers'::text AS k, COALESCE(v_profile.numbers, 0) AS u
      UNION ALL SELECT 'contacts', COALESCE(v_profile.contacts, 0)
      UNION ALL SELECT 'opportunities', COALESCE(v_profile.opportunities, 0)
    LOOP
      IF r.u > 0 THEN
        SELECT monthly_price_cents INTO v_price FROM partner_product_prices WHERE product_key = r.k;
        v_price := COALESCE(v_price, 0);
        v_amount := r.u * v_price;
        IF v_amount > 0 AND v_extras_cents + v_amount <= NEW.amount_cents THEN
          v_extras_cents := v_extras_cents + v_amount;
          v_breakdown := v_breakdown || jsonb_build_array(jsonb_build_object(
            'product_key', r.k,
            'label', (SELECT label FROM partner_product_prices WHERE product_key = r.k),
            'units', r.u,
            'base_amount_cents', v_amount,
            'commission_percent', v_percent,
            'commission_amount_cents', (v_amount * v_percent / 100)::BIGINT
          ));
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_sub_cents := GREATEST(NEW.amount_cents - v_extras_cents, 0);
  IF v_sub_cents > 0 THEN
    v_breakdown := jsonb_build_array(jsonb_build_object(
      'product_key', 'subscription',
      'label', 'Assinatura ' || COALESCE(INITCAP(NEW.plan), ''),
      'units', 1,
      'base_amount_cents', v_sub_cents,
      'commission_percent', v_percent,
      'commission_amount_cents', (v_sub_cents * v_percent / 100)::BIGINT
    )) || v_breakdown;
  END IF;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at, product_breakdown
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_percent,
    NEW.amount_cents, v_commission_cents, 'pending',
    NEW.paid_at + (v_settings.release_days || ' days')::interval, v_breakdown
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