ALTER TABLE public.wiize_api_wallets
  ADD COLUMN IF NOT EXISTS auto_topup_monthly_limit_brl numeric NOT NULL DEFAULT 500;

CREATE OR REPLACE FUNCTION public.wiize_api_wallet_guard_prefs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND current_setting('role', true) <> 'service_role' THEN
    NEW.balance_tokens := OLD.balance_tokens;
    NEW.reserved_tokens := OLD.reserved_tokens;
    NEW.lifetime_credited_tokens := OLD.lifetime_credited_tokens;
    NEW.lifetime_spent_tokens := OLD.lifetime_spent_tokens;
    NEW.status := OLD.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wiize_api_wallet_guard_prefs_tg ON public.wiize_api_wallets;
CREATE TRIGGER wiize_api_wallet_guard_prefs_tg
BEFORE UPDATE ON public.wiize_api_wallets
FOR EACH ROW EXECUTE FUNCTION public.wiize_api_wallet_guard_prefs();