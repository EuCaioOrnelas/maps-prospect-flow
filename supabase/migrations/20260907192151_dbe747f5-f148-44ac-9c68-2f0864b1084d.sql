CREATE TABLE IF NOT EXISTS public.partner_product_prices (
  product_key TEXT PRIMARY KEY,
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

INSERT INTO public.partner_product_prices (product_key, monthly_price_cents) VALUES
  ('numbers', 9600),
  ('contacts', 4800),
  ('opportunities', 19600)
ON CONFLICT (product_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.partner_customer_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL,
  customer_user_id UUID NOT NULL,
  product_key TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 1,
  unit_price_cents BIGINT NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  commissions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (partner_id, customer_user_id, product_key)
);

GRANT SELECT ON public.partner_customer_products TO authenticated;
GRANT ALL ON public.partner_customer_products TO service_role;
ALTER TABLE public.partner_customer_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner products admin manage" ON public.partner_customer_products;
CREATE POLICY "partner products admin manage" ON public.partner_customer_products
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "partner products owner read" ON public.partner_customer_products;
CREATE POLICY "partner products owner read" ON public.partner_customer_products
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.partners p
  WHERE p.id = partner_customer_products.partner_id AND p.user_id = auth.uid()
));

DROP TRIGGER IF EXISTS trg_partner_customer_products_updated_at ON public.partner_customer_products;
CREATE TRIGGER trg_partner_customer_products_updated_at
BEFORE UPDATE ON public.partner_customer_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

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
  v_profile RECORD;
  v_extras_cents BIGINT := 0;
  v_sub_cents BIGINT := 0;
  v_base_cents BIGINT := 0;
  v_commission_cents BIGINT;
  v_window_months INTEGER := 12;
  v_max_payments INTEGER := 12;
  r RECORD;
  v_units INTEGER;
  v_price BIGINT;
  v_amount BIGINT;
BEGIN
  SELECT * INTO v_partner FROM partners WHERE id = NEW.partner_id;
  IF NOT FOUND OR v_partner.status <> 'active' THEN RETURN NEW; END IF;

  SELECT * INTO v_settings FROM partner_settings WHERE id = 1;
  IF NOT v_settings.program_enabled THEN RETURN NEW; END IF;

  v_percent := public.get_partner_commission_percent(NEW.partner_id);

  IF NEW.customer_user_id IS NULL THEN
    -- Sem cliente vinculado: comissão simples sobre a venda.
    v_base_cents := NEW.amount_cents;
  ELSE
    SELECT COALESCE(extra_numbers, 0) AS numbers,
           COALESCE(extra_contacts_packs, 0) AS contacts,
           COALESCE(extra_opportunities_packs, 0) AS opportunities
      INTO v_profile
    FROM profiles WHERE user_id = NEW.customer_user_id;

    -- Registra/atualiza cada produto ativo do cliente (started_at fica no 1o registro).
    FOR r IN
      SELECT 'numbers'::text AS k, COALESCE(v_profile.numbers, 0) AS u
      UNION ALL SELECT 'contacts', COALESCE(v_profile.contacts, 0)
      UNION ALL SELECT 'opportunities', COALESCE(v_profile.opportunities, 0)
    LOOP
      IF r.u > 0 THEN
        SELECT monthly_price_cents INTO v_price FROM partner_product_prices WHERE product_key = r.k;
        v_price := COALESCE(v_price, 0);
        INSERT INTO partner_customer_products (partner_id, customer_user_id, product_key, units, unit_price_cents, started_at)
        VALUES (NEW.partner_id, NEW.customer_user_id, r.k, r.u, v_price, NEW.paid_at)
        ON CONFLICT (partner_id, customer_user_id, product_key)
        DO UPDATE SET units = EXCLUDED.units, unit_price_cents = EXCLUDED.unit_price_cents, updated_at = now();
        v_extras_cents := v_extras_cents + (r.u * v_price);
      END IF;
    END LOOP;

    v_sub_cents := GREATEST(NEW.amount_cents - v_extras_cents, 0);

    INSERT INTO partner_customer_products (partner_id, customer_user_id, product_key, units, unit_price_cents, started_at)
    VALUES (NEW.partner_id, NEW.customer_user_id, 'subscription', 1, v_sub_cents, NEW.paid_at)
    ON CONFLICT (partner_id, customer_user_id, product_key)
    DO UPDATE SET unit_price_cents = EXCLUDED.unit_price_cents, updated_at = now();

    -- Soma apenas os produtos ainda dentro da própria janela de 12 meses
    -- e que ainda não atingiram 12 comissões.
    FOR r IN
      SELECT * FROM partner_customer_products
      WHERE partner_id = NEW.partner_id AND customer_user_id = NEW.customer_user_id
    LOOP
      IF r.product_key = 'subscription' THEN
        v_units := 1;
        v_price := v_sub_cents;
      ELSE
        v_units := CASE r.product_key
          WHEN 'numbers' THEN COALESCE(v_profile.numbers, 0)
          WHEN 'contacts' THEN COALESCE(v_profile.contacts, 0)
          WHEN 'opportunities' THEN COALESCE(v_profile.opportunities, 0)
          ELSE 0 END;
        v_price := r.unit_price_cents;
      END IF;

      v_amount := v_units * v_price;
      IF v_amount <= 0 THEN CONTINUE; END IF;
      IF r.commissions_count >= v_max_payments THEN CONTINUE; END IF;
      IF NEW.paid_at > r.started_at + (v_window_months || ' months')::interval THEN CONTINUE; END IF;

      v_base_cents := v_base_cents + v_amount;
      UPDATE partner_customer_products
      SET commissions_count = commissions_count + 1, updated_at = now()
      WHERE id = r.id;
    END LOOP;
  END IF;

  IF v_base_cents <= 0 THEN
    PERFORM public.recalc_partner_level(NEW.partner_id, 'sale');
    RETURN NEW;
  END IF;

  v_commission_cents := (v_base_cents * v_percent / 100)::BIGINT;

  INSERT INTO partner_commissions (
    partner_id, partner_sale_id, partner_level, commission_percent,
    base_amount_cents, commission_amount_cents, status, available_at
  ) VALUES (
    NEW.partner_id, NEW.id, v_partner.level, v_percent,
    v_base_cents, v_commission_cents, 'pending',
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