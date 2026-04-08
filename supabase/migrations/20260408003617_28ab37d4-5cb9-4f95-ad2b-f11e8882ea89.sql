CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, signup_ip, device_fingerprint, terms_accepted_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NEW.email
    ),
    COALESCE(NEW.raw_user_meta_data ->> 'avatar_url', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'signup_ip', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'device_fingerprint', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'terms_accepted' = 'true' THEN now()
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;