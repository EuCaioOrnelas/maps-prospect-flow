-- Add trial-with-card fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_card_token TEXT,
  ADD COLUMN IF NOT EXISTS trial_card_last4 TEXT,
  ADD COLUMN IF NOT EXISTS trial_card_brand TEXT,
  ADD COLUMN IF NOT EXISTS trial_asaas_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_asaas_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS trial_plan_chosen TEXT,
  ADD COLUMN IF NOT EXISTS trial_billing_period TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS trial_will_charge_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_auto_charge_cancelled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_auto_charge_cancelled_at TIMESTAMPTZ;

-- Stronger anti-fraud: block ANY existing account (not just free) for IP + fingerprint + CPF
CREATE OR REPLACE FUNCTION public.check_signup_fraud_strict(
  p_fingerprint TEXT,
  p_ip TEXT,
  p_cpf TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fp_count INT := 0;
  v_ip_count INT := 0;
  v_cpf_count INT := 0;
BEGIN
  IF p_fingerprint IS NOT NULL AND p_fingerprint <> '' THEN
    SELECT COUNT(*) INTO v_fp_count
    FROM profiles
    WHERE device_fingerprint = p_fingerprint;
  END IF;

  IF p_ip IS NOT NULL AND p_ip <> '' AND p_ip <> 'unknown' THEN
    SELECT COUNT(*) INTO v_ip_count
    FROM profiles
    WHERE signup_ip = p_ip;
  END IF;

  IF p_cpf IS NOT NULL AND p_cpf <> '' THEN
    SELECT COUNT(*) INTO v_cpf_count
    FROM profiles
    WHERE cpf = p_cpf;
  END IF;

  IF v_fp_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'device_already_registered',
      'message', 'Já existe uma conta neste dispositivo. Faça login na conta existente.');
  END IF;

  IF v_ip_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'ip_already_registered',
      'message', 'Já existe uma conta cadastrada nesta rede. Faça login na conta existente.');
  END IF;

  IF v_cpf_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'reason', 'cpf_already_registered',
      'message', 'Este CPF já está vinculado a outra conta.');
  END IF;

  RETURN json_build_object('allowed', true);
END;
$$;