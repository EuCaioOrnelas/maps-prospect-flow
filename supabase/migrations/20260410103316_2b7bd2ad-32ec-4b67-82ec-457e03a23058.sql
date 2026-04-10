
CREATE TABLE public.wa_flow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.wa_automation_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_node_id TEXT,
  current_node_name TEXT,
  exit_node_name TEXT,
  entry_data JSONB DEFAULT '{}'::jsonb,
  node_history JSONB DEFAULT '[]'::jsonb,
  collected_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wa_flow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own flow executions"
ON public.wa_flow_executions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage flow executions"
ON public.wa_flow_executions
FOR ALL
USING (true)
WITH CHECK (true);

CREATE INDEX idx_wa_flow_executions_flow_id ON public.wa_flow_executions(flow_id);
CREATE INDEX idx_wa_flow_executions_user_id ON public.wa_flow_executions(user_id);
CREATE INDEX idx_wa_flow_executions_status ON public.wa_flow_executions(status);
CREATE INDEX idx_wa_flow_executions_started_at ON public.wa_flow_executions(started_at);

CREATE TRIGGER update_wa_flow_executions_updated_at
BEFORE UPDATE ON public.wa_flow_executions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.wa_flow_executions;
