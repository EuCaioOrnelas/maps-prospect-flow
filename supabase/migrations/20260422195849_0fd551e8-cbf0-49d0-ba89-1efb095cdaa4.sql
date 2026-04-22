
-- Remove TODAS as políticas antigas remanescentes (nomes que não pegamos antes)

-- trial_product_events
DROP POLICY IF EXISTS "Service can insert product events" ON public.trial_product_events;

-- trial_link_clicks
DROP POLICY IF EXISTS "Service can insert link clicks" ON public.trial_link_clicks;

-- trial_email_events
DROP POLICY IF EXISTS "Service can insert email events" ON public.trial_email_events;

-- trial_revenue_attribution
DROP POLICY IF EXISTS "Service can insert revenue attribution" ON public.trial_revenue_attribution;

-- trial_behaviour_trigger_logs
DROP POLICY IF EXISTS "Service can insert trigger logs" ON public.trial_behaviour_trigger_logs;

-- cancellation_feedback (política duplicada)
DROP POLICY IF EXISTS "Users can insert their own feedback" ON public.cancellation_feedback;

-- subscription_events (política duplicada que estava em public)
DROP POLICY IF EXISTS "Admins can view all subscription events" ON public.subscription_events;
CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- campaign_processor_heartbeats (política duplicada que estava em public)
DROP POLICY IF EXISTS "Only admins can view heartbeats" ON public.campaign_processor_heartbeats;
