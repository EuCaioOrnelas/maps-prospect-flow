-- =====================================================
-- SECURITY HARDENING MIGRATION - Part 2
-- =====================================================

-- 8. Create security audit log table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view security logs
DROP POLICY IF EXISTS "Only admins can view security logs" ON public.security_audit_log;
CREATE POLICY "Only admins can view security logs"
ON public.security_audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert logs
DROP POLICY IF EXISTS "Service can insert security logs" ON public.security_audit_log;
CREATE POLICY "Service can insert security logs"
ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 9. Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_resource_type text,
  p_resource_id text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    p_action,
    p_resource_type,
    p_resource_id,
    p_metadata
  );
END;
$$;

-- 10. Fix normalize_brazilian_phone function - add search_path
CREATE OR REPLACE FUNCTION public.normalize_brazilian_phone(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  clean_phone TEXT;
  ddd TEXT;
  number_part TEXT;
BEGIN
  clean_phone := regexp_replace(phone_input, '[^0-9]', '', 'g');
  
  IF clean_phone ~ '@lid' OR length(clean_phone) < 10 THEN
    RETURN phone_input;
  END IF;
  
  IF clean_phone LIKE '55%' AND length(clean_phone) >= 12 THEN
    clean_phone := substring(clean_phone from 3);
  END IF;
  
  IF length(clean_phone) = 10 THEN
    ddd := substring(clean_phone from 1 for 2);
    number_part := substring(clean_phone from 3);
    
    IF substring(number_part from 1 for 1) IN ('6', '7', '8', '9') THEN
      clean_phone := ddd || '9' || number_part;
    END IF;
  END IF;
  
  RETURN '55' || clean_phone;
END;
$$;

-- 11. Fix get_phone_key function - add search_path
CREATE OR REPLACE FUNCTION public.get_phone_key(phone_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN RIGHT(regexp_replace(phone_input, '[^0-9]', '', 'g'), 8);
END;
$$;

-- 12. Add index for security audit log
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON public.security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_action ON public.security_audit_log(action);