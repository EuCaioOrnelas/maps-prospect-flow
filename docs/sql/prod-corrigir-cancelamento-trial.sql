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
  -- Roda só quando checkout_completed acabou de virar true e ainda não tem user_id
  IF NEW.checkout_completed IS NOT TRUE THEN RETURN NEW; END IF;
  IF (TG_OP = 'UPDATE' AND OLD.checkout_completed IS TRUE) THEN RETURN NEW; END IF;
  IF NEW.user_id IS NOT NULL THEN RETURN NEW; END IF;
  -- Teste grátis com cartão não é pagamento: nunca libera plano nem marca PIX
  IF COALESCE(NEW.stripe_session_id,'') LIKE '%trial%' THEN RETURN NEW; END IF;

  -- Procura profile por email > tax_id > telefone
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
    RETURN NEW; -- usuário ainda vai criar a conta, activate_pending_checkout cuida no INSERT do profile
  END IF;

  -- Não sobrescrever contas com plano atribuído por admin
  IF COALESCE(v_profile.admin_assigned_plan, false) THEN
    NEW.user_id := v_profile.id;
    RAISE LOG 'Lead % linked to admin-assigned profile % (no plan change)', NEW.id, v_profile.id;
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

  -- Vincula o lead ao usuário (no próprio NEW para não disparar update extra)
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

  RAISE LOG 'Reconciled paid lead % to existing user % (plan %, via %)',
    NEW.id, v_profile.id, v_plan_key, v_provider;

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
  -- Tenta encontrar lead pago vinculável ao novo profile, por ordem de prioridade:
  -- 1) Email igual
  -- 2) tax_id (CNPJ/CPF) igual ao cpf do profile
  -- 3) Telefone (últimos 8 dígitos) igual
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

  -- Não sobrescrever contas com plano atribuído por admin
  SELECT COALESCE(admin_assigned_plan, false) INTO v_admin_assigned
  FROM public.profiles WHERE id = NEW.id;

  IF v_admin_assigned THEN
    UPDATE public.checkout_leads SET user_id = NEW.id WHERE id = v_lead.id;
    RAISE LOG 'Skipping plan activation (admin assigned) for user %', NEW.id;
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

  RAISE LOG 'Activated pending checkout for user % with plan % via % (matched lead %)',
    NEW.id, v_plan_key, v_provider, v_lead.id;

  RETURN NEW;
END;
$function$;

-- Corrige quem já está com teste cancelado e encerrado, mas ainda com plano pago
UPDATE public.profiles
SET plan = 'free',
    searches_limit = 10,
    searches_used = 0,
    payment_provider = NULL,
    subscription_current_period_end = NULL
WHERE trial_auto_charge_cancelled = true
  AND trial_will_charge_at < now()
  AND COALESCE(admin_assigned_plan, false) = false
  AND COALESCE(is_custom_subscription, false) = false
  AND (subscription_current_period_end IS NULL
       OR subscription_current_period_end <= trial_will_charge_at + interval '1 day')
  AND (plan <> 'free' OR payment_provider IS NOT NULL);

-- Rotina automática: a cada hora volta para Grátis quem cancelou o teste e já passou do fim,
-- mesmo que o cliente nunca mais entre no sistema.
CREATE OR REPLACE FUNCTION public.expire_cancelled_trials()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.profiles
  SET plan = 'free', searches_limit = 10, searches_used = 0,
      payment_provider = NULL, subscription_current_period_end = NULL
  WHERE trial_auto_charge_cancelled = true
    AND trial_will_charge_at < now()
    AND COALESCE(admin_assigned_plan, false) = false
    AND COALESCE(is_custom_subscription, false) = false
    AND (subscription_current_period_end IS NULL
         OR subscription_current_period_end <= trial_will_charge_at + interval '1 day')
    AND (plan <> 'free' OR payment_provider IS NOT NULL);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.expire_cancelled_trials() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('expire-cancelled-trials', '0 * * * *', 'SELECT public.expire_cancelled_trials();');
