
-- Enum for node types
CREATE TYPE public.wa_flow_node_type AS ENUM (
  'entry', 'message', 'buttons', 'condition', 'wait', 'action', 'handoff', 'end'
);

-- Enum for flow status
CREATE TYPE public.wa_flow_status AS ENUM ('draft', 'active', 'paused', 'archived');

-- Main flows table
CREATE TABLE public.wa_automation_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Novo Fluxo',
  description TEXT,
  status wa_flow_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Nodes table
CREATE TABLE public.wa_flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.wa_automation_flows(id) ON DELETE CASCADE,
  node_type wa_flow_node_type NOT NULL,
  name TEXT NOT NULL DEFAULT 'Novo Bloco',
  config JSONB DEFAULT '{}',
  position_x FLOAT NOT NULL DEFAULT 0,
  position_y FLOAT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Edges table
CREATE TABLE public.wa_flow_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.wa_automation_flows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.wa_flow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.wa_flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT,
  target_handle TEXT,
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wa_automation_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wa_flow_edges ENABLE ROW LEVEL SECURITY;

-- RLS: users can CRUD their own flows
CREATE POLICY "Users manage own flows" ON public.wa_automation_flows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users manage own flow nodes" ON public.wa_flow_nodes
  FOR ALL TO authenticated USING (
    flow_id IN (SELECT id FROM public.wa_automation_flows WHERE user_id = auth.uid())
  ) WITH CHECK (
    flow_id IN (SELECT id FROM public.wa_automation_flows WHERE user_id = auth.uid())
  );

CREATE POLICY "Users manage own flow edges" ON public.wa_flow_edges
  FOR ALL TO authenticated USING (
    flow_id IN (SELECT id FROM public.wa_automation_flows WHERE user_id = auth.uid())
  ) WITH CHECK (
    flow_id IN (SELECT id FROM public.wa_automation_flows WHERE user_id = auth.uid())
  );

-- Updated at triggers
CREATE TRIGGER update_wa_automation_flows_updated_at
  BEFORE UPDATE ON public.wa_automation_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wa_flow_nodes_updated_at
  BEFORE UPDATE ON public.wa_flow_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
