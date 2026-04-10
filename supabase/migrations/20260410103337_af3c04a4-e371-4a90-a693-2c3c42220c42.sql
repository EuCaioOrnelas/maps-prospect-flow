
DROP POLICY "Service role can manage flow executions" ON public.wa_flow_executions;

CREATE POLICY "Authenticated users can insert own flow executions"
ON public.wa_flow_executions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update own flow executions"
ON public.wa_flow_executions
FOR UPDATE
USING (auth.uid() = user_id);
