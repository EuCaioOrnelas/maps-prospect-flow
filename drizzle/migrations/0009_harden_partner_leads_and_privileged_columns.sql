-- 1) Remove direct self-attribution insert: attribution must go through the
-- SECURITY DEFINER RPC attribute_partner_lead (validates self-referral, uniqueness).
DROP POLICY IF EXISTS "Users can self-attribute partner lead" ON public.partner_leads;

-- 2) Make sure the partner_leads guard also runs on INSERT and freezes money fields.
CREATE OR REPLACE FUNCTION public.protect_partner_lead_self_attribution()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
BEGIN
  IF jwt_role = 'service_role' OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT p.plan INTO v_plan FROM public.profiles p WHERE p.id = NEW.user_id;

  NEW.current_plan := v_plan;
  NEW.is_paid      := (COALESCE(v_plan, 'free') <> 'free');
  NEW.is_trial     := (COALESCE(v_plan, 'free') = 'free');

  IF TG_OP = 'INSERT' THEN
    NEW.paid_at := CASE WHEN NEW.is_paid THEN NEW.paid_at ELSE NULL END;
    NEW.mrr_cents := 0;
  ELSE
    NEW.partner_id := OLD.partner_id;
    NEW.user_id := OLD.user_id;
    NEW.paid_at := OLD.paid_at;
    NEW.mrr_cents := OLD.mrr_cents;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partner_lead_self_attribution ON public.partner_leads;
CREATE TRIGGER trg_protect_partner_lead_self_attribution
BEFORE INSERT OR UPDATE ON public.partner_leads
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_lead_self_attribution();

-- 3) Commission money columns can never be touched by a partner.
CREATE OR REPLACE FUNCTION public.protect_partner_commission_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(current_setting('request.jwt.claims', true)::json->>'role', '');
BEGIN
  IF jwt_role = 'service_role' OR auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Comissões só podem ser alteradas pelo sistema ou por administradores';
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_partner_commission_columns ON public.partner_commissions;
CREATE TRIGGER trg_protect_partner_commission_columns
BEFORE INSERT OR UPDATE OR DELETE ON public.partner_commissions
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_commission_columns();

DROP TRIGGER IF EXISTS trg_protect_partner_sale_columns ON public.partner_sales;
CREATE TRIGGER trg_protect_partner_sale_columns
BEFORE INSERT OR UPDATE OR DELETE ON public.partner_sales
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_commission_columns();

DROP TRIGGER IF EXISTS trg_protect_partner_withdrawal_columns ON public.partner_withdrawals;
CREATE TRIGGER trg_protect_partner_withdrawal_columns
BEFORE UPDATE OR DELETE ON public.partner_withdrawals
FOR EACH ROW EXECUTE FUNCTION public.protect_partner_commission_columns();
