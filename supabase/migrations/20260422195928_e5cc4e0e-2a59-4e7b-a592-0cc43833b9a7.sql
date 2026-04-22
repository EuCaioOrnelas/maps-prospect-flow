
-- campaign_responses
DROP POLICY IF EXISTS "Service role can insert campaign responses" ON public.campaign_responses;
CREATE POLICY "Only service role inserts campaign responses"
ON public.campaign_responses FOR INSERT TO service_role
WITH CHECK (true);

-- user_landing_source
DROP POLICY IF EXISTS "Service role can insert source" ON public.user_landing_source;
CREATE POLICY "Only service role inserts landing source"
ON public.user_landing_source FOR INSERT TO service_role
WITH CHECK (true);
-- Permite o próprio usuário criar seu registro (signup tracking)
CREATE POLICY "Users can insert own landing source"
ON public.user_landing_source FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- revenue_intent_logs
DROP POLICY IF EXISTS "Service role can insert intent logs" ON public.revenue_intent_logs;
CREATE POLICY "Only service role inserts intent logs"
ON public.revenue_intent_logs FOR INSERT TO service_role
WITH CHECK (true);

-- campaign_incidents
DROP POLICY IF EXISTS "Service role can insert campaign incidents" ON public.campaign_incidents;
CREATE POLICY "Only service role inserts campaign incidents"
ON public.campaign_incidents FOR INSERT TO service_role
WITH CHECK (true);

-- landing_page_events: precisa aceitar inserts anônimos (tracking público de visitas),
-- mas BLOQUEIA spoofing de user_id e limita campos sensíveis
DROP POLICY IF EXISTS "Anyone can insert events" ON public.landing_page_events;
CREATE POLICY "Anonymous tracking with no user_id spoof"
ON public.landing_page_events FOR INSERT TO anon
WITH CHECK (user_id IS NULL);
CREATE POLICY "Authenticated tracking own events only"
ON public.landing_page_events FOR INSERT TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());
