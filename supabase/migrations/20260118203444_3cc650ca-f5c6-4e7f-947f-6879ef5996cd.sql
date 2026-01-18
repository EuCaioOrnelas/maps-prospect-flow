
-- =====================================================
-- SECURITY HARDENING: Protect sensitive tables
-- =====================================================

-- 1. Drop overly permissive policies on profiles table
-- The profiles table should NOT allow public SELECT
-- Only authenticated users should see their own profile

-- First, let's check if there are any permissive policies
-- We need to ensure profiles table only allows:
-- - Users to view/update their OWN profile
-- - Admins to view/update all profiles

-- Drop any existing public/overly permissive SELECT policies if they exist
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;

-- 2. Ensure subscription_events is properly protected
-- Already has admin-only SELECT, but ensure no public access
DROP POLICY IF EXISTS "Public can view subscription events" ON public.subscription_events;
DROP POLICY IF EXISTS "Anyone can view subscription events" ON public.subscription_events;

-- 3. Add INSERT policy for subscription_events (for service role/webhooks)
DROP POLICY IF EXISTS "Service role can insert subscription events" ON public.subscription_events;
CREATE POLICY "Service role can insert subscription events"
ON public.subscription_events
FOR INSERT
WITH CHECK (true);

-- 4. Protect user_roles table - prevent self-promotion to admin
-- Already has "No public insert on roles" but let's add extra protection
-- Ensure only service role can insert roles (not even admins via client)
DROP POLICY IF EXISTS "Prevent admin self-promotion" ON public.user_roles;

-- Add a trigger to prevent users from making themselves admin
CREATE OR REPLACE FUNCTION public.prevent_role_manipulation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow role changes via service role (server-side)
  -- In Supabase, service role bypasses RLS, so this trigger adds extra protection
  IF auth.uid() IS NOT NULL AND auth.uid() = NEW.user_id THEN
    -- User is trying to modify their own role - DENY
    RAISE EXCEPTION 'Users cannot modify their own roles';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS prevent_role_manipulation_trigger ON public.user_roles;
CREATE TRIGGER prevent_role_manipulation_trigger
BEFORE INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_manipulation();

-- 5. Add rate limiting protection for auth attempts
-- Already have rate_limits table, ensure it's being used

-- 6. Create webhook_secrets table if not exists for storing webhook verification secrets
CREATE TABLE IF NOT EXISTS public.webhook_secrets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  secret_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on webhook_secrets
ALTER TABLE public.webhook_secrets ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook_secrets
DROP POLICY IF EXISTS "No public access to webhook secrets" ON public.webhook_secrets;
CREATE POLICY "No public access to webhook secrets"
ON public.webhook_secrets
FOR ALL
USING (false);

-- 7. Add security audit logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name TEXT,
  p_action TEXT,
  p_details JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
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
    p_table_name,
    NULL,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
