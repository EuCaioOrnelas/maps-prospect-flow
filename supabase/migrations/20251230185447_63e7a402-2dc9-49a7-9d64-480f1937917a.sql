-- Add fields for monthly reset tracking and fraud prevention
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_searches_reset TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS signup_ip TEXT,
ADD COLUMN IF NOT EXISTS device_fingerprint TEXT,
ADD COLUMN IF NOT EXISTS fraud_flags JSONB DEFAULT '[]'::jsonb;

-- Create index for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_profiles_signup_ip ON public.profiles(signup_ip);
CREATE INDEX IF NOT EXISTS idx_profiles_device_fingerprint ON public.profiles(device_fingerprint);

-- Create function to check and reset monthly searches for free users
CREATE OR REPLACE FUNCTION public.check_and_reset_monthly_searches(user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  profile_record RECORD;
  should_reset BOOLEAN;
  days_since_reset INTEGER;
BEGIN
  -- Get user profile
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  -- Calculate days since last reset
  days_since_reset := EXTRACT(DAY FROM (now() - COALESCE(profile_record.last_searches_reset, profile_record.created_at)));
  
  -- Check if 30 days have passed and user is on free plan
  should_reset := (days_since_reset >= 30 AND profile_record.plan = 'free');
  
  IF should_reset THEN
    -- Reset searches for free users
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
      'message', 'Suas buscas gratuitas foram renovadas!'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'reset', false,
    'searches_used', profile_record.searches_used,
    'searches_limit', profile_record.searches_limit,
    'days_until_reset', 30 - days_since_reset
  );
END;
$$;

-- Create function to check for fraud on signup
CREATE OR REPLACE FUNCTION public.check_signup_fraud(
  p_ip TEXT,
  p_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ip_count INTEGER;
  fingerprint_count INTEGER;
  is_suspicious BOOLEAN := false;
  fraud_reasons TEXT[] := '{}';
BEGIN
  -- Count accounts with same IP in last 24 hours
  SELECT COUNT(*) INTO ip_count 
  FROM public.profiles 
  WHERE signup_ip = p_ip 
    AND created_at > (now() - INTERVAL '24 hours');
  
  -- Count accounts with same fingerprint
  SELECT COUNT(*) INTO fingerprint_count 
  FROM public.profiles 
  WHERE device_fingerprint = p_fingerprint 
    AND p_fingerprint IS NOT NULL
    AND p_fingerprint != '';
  
  -- Flag if too many accounts from same IP
  IF ip_count >= 2 THEN
    is_suspicious := true;
    fraud_reasons := array_append(fraud_reasons, 'multiple_accounts_same_ip');
  END IF;
  
  -- Flag if fingerprint already exists
  IF fingerprint_count >= 1 THEN
    is_suspicious := true;
    fraud_reasons := array_append(fraud_reasons, 'duplicate_device');
  END IF;
  
  RETURN jsonb_build_object(
    'is_suspicious', is_suspicious,
    'ip_count', ip_count,
    'fingerprint_count', fingerprint_count,
    'reasons', fraud_reasons
  );
END;
$$;