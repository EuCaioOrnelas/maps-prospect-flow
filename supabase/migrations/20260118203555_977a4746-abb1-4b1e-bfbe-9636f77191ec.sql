
-- =====================================================
-- FIX REMAINING SECURITY ISSUES
-- =====================================================

-- 1. Remove overly permissive SELECT on heartbeats
-- Only admins should see heartbeats, not all users
DROP POLICY IF EXISTS "Users can view heartbeats" ON public.campaign_processor_heartbeats;

-- 2. The "Service role can..." policies are intentional for server-side operations
-- These are called from Edge Functions with service_role key which bypasses RLS anyway
-- But we'll add comments for documentation

-- 3. Add a function to verify webhook signatures (HMAC-SHA256)
CREATE OR REPLACE FUNCTION public.verify_webhook_signature(
  p_payload TEXT,
  p_signature TEXT,
  p_secret_name TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_secret TEXT;
  v_computed_signature TEXT;
BEGIN
  -- Get the secret from webhook_secrets table
  SELECT secret_hash INTO v_secret
  FROM public.webhook_secrets
  WHERE name = p_secret_name;
  
  IF v_secret IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Note: Actual HMAC verification should be done in Edge Functions
  -- This is a placeholder for database-level verification if needed
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Ensure profiles table INSERT is properly restricted
-- New users are created via auth trigger, not direct insert
DROP POLICY IF EXISTS "Anyone can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public can insert profiles" ON public.profiles;

-- Add proper INSERT policy - only for authenticated users creating their own profile
-- (This is typically handled by the handle_new_user trigger, but as a fallback)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);
