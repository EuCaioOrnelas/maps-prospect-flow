ALTER TABLE public.profiles DISABLE TRIGGER protect_profile_fields;

UPDATE public.profiles p
SET
  plan = CASE
    WHEN (u.raw_user_meta_data->>'trial_plan_chosen') IN ('start','growth','scale')
      THEN u.raw_user_meta_data->>'trial_plan_chosen'
    ELSE p.plan
  END,
  searches_limit = CASE u.raw_user_meta_data->>'trial_plan_chosen'
    WHEN 'start'  THEN 1000
    WHEN 'growth' THEN 3000
    WHEN 'scale'  THEN 10000
    ELSE p.searches_limit
  END,
  payment_provider = COALESCE(p.payment_provider, 'stripe'),
  trial_plan_chosen = COALESCE(p.trial_plan_chosen, u.raw_user_meta_data->>'trial_plan_chosen'),
  trial_billing_period = COALESCE(p.trial_billing_period, 'monthly'),
  trial_asaas_subscription_id = COALESCE(p.trial_asaas_subscription_id, u.raw_user_meta_data->>'stripe_subscription_id'),
  trial_asaas_customer_id = COALESCE(p.trial_asaas_customer_id, u.raw_user_meta_data->>'stripe_customer_id'),
  trial_card_last4 = COALESCE(p.trial_card_last4, u.raw_user_meta_data->>'trial_card_last4'),
  trial_card_brand = COALESCE(p.trial_card_brand, u.raw_user_meta_data->>'trial_card_brand'),
  trial_will_charge_at = COALESCE(
    p.trial_will_charge_at,
    NULLIF(u.raw_user_meta_data->>'trial_will_charge_at','')::timestamptz
  ),
  subscription_current_period_end = COALESCE(
    p.subscription_current_period_end,
    NULLIF(u.raw_user_meta_data->>'trial_will_charge_at','')::timestamptz
  ),
  trial_auto_charge_cancelled = COALESCE(p.trial_auto_charge_cancelled, false),
  updated_at = now()
FROM auth.users u
WHERE p.id = u.id
  AND COALESCE(u.raw_user_meta_data->>'trial_with_card','false') = 'true'
  AND u.raw_user_meta_data->>'stripe_subscription_id' IS NOT NULL
  AND p.trial_asaas_subscription_id IS NULL;

ALTER TABLE public.profiles ENABLE TRIGGER protect_profile_fields;