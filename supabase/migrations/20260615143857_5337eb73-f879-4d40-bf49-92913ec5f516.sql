-- ============================================================
-- AI WORKFORCE — Novo módulo de Colaboradores Digitais
-- ============================================================

-- 1. ai_workforce (colaboradores digitais)
CREATE TABLE IF NOT EXISTS public.ai_workforce (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  role TEXT,
  persona TEXT,
  model TEXT NOT NULL DEFAULT 'google/gemini-3-flash-preview',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  language TEXT NOT NULL DEFAULT 'pt-BR',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce TO authenticated;
GRANT ALL ON public.ai_workforce TO service_role;
ALTER TABLE public.ai_workforce ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workforce_owner_all" ON public.ai_workforce
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_ai_workforce_user ON public.ai_workforce(user_id);

-- 2. ai_workforce_canvas
CREATE TABLE IF NOT EXISTS public.ai_workforce_canvas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  viewport JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_canvas TO authenticated;
GRANT ALL ON public.ai_workforce_canvas TO service_role;
ALTER TABLE public.ai_workforce_canvas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "canvas_owner_all" ON public.ai_workforce_canvas
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 3. ai_workforce_goals
CREATE TABLE IF NOT EXISTS public.ai_workforce_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  title TEXT NOT NULL,
  description TEXT,
  success_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_criteria JSONB NOT NULL DEFAULT '[]'::jsonb,
  max_attempts INTEGER NOT NULL DEFAULT 10,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_goals TO authenticated;
GRANT ALL ON public.ai_workforce_goals TO service_role;
ALTER TABLE public.ai_workforce_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_owner_all" ON public.ai_workforce_goals
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 4. ai_workforce_rules
CREATE TABLE IF NOT EXISTS public.ai_workforce_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  rule TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 100,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_rules TO authenticated;
GRANT ALL ON public.ai_workforce_rules TO service_role;
ALTER TABLE public.ai_workforce_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rules_owner_all" ON public.ai_workforce_rules
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 5. ai_workforce_knowledge
CREATE TABLE IF NOT EXISTS public.ai_workforce_knowledge (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_url TEXT,
  title TEXT NOT NULL,
  content TEXT,
  indexed BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_knowledge TO authenticated;
GRANT ALL ON public.ai_workforce_knowledge TO service_role;
ALTER TABLE public.ai_workforce_knowledge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "knowledge_owner_all" ON public.ai_workforce_knowledge
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 6. ai_workforce_tools
CREATE TABLE IF NOT EXISTS public.ai_workforce_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  tool_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_tools TO authenticated;
GRANT ALL ON public.ai_workforce_tools TO service_role;
ALTER TABLE public.ai_workforce_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tools_owner_all" ON public.ai_workforce_tools
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 7. ai_workforce_data_schema (campos obrigatórios para coleta)
CREATE TABLE IF NOT EXISTS public.ai_workforce_data_schema (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT true,
  validation JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_index INTEGER NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_data_schema TO authenticated;
GRANT ALL ON public.ai_workforce_data_schema TO service_role;
ALTER TABLE public.ai_workforce_data_schema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schema_owner_all" ON public.ai_workforce_data_schema
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 8. ai_workforce_decisions (árvore de decisão)
CREATE TABLE IF NOT EXISTS public.ai_workforce_decisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  tree JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_decisions TO authenticated;
GRANT ALL ON public.ai_workforce_decisions TO service_role;
ALTER TABLE public.ai_workforce_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "decisions_owner_all" ON public.ai_workforce_decisions
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.ai_workforce w WHERE w.id = workforce_id AND w.user_id = auth.uid())
  );

-- 9. ai_workforce_executions
CREATE TABLE IF NOT EXISTS public.ai_workforce_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  conversation_id UUID,
  lead_id UUID,
  channel TEXT NOT NULL DEFAULT 'whatsapp',
  status TEXT NOT NULL DEFAULT 'running',
  goal_state JSONB NOT NULL DEFAULT '{}'::jsonb,
  collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  attempts INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  completion_reason TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_executions TO authenticated;
GRANT ALL ON public.ai_workforce_executions TO service_role;
ALTER TABLE public.ai_workforce_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_owner_select" ON public.ai_workforce_executions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_workforce_exec_workforce ON public.ai_workforce_executions(workforce_id);
CREATE INDEX IF NOT EXISTS idx_workforce_exec_status ON public.ai_workforce_executions(status);

-- 10. ai_workforce_execution_logs
CREATE TABLE IF NOT EXISTS public.ai_workforce_execution_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ai_workforce_executions(id) ON DELETE CASCADE,
  step INTEGER NOT NULL DEFAULT 0,
  phase TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  tokens_in INTEGER,
  tokens_out INTEGER,
  cost_estimate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_execution_logs TO authenticated;
GRANT ALL ON public.ai_workforce_execution_logs TO service_role;
ALTER TABLE public.ai_workforce_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exec_logs_owner_select" ON public.ai_workforce_execution_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.ai_workforce_executions e WHERE e.id = execution_id AND e.user_id = auth.uid())
  );

-- 11. ai_workforce_outcomes
CREATE TABLE IF NOT EXISTS public.ai_workforce_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id UUID NOT NULL REFERENCES public.ai_workforce_executions(id) ON DELETE CASCADE,
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  outcome TEXT NOT NULL,
  summary TEXT,
  collected_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  next_action TEXT,
  interest_level TEXT,
  lead_score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_outcomes TO authenticated;
GRANT ALL ON public.ai_workforce_outcomes TO service_role;
ALTER TABLE public.ai_workforce_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "outcomes_owner_select" ON public.ai_workforce_outcomes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_workforce_outcomes_workforce ON public.ai_workforce_outcomes(workforce_id);

-- 12. ai_workforce_templates (marketplace)
CREATE TABLE IF NOT EXISTS public.ai_workforce_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  icon TEXT,
  visibility TEXT NOT NULL DEFAULT 'private',
  blueprint JSONB NOT NULL DEFAULT '{}'::jsonb,
  install_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_templates TO authenticated;
GRANT ALL ON public.ai_workforce_templates TO service_role;
ALTER TABLE public.ai_workforce_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tpl_public_read" ON public.ai_workforce_templates
  FOR SELECT TO authenticated USING (visibility = 'public' OR created_by = auth.uid());
CREATE POLICY "tpl_owner_write" ON public.ai_workforce_templates
  FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_ai_workforce_upd ON public.ai_workforce;
CREATE TRIGGER trg_ai_workforce_upd BEFORE UPDATE ON public.ai_workforce
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_workforce_canvas_upd ON public.ai_workforce_canvas;
CREATE TRIGGER trg_ai_workforce_canvas_upd BEFORE UPDATE ON public.ai_workforce_canvas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_workforce_templates_upd ON public.ai_workforce_templates;
CREATE TRIGGER trg_ai_workforce_templates_upd BEFORE UPDATE ON public.ai_workforce_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();