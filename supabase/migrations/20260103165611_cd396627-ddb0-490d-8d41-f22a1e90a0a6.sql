-- Update fraud check to only restrict free trial abuse
DROP FUNCTION IF EXISTS public.check_signup_fraud(text, text);

CREATE OR REPLACE FUNCTION public.check_signup_fraud(p_fingerprint TEXT, p_ip TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fingerprint_count INT;
  v_ip_count INT;
  v_has_used_trial BOOLEAN;
BEGIN
  -- Count FREE accounts with same fingerprint (exclude paid users)
  SELECT COUNT(*) INTO v_fingerprint_count
  FROM profiles
  WHERE device_fingerprint = p_fingerprint
  AND device_fingerprint IS NOT NULL
  AND device_fingerprint != ''
  AND plan = 'free';

  -- Count FREE accounts with same IP (exclude paid users)
  SELECT COUNT(*) INTO v_ip_count
  FROM profiles
  WHERE signup_ip = p_ip
  AND signup_ip IS NOT NULL
  AND signup_ip != ''
  AND signup_ip != 'unknown'
  AND plan = 'free';

  -- Check if any account with this fingerprint has already used trial
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE device_fingerprint = p_fingerprint
    AND device_fingerprint IS NOT NULL
    AND device_fingerprint != ''
    AND trial_start_at IS NOT NULL
    AND trial_start_at < NOW() - INTERVAL '7 days'
    AND plan = 'free'
  ) INTO v_has_used_trial;

  -- Block if device already has 1 free account
  IF v_fingerprint_count >= 1 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'device_limit_exceeded',
      'message', 'Já existe uma conta gratuita neste dispositivo. Faça upgrade para continuar.'
    );
  END IF;

  -- Block if IP already has 2 free accounts
  IF v_ip_count >= 2 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'ip_limit_exceeded', 
      'message', 'Limite de contas gratuitas por rede atingido.'
    );
  END IF;

  -- Block if device already used trial before
  IF v_has_used_trial THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'trial_abuse_detected',
      'message', 'Este dispositivo já utilizou o período de teste. Faça upgrade para continuar.'
    );
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'reason', null,
    'message', null
  );
END;
$$;