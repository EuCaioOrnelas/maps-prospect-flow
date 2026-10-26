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