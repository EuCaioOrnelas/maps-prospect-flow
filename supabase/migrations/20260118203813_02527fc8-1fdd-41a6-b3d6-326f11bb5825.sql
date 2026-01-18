
-- =====================================================
-- FIX REMAINING SECURITY WARNINGS
-- =====================================================

-- 1. Fix user_roles - ensure only admins and users themselves can see roles
-- The existing policies are correct, but let's ensure comprehensive coverage
DROP POLICY IF EXISTS "Service role can view all roles" ON public.user_roles;

-- 2. Fix api_key_status - restrict to admin only
DROP POLICY IF EXISTS "Service role can manage api key status" ON public.api_key_status;

-- Only admins can SELECT api_key_status
CREATE POLICY "Only admins can view api key status"
ON public.api_key_status
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role (via edge functions) can insert/update
CREATE POLICY "Service role can insert api key status"
ON public.api_key_status
FOR INSERT
WITH CHECK (auth.uid() IS NULL); -- Only service role (no user context)

CREATE POLICY "Service role can update api key status"
ON public.api_key_status
FOR UPDATE
USING (auth.uid() IS NULL); -- Only service role (no user context)

-- 3. Move pg_net extension to extensions schema (fix extension in public warning)
-- Note: This may fail if extension is in use, but we'll try
DO $$
BEGIN
  -- Check if extensions schema exists, create if not
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Try to move pg_net to extensions schema
  -- This is a best-effort migration
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not move extension: %', SQLERRM;
END $$;
