
CREATE OR REPLACE FUNCTION public.get_landing_page_stats()
RETURNS TABLE (
  landing_page_id uuid,
  page_views bigint,
  signup_clicks bigint,
  signup_completed bigint,
  purchases bigint,
  trial_no_upgrade bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    e.landing_page_id,
    COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN e.event_type = 'signup_click' THEN 1 END) as signup_clicks,
    COUNT(CASE WHEN e.event_type = 'signup_completed' THEN 1 END) as signup_completed,
    COUNT(CASE WHEN e.event_type = 'purchase' THEN 1 END) as purchases,
    COUNT(CASE WHEN e.event_type = 'trial_no_upgrade' THEN 1 END) as trial_no_upgrade
  FROM public.landing_page_events e
  GROUP BY e.landing_page_id;
$$;
