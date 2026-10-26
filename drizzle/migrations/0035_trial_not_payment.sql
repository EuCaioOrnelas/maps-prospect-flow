CREATE OR REPLACE FUNCTION public.reconcile_paid_lead_to_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_profile RECORD;
  v_plan_key TEXT;
  v_searches_limit INT;
  v_period_end TIMESTAMPTZ;
  v_provider TEXT;
BEGIN
  IF NEW.checkout_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF (TG_OP = 'UPDATE' AND OLD.checkout_completed IS TRUE) THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN RETURN NEW; END IF;
  -- Teste grátis com cartão não é pagamento: nunca libera plano nem marca PIX
  IF COALESCE(NEW.stripe_session_id,'') LIKE '%trial%' THEN RETURN NEW; END IF;

  SELECT p.* INTO v_profile
  FROM public.profiles p
  WHERE lower(p.email) = lower(NEW.email)
     OR (NEW.tax_id IS NOT NULL AND p.cpf IS NOT NULL
         AND regexp_replace(p.cpf, '[^0-9]', '', 'g') = regexp_replace(NEW.tax_id, '[^0-9]', '', 'g'))
     OR (NEW.phone IS NOT NULL AND p.phone IS NOT NULL
         AND public.get_phone_key(p.phone) = public.get_phone_key(NEW.phone))
  ORDER BY
    (lower(p.email) = lower(NEW.email)) DESC,
    p.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF COALESCE(v_profile.admin_assigned_plan, false) THEN
    NEW.user_id := v_profile.id;
    RETURN NEW;
  END IF;

  v_plan_key := CASE NEW.plan_attempted
    WHEN 'Wiize Start'  THEN 'start'
    WHEN 'Wiize Growth' THEN 'growth'
    WHEN 'Wiize Scale'  THEN 'scale'
    ELSE 'start'
  END;

  v_searches_limit := CASE v_plan_key
    WHEN 'start'  THEN 1000
    WHEN 'growth' THEN 3000
    WHEN 'scale'  THEN 10000
    ELSE 1000
  END;

  v_period_end := NOW() + INTERVAL '30 days';

  v_provider := CASE
    WHEN NEW.stripe_session_id LIKE 'asaas_%'   THEN 'asaas'
    WHEN NEW.stripe_session_id LIKE 'abacate_%' THEN 'abacate_pay'
    ELSE 'stripe'
  END;

  NEW.user_id := v_profile.id;

  UPDATE public.profiles
  SET plan = v_plan_key,
      searches_limit = v_searches_limit,
      searches_used = 0,
      subscription_current_period_end = v_period_end,
      payment_provider = v_provider,
      phone = COALESCE(phone, NEW.phone),
      cpf = COALESCE(cpf, NEW.tax_id),
      updated_at = NOW()
  WHERE id = v_profile.id;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.activate_pending_checkout()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_lead RECORD;
  v_plan_key TEXT;
  v_searches_limit INT;
  v_period_end TIMESTAMPTZ;
  v_provider TEXT;
  v_admin_assigned BOOLEAN;
BEGIN
  SELECT * INTO v_lead
  FROM public.checkout_leads
  WHERE checkout_completed = true
    AND COALESCE(stripe_session_id,'') NOT LIKE '%trial%'
    AND (user_id IS NULL OR user_id = NEW.id)
    AND (
      lower(email) = lower(NEW.email)
      OR (NEW.cpf IS NOT NULL AND tax_id IS NOT NULL
          AND regexp_replace(tax_id, '[^0-9]', '', 'g') = regexp_replace(NEW.cpf, '[^0-9]', '', 'g'))
      OR (NEW.phone IS NOT NULL AND phone IS NOT NULL
          AND public.get_phone_key(phone) = public.get_phone_key(NEW.phone))
    )
  ORDER BY
    (lower(email) = lower(NEW.email)) DESC,
    checkout_completed_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(admin_assigned_plan, false) INTO v_admin_assigned
  FROM public.profiles WHERE id = NEW.id;

  IF v_admin_assigned THEN
    UPDATE public.checkout_leads SET user_id = NEW.id WHERE id = v_lead.id;
    RETURN NEW;
  END IF;

  v_plan_key := CASE v_lead.plan_attempted
    WHEN 'Wiize Start'  THEN 'start'
    WHEN 'Wiize Growth' THEN 'growth'
    WHEN 'Wiize Scale'  THEN 'scale'
    ELSE 'start'
  END;

  v_searches_limit := CASE v_plan_key
    WHEN 'start'  THEN 1000
    WHEN 'growth' THEN 3000
    WHEN 'scale'  THEN 10000
    ELSE 1000
  END;

  v_period_end := NOW() + INTERVAL '30 days';

  v_provider := CASE
    WHEN v_lead.stripe_session_id LIKE 'asaas_%'   THEN 'asaas'
    WHEN v_lead.stripe_session_id LIKE 'abacate_%' THEN 'abacate_pay'
    ELSE 'stripe'
  END;

  UPDATE public.profiles
  SET plan = v_plan_key,
      searches_limit = v_searches_limit,
      searches_used = 0,
      subscription_current_period_end = v_period_end,
      payment_provider = v_provider,
      phone = COALESCE(phone, v_lead.phone),
      cpf = COALESCE(cpf, v_lead.tax_id),
      updated_at = NOW()
  WHERE id = NEW.id;

  UPDATE public.checkout_leads
  SET user_id = NEW.id
  WHERE id = v_lead.id;

  RETURN NEW;
END;
$function$;