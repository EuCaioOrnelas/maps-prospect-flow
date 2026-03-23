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
BEGIN
  SELECT * INTO v_lead
  FROM public.checkout_leads
  WHERE email = NEW.email
    AND checkout_completed = true
    AND (user_id IS NULL OR user_id = NEW.id)
  ORDER BY checkout_completed_at DESC NULLS LAST
  LIMIT 1;

  IF FOUND THEN
    v_plan_key := CASE v_lead.plan_attempted
      WHEN 'Wiize Start' THEN 'start'
      WHEN 'Wiize Growth' THEN 'growth'
      WHEN 'Wiize Scale' THEN 'scale'
      ELSE 'start'
    END;

    v_searches_limit := CASE v_plan_key
      WHEN 'start' THEN 200
      WHEN 'growth' THEN 600
      WHEN 'scale' THEN 1200
      ELSE 200
    END;

    v_period_end := NOW() + INTERVAL '30 days';

    v_provider := CASE
      WHEN v_lead.stripe_session_id LIKE 'abacate_%' THEN 'abacate_pay'
      ELSE 'stripe'
    END;

    UPDATE public.profiles
    SET plan = v_plan_key,
        searches_limit = v_searches_limit,
        searches_used = 0,
        subscription_current_period_end = v_period_end,
        payment_provider = v_provider,
        updated_at = NOW()
    WHERE id = NEW.id;

    UPDATE public.checkout_leads
    SET user_id = NEW.id
    WHERE id = v_lead.id;

    RAISE LOG 'Activated pending checkout for user % with plan % via %', NEW.id, v_plan_key, v_provider;
  END IF;

  RETURN NEW;
END;
$function$;