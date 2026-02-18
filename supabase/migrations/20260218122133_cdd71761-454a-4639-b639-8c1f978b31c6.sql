
-- RPC with date filtering for landing page stats
CREATE OR REPLACE FUNCTION public.get_landing_page_stats_filtered(
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL
)
RETURNS TABLE(
  landing_page_id uuid,
  page_views bigint,
  signup_clicks bigint,
  signup_completed bigint,
  purchases bigint,
  trial_no_upgrade bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    e.landing_page_id,
    COUNT(CASE WHEN e.event_type = 'page_view' THEN 1 END) as page_views,
    COUNT(CASE WHEN e.event_type = 'signup_click' THEN 1 END) as signup_clicks,
    COUNT(CASE WHEN e.event_type = 'signup_completed' THEN 1 END) as signup_completed,
    COUNT(CASE WHEN e.event_type = 'purchase' THEN 1 END) as purchases,
    COUNT(CASE WHEN e.event_type = 'trial_no_upgrade' THEN 1 END) as trial_no_upgrade
  FROM public.landing_page_events e
  WHERE (p_start_date IS NULL OR e.created_at >= p_start_date)
    AND (p_end_date IS NULL OR e.created_at <= p_end_date)
  GROUP BY e.landing_page_id;
$$;
