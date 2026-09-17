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
    IF NOT NEW.is_paid THEN
      NEW.paid_at := NULL;
    END IF;
  ELSE
    NEW.partner_id := OLD.partner_id;
    NEW.user_id := OLD.user_id;
    NEW.paid_at := OLD.paid_at;
  END IF;

  RETURN NEW;
END;
$$;