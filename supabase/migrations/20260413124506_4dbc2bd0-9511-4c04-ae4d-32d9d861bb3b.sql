
-- Add trial-specific limit tracking columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_end_at timestamptz,
ADD COLUMN IF NOT EXISTS trial_leads_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_flows_used integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_campaigns_used integer NOT NULL DEFAULT 0;

-- Update handle_new_user to set trial_end_at for new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, name, avatar_url, signup_ip, device_fingerprint, terms_accepted_at, trial_start_at, trial_end_at, searches_limit)
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
    END,
    now(),
    now() + interval '7 days',
    120
  );
  RETURN NEW;
END;
$function$;
