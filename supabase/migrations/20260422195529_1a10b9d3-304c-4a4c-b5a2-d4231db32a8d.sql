
-- ============================================================
-- 1. CORRIGIR: whatsapp_proxies (credenciais expostas)
-- ============================================================
DROP POLICY IF EXISTS "Service role can read proxies" ON public.whatsapp_proxies;

CREATE POLICY "Only admins can read proxies"
ON public.whatsapp_proxies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 2. CORRIGIR: agent_message_buffer (leads expostos)
-- ============================================================
DROP POLICY IF EXISTS "Service role can manage buffer" ON public.agent_message_buffer;

CREATE POLICY "Only service role can manage buffer"
ON public.agent_message_buffer
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can read their own agent buffer"
ON public.agent_message_buffer
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ai_agents
    WHERE ai_agents.id = agent_message_buffer.agent_id
      AND ai_agents.user_id = auth.uid()
  )
);

-- ============================================================
-- 3. CORRIGIR: trial_user_automation_state
-- ============================================================
DROP POLICY IF EXISTS "Service can manage automation state" ON public.trial_user_automation_state;

CREATE POLICY "Only service role manages automation state"
ON public.trial_user_automation_state
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Users can read own automation state"
ON public.trial_user_automation_state
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- 4. CORRIGIR: subscription_events (privilege escalation!)
-- ============================================================
DROP POLICY IF EXISTS "Service role can insert subscription events" ON public.subscription_events;

CREATE POLICY "Only service role inserts subscription events"
ON public.subscription_events
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Users can read own subscription events"
ON public.subscription_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- 5. CORRIGIR: campaign_processor_heartbeats
-- ============================================================
DROP POLICY IF EXISTS "Service role can update heartbeats" ON public.campaign_processor_heartbeats;
DROP POLICY IF EXISTS "Service role can insert heartbeats" ON public.campaign_processor_heartbeats;

CREATE POLICY "Only service role manages heartbeats"
ON public.campaign_processor_heartbeats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can read heartbeats"
ON public.campaign_processor_heartbeats
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 6. CORRIGIR: trial tracking tables (5 tabelas)
-- ============================================================
-- trial_product_events
DROP POLICY IF EXISTS "Anyone can insert product events" ON public.trial_product_events;
DROP POLICY IF EXISTS "Public can insert product events" ON public.trial_product_events;
CREATE POLICY "Authenticated users insert own product events"
ON public.trial_product_events
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages product events"
ON public.trial_product_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- trial_link_clicks
DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.trial_link_clicks;
DROP POLICY IF EXISTS "Public can insert link clicks" ON public.trial_link_clicks;
CREATE POLICY "Authenticated users insert own link clicks"
ON public.trial_link_clicks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service role manages link clicks"
ON public.trial_link_clicks
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- trial_email_events
DROP POLICY IF EXISTS "Anyone can insert email events" ON public.trial_email_events;
DROP POLICY IF EXISTS "Public can insert email events" ON public.trial_email_events;
CREATE POLICY "Service role manages email events"
ON public.trial_email_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
CREATE POLICY "Users can read own email events"
ON public.trial_email_events
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- trial_revenue_attribution
DROP POLICY IF EXISTS "Anyone can insert revenue attribution" ON public.trial_revenue_attribution;
DROP POLICY IF EXISTS "Public can insert revenue attribution" ON public.trial_revenue_attribution;
CREATE POLICY "Service role manages revenue attribution"
ON public.trial_revenue_attribution
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
CREATE POLICY "Users can read own revenue attribution"
ON public.trial_revenue_attribution
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- trial_behaviour_trigger_logs
DROP POLICY IF EXISTS "Anyone can insert trigger logs" ON public.trial_behaviour_trigger_logs;
DROP POLICY IF EXISTS "Public can insert trigger logs" ON public.trial_behaviour_trigger_logs;
CREATE POLICY "Service role manages trigger logs"
ON public.trial_behaviour_trigger_logs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
CREATE POLICY "Users can read own trigger logs"
ON public.trial_behaviour_trigger_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- ============================================================
-- 7. CORRIGIR: cancellation_feedback
-- ============================================================
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.cancellation_feedback;
DROP POLICY IF EXISTS "Anyone can insert cancellation feedback" ON public.cancellation_feedback;

CREATE POLICY "Authenticated users insert own cancellation feedback"
ON public.cancellation_feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 8. CORRIGIR: Realtime channel authorization
-- ============================================================
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can subscribe to own channels" ON realtime.messages;

CREATE POLICY "Users can subscribe to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Permite acesso a tópicos que contenham o user_id do usuário autenticado
  -- ou a tópicos públicos do sistema
  (realtime.topic() LIKE '%' || auth.uid()::text || '%')
  OR (realtime.topic() IN ('postgres_changes'))
);

-- ============================================================
-- 9. CORRIGIR: Storage buckets públicos (remover listagem)
-- ============================================================
-- Remove políticas de listagem pública mantendo acesso por URL direta
DROP POLICY IF EXISTS "Public can list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public can list chat-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can list agent-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can list wa-flow-media" ON storage.objects;
DROP POLICY IF EXISTS "Public can list deal-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Criar políticas de SELECT específicas (acesso direto por URL continua funcionando)
CREATE POLICY "Authenticated read avatars"
ON storage.objects FOR SELECT
TO authenticated, anon
USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated read chat-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media');

CREATE POLICY "Authenticated read agent-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agent-media');

CREATE POLICY "Authenticated read wa-flow-media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'wa-flow-media');

CREATE POLICY "Authenticated read deal-attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'deal-attachments');
