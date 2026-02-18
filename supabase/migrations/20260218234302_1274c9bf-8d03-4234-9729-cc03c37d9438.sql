
CREATE OR REPLACE FUNCTION public.admin_update_searches_limit(p_user_email text, p_new_limit integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  ALTER TABLE profiles DISABLE TRIGGER protect_profile_fields;
  
  UPDATE profiles 
  SET searches_limit = p_new_limit,
      updated_at = NOW()
  WHERE email = p_user_email;
  
  ALTER TABLE profiles ENABLE TRIGGER protect_profile_fields;
END;
$function$;

SELECT public.admin_update_searches_limit('caiowiize@gmail.com', 1200);
