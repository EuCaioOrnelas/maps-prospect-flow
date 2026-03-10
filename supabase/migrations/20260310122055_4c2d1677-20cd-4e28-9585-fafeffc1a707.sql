-- Allow admins to view all agents and conversations for monitoring
CREATE POLICY "Admins can view all agents" ON public.ai_agents
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all agent conversations" ON public.agent_conversations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all agent message logs" ON public.agent_message_logs
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));