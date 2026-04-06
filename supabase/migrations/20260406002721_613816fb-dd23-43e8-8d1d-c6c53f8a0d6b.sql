
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
      WHEN 'start' THEN 1000
      WHEN 'growth' THEN 3000
      WHEN 'scale' THEN 10000
      ELSE 1000
    END;

    v_period_end := NOW() + INTERVAL '30 days';

    v_provider := CASE
      WHEN v_lead.stripe_session_id LIKE 'asaas_%' THEN 'asaas'
      WHEN v_lead.stripe_session_id LIKE 'abacate_%' THEN 'abacate_pay'
      ELSE 'stripe'
    END;

    UPDATE public.profiles
    SET plan = v_plan_key,
        searches_limit = v_searches_limit,
        searches_used = 0,
        subscription_current_period_end = v_period_end,
        payment_provider = v_provider,
        phone = COALESCE(v_lead.phone, phone),
        cpf = v_lead.tax_id,
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

CREATE OR REPLACE FUNCTION public.check_and_reset_monthly_searches(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_record RECORD;
  should_reset BOOLEAN;
  current_month_start DATE;
  last_reset_date DATE;
BEGIN
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  IF profile_record.plan != 'free' THEN
    RETURN jsonb_build_object(
      'reset', false,
      'searches_used', profile_record.searches_used,
      'searches_limit', profile_record.searches_limit,
      'plan', profile_record.plan,
      'message', 'Planos pagos são resetados pelo ciclo de cobrança'
    );
  END IF;
  
  current_month_start := date_trunc('month', now())::date;
  last_reset_date := COALESCE(profile_record.last_searches_reset::date, profile_record.created_at::date);
  should_reset := (last_reset_date < current_month_start);
  
  IF should_reset THEN
    UPDATE public.profiles 
    SET 
      searches_used = 0,
      last_searches_reset = now(),
      updated_at = now()
    WHERE id = user_id;
    
    RETURN jsonb_build_object(
      'reset', true,
      'searches_used', 0,
      'searches_limit', profile_record.searches_limit,
      'message', 'Suas oportunidades foram renovadas!'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'reset', false,
    'searches_used', profile_record.searches_used,
    'searches_limit', profile_record.searches_limit,
    'next_reset', (date_trunc('month', now()) + interval '1 month')::date
  );
END;
$function$;
