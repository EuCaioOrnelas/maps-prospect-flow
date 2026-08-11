CREATE INDEX IF NOT EXISTS idx_revenue_events_lead_type_created
  ON public.revenue_events (lead_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_score_logs_lead_type_created
  ON public.revenue_score_logs (lead_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_revenue_leads_last_activity
  ON public.revenue_leads (last_activity_at);

CREATE INDEX IF NOT EXISTS idx_blog_posts_status_scheduled
  ON public.blog_posts (status, scheduled_for);

CREATE OR REPLACE FUNCTION public.accessible_owner_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(array_agg(DISTINCT oid), ARRAY[]::uuid[])
  FROM (
    SELECT auth.uid() AS oid WHERE auth.uid() IS NOT NULL
    UNION
    SELECT p.parent_owner_id
    FROM public.profiles p
    WHERE p.id = auth.uid() AND p.parent_owner_id IS NOT NULL
    UNION
    SELECT am.owner_user_id
    FROM public.account_members am
    WHERE am.user_id = auth.uid() AND am.status = 'active'
  ) s
  WHERE oid IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.accessible_owner_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accessible_owner_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION public.accessible_owner_ids() TO service_role;

ANALYZE public.leads;
ANALYZE public.chat_conversations;
ANALYZE public.revenue_leads;
ANALYZE public.revenue_events;