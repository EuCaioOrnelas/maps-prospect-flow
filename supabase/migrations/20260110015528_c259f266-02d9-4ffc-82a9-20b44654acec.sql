-- Create admin function to update profile searches_limit (bypasses trigger)
CREATE OR REPLACE FUNCTION public.admin_update_searches_limit(
  p_user_email TEXT,
  p_new_limit INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function runs with definer privileges, bypassing the trigger check
  UPDATE profiles 
  SET searches_limit = p_new_limit,
      updated_at = NOW()
  WHERE email = p_user_email;
END;
$$;

-- Grant execute to authenticated users (function itself handles security via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION public.admin_update_searches_limit TO service_role;