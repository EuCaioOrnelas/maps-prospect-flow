-- Adiciona coluna para identificar contas que precisam concluir cadastro de cartão
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS requires_payment_setup boolean NOT NULL DEFAULT false;

-- Atualiza a trigger handle_new_user para bloquear free silencioso
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_trial_with_card boolean := false;
  v_stripe_whitelisted boolean := false;
  v_trial_plan text := null;
  v_trial_will_charge_at timestamptz := null;
  v_plan text := 'free';
  v_searches_limit int := 120;
  v_subscription_end timestamptz := null;
  v_trial_start timestamptz := now();
  v_trial_end timestamptz;
  v_requires_payment boolean := false;
BEGIN
  v_trial_with_card := COALESCE(NEW.raw_user_meta_data ->> 'trial_with_card', 'false') = 'true';
  v_stripe_whitelisted := COALESCE(NEW.raw_user_meta_data ->> 'stripe_whitelisted', 'false') = 'true';
  v_trial_plan := NEW.raw_user_meta_data ->> 'trial_plan_chosen';

  IF NEW.raw_user_meta_data ->> 'trial_will_charge_at' IS NOT NULL THEN
    BEGIN
      v_trial_will_charge_at := (NEW.raw_user_meta_data ->> 'trial_will_charge_at')::timestamptz;
    EXCEPTION WHEN others THEN
      v_trial_will_charge_at := now() + interval '7 days';
    END;
  END IF;

  IF v_trial_with_card AND v_trial_plan IN ('start','growth','scale') THEN
    -- Fluxo correto: trial com cartão → 7 dias completos
    v_plan := v_trial_plan;
    v_searches_limit := CASE v_trial_plan
      WHEN 'start'  THEN 1000
      WHEN 'growth' THEN 3000
      WHEN 'scale'  THEN 10000
      ELSE 1000
    END;
    v_subscription_end := COALESCE(v_trial_will_charge_at, now() + interval '7 days');
    v_trial_end := COALESCE(v_trial_will_charge_at, now() + interval '7 days');
  ELSIF v_stripe_whitelisted THEN
    -- Cliente Stripe legítimo importado → mantém trial padrão (será reconciliado por activate_pending_checkout)
    v_trial_end := now() + interval '7 days';
  ELSE
    -- Signup sem cartão (Google OAuth direto, etc): SEM TRIAL, exige cadastro de cartão
    v_trial_end := now(); -- Trial expira imediatamente
    v_requires_payment := true;
  END IF;

  INSERT INTO public.profiles (
    id, email, name, avatar_url,
    signup_ip, device_fingerprint, terms_accepted_at,
    trial_start_at, trial_end_at,
    plan, searches_limit, searches_used,
    payment_provider, trial_plan_chosen, trial_billing_period,
    trial_will_charge_at, subscription_current_period_end,
    trial_asaas_subscription_id, trial_asaas_customer_id,
    trial_card_last4, trial_card_brand,
    requires_payment_setup
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'signup_ip', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'device_fingerprint', NULL),
    CASE WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now() ELSE NULL END,
    v_trial_start,
    v_trial_end,
    v_plan,
    v_searches_limit,
    0,
    CASE WHEN v_trial_with_card THEN 'stripe' ELSE NULL END,
    v_trial_plan,
    CASE WHEN v_trial_with_card THEN 'monthly' ELSE NULL END,
    v_trial_will_charge_at,
    v_subscription_end,
    NEW.raw_user_meta_data ->> 'stripe_subscription_id',
    NEW.raw_user_meta_data ->> 'stripe_customer_id',
    NEW.raw_user_meta_data ->> 'trial_card_last4',
    NEW.raw_user_meta_data ->> 'trial_card_brand',
    v_requires_payment
  );
  RETURN NEW;
END;
$function$;