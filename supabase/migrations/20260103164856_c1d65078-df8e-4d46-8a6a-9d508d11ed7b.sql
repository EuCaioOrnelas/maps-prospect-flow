-- Drop existing function and recreate with improved fraud detection
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
BEGIN
  -- Check for existing accounts with same fingerprint
  SELECT COUNT(*) INTO v_fingerprint_count
  FROM profiles
  WHERE device_fingerprint = p_fingerprint
  AND device_fingerprint IS NOT NULL
  AND device_fingerprint != '';

  -- Check for existing accounts with same IP
  SELECT COUNT(*) INTO v_ip_count
  FROM profiles
  WHERE signup_ip = p_ip
  AND signup_ip IS NOT NULL
  AND signup_ip != ''
  AND signup_ip != 'unknown';

  -- If more than 2 accounts with same fingerprint, block
  IF v_fingerprint_count >= 2 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'device_limit_exceeded',
      'message', 'Limite de contas por dispositivo atingido'
    );
  END IF;

  -- If more than 3 accounts with same IP, block
  IF v_ip_count >= 3 THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'ip_limit_exceeded', 
      'message', 'Limite de contas por IP atingido'
    );
  END IF;

  -- Check for accounts that had trial and created new account (trial abuse)
  IF v_fingerprint_count >= 1 THEN
    IF EXISTS (
      SELECT 1 FROM profiles 
      WHERE device_fingerprint = p_fingerprint
      AND trial_start_at IS NOT NULL
      AND trial_start_at < NOW() - INTERVAL '7 days'
    ) THEN
      RETURN json_build_object(
        'allowed', false,
        'reason', 'trial_abuse_detected',
        'message', 'Este dispositivo já utilizou o período de teste'
      );
    END IF;
  END IF;

  RETURN json_build_object(
    'allowed', true,
    'reason', null,
    'message', null
  );
END;
$$;

-- Create index to speed up fraud checks
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON profiles(device_fingerprint) WHERE device_fingerprint IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON profiles(signup_ip) WHERE signup_ip IS NOT NULL;