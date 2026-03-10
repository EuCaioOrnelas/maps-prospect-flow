
-- Email flow templates
CREATE TABLE public.email_flow_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  preview_text TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email flows
CREATE TABLE public.email_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
  trigger_type TEXT,
  trigger_config JSONB DEFAULT '{}'::jsonb,
  audience_type TEXT,
  audience_config JSONB DEFAULT '{}'::jsonb,
  entry_rules JSONB DEFAULT '{"allow_reentry":false,"max_entries_per_user":1}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email flow nodes
CREATE TABLE public.email_flow_nodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  node_type TEXT NOT NULL CHECK (node_type IN ('entry','email','wait','condition','end')),
  name TEXT NOT NULL DEFAULT 'Novo bloco',
  config JSONB DEFAULT '{}'::jsonb,
  position_x DOUBLE PRECISION NOT NULL DEFAULT 0,
  position_y DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email flow edges
CREATE TABLE public.email_flow_edges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  source_node_id UUID NOT NULL REFERENCES public.email_flow_nodes(id) ON DELETE CASCADE,
  target_node_id UUID NOT NULL REFERENCES public.email_flow_nodes(id) ON DELETE CASCADE,
  source_handle TEXT DEFAULT 'source',
  target_handle TEXT DEFAULT 'target',
  condition_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email flow enrollments
CREATE TABLE public.email_flow_enrollments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','exited','paused','error')),
  current_node_id UUID REFERENCES public.email_flow_nodes(id) ON DELETE SET NULL,
  next_step_at TIMESTAMPTZ,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  exited_at TIMESTAMPTZ,
  exit_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email flow execution logs
CREATE TABLE public.email_flow_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.email_flows(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.email_flow_enrollments(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  node_id UUID REFERENCES public.email_flow_nodes(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  details JSONB DEFAULT '{}'::jsonb,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_email_flow_nodes_flow ON public.email_flow_nodes(flow_id);
CREATE INDEX idx_email_flow_edges_flow ON public.email_flow_edges(flow_id);
CREATE INDEX idx_email_flow_enrollments_flow ON public.email_flow_enrollments(flow_id);
CREATE INDEX idx_email_flow_enrollments_status ON public.email_flow_enrollments(status);
CREATE INDEX idx_email_flow_enrollments_next_step ON public.email_flow_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX idx_email_flow_execution_logs_flow ON public.email_flow_execution_logs(flow_id);
CREATE INDEX idx_email_flow_execution_logs_enrollment ON public.email_flow_execution_logs(enrollment_id);

-- RLS
ALTER TABLE public.email_flow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_flow_execution_logs ENABLE ROW LEVEL SECURITY;

-- Admin-only policies using has_role
CREATE POLICY "Admins manage email_flow_templates" ON public.email_flow_templates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_flows" ON public.email_flows FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_flow_nodes" ON public.email_flow_nodes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_flow_edges" ON public.email_flow_edges FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_flow_enrollments" ON public.email_flow_enrollments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage email_flow_execution_logs" ON public.email_flow_execution_logs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER update_email_flow_templates_updated_at BEFORE UPDATE ON public.email_flow_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_flows_updated_at BEFORE UPDATE ON public.email_flows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_flow_nodes_updated_at BEFORE UPDATE ON public.email_flow_nodes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_email_flow_enrollments_updated_at BEFORE UPDATE ON public.email_flow_enrollments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
