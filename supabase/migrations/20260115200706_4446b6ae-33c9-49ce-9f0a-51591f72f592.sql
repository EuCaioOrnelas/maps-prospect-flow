CREATE OR REPLACE FUNCTION public.check_and_reset_monthly_searches(user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  profile_record RECORD;
  should_reset BOOLEAN;
  current_month_start DATE;
  last_reset_date DATE;
BEGIN
  -- Get user profile
  SELECT * INTO profile_record 
  FROM public.profiles 
  WHERE id = user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Profile not found');
  END IF;
  
  -- Get start of current month
  current_month_start := date_trunc('month', now())::date;
  
  -- Get last reset date (just the date part, not time)
  last_reset_date := COALESCE(profile_record.last_searches_reset::date, profile_record.created_at::date);
  
  -- Check if we're in a new month since last reset
  should_reset := (last_reset_date < current_month_start);
  
  IF should_reset THEN
    -- Reset searches
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
      'message', 'Suas buscas foram renovadas!'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'reset', false,
    'searches_used', profile_record.searches_used,
    'searches_limit', profile_record.searches_limit,
    'next_reset', (date_trunc('month', now()) + interval '1 month')::date
  );
END;
$function$;