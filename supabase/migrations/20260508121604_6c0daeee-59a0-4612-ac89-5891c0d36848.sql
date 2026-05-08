
-- Habilitar pgvector para busca semântica
CREATE EXTENSION IF NOT EXISTS vector;

-- ============ TICKETS ============
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_session text,
  name text,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'open',
  priority text NOT NULL DEFAULT 'medium',
  category text,
  resolved_by text,
  ai_confidence numeric,
  ai_summary text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_admin_all" ON public.support_tickets;
CREATE POLICY "tickets_admin_all" ON public.support_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "tickets_owner_select" ON public.support_tickets;
CREATE POLICY "tickets_owner_select" ON public.support_tickets FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "tickets_public_insert" ON public.support_tickets;
CREATE POLICY "tickets_public_insert" ON public.support_tickets FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "tickets_owner_update" ON public.support_tickets;
CREATE POLICY "tickets_owner_update" ON public.support_tickets FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id, created_at);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "messages_admin_all" ON public.support_messages;
CREATE POLICY "messages_admin_all" ON public.support_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "messages_owner_select" ON public.support_messages;
CREATE POLICY "messages_owner_select" ON public.support_messages FOR SELECT
  USING (auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "messages_public_insert" ON public.support_messages;
CREATE POLICY "messages_public_insert" ON public.support_messages FOR INSERT
  WITH CHECK (true);

-- ============ KNOWLEDGE BASE (Mind IA) ============
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text,
  subtopic text,
  tags text[] DEFAULT '{}',
  priority text DEFAULT 'medium',
  pains text,
  solution text,
  guided_flow jsonb DEFAULT '[]'::jsonb,
  severity text DEFAULT 'media',
  auto_escalate boolean DEFAULT false,
  min_confidence numeric DEFAULT 0.7,
  embedding vector(1536),
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kb_active ON public.knowledge_base(active);
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON public.knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kb_admin_all" ON public.knowledge_base;
CREATE POLICY "kb_admin_all" ON public.knowledge_base FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ FAQ TOPICS ============
CREATE TABLE IF NOT EXISTS public.faq_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text,
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.faq_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faq_topics_public_read" ON public.faq_topics;
CREATE POLICY "faq_topics_public_read" ON public.faq_topics FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "faq_topics_admin_all" ON public.faq_topics;
CREATE POLICY "faq_topics_admin_all" ON public.faq_topics FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ FAQS ============
CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.faq_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text,
  video_url text,
  tags text[] DEFAULT '{}',
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  embedding vector(1536),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_faqs_topic ON public.faqs(topic_id);
CREATE INDEX IF NOT EXISTS idx_faqs_embedding ON public.faqs USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "faqs_public_read" ON public.faqs;
CREATE POLICY "faqs_public_read" ON public.faqs FOR SELECT
  USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "faqs_admin_all" ON public.faqs;
CREATE POLICY "faqs_admin_all" ON public.faqs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ AI LOGS ============
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  query text,
  matched_kb_ids uuid[],
  matched_faq_ids uuid[],
  confidence numeric,
  model text,
  tokens_in int,
  tokens_out int,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ai_logs_ticket ON public.ai_logs(ticket_id);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_logs_admin_all" ON public.ai_logs;
CREATE POLICY "ai_logs_admin_all" ON public.ai_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ai_logs_public_insert" ON public.ai_logs;
CREATE POLICY "ai_logs_public_insert" ON public.ai_logs FOR INSERT
  WITH CHECK (true);

-- ============ RATINGS ============
CREATE TABLE IF NOT EXISTS public.support_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  resolved_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ratings_ticket ON public.support_ratings(ticket_id);

ALTER TABLE public.support_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ratings_admin_all" ON public.support_ratings;
CREATE POLICY "ratings_admin_all" ON public.support_ratings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ratings_public_insert" ON public.support_ratings;
CREATE POLICY "ratings_public_insert" ON public.support_ratings FOR INSERT
  WITH CHECK (true);

-- ============ SYSTEM ALERTS ============
CREATE TABLE IF NOT EXISTS public.system_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  title text NOT NULL,
  message text,
  category text,
  occurrences int DEFAULT 1,
  period_start timestamptz,
  period_end timestamptz,
  resolved boolean DEFAULT false,
  resolved_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "alerts_admin_all" ON public.system_alerts;
CREATE POLICY "alerts_admin_all" ON public.system_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- ============ TRIGGERS updated_at ============
DROP TRIGGER IF EXISTS support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER support_tickets_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS knowledge_base_updated_at ON public.knowledge_base;
CREATE TRIGGER knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS faq_topics_updated_at ON public.faq_topics;
CREATE TRIGGER faq_topics_updated_at BEFORE UPDATE ON public.faq_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS faqs_updated_at ON public.faqs;
CREATE TRIGGER faqs_updated_at BEFORE UPDATE ON public.faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ MATCH FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  category text,
  pains text,
  solution text,
  severity text,
  auto_escalate boolean,
  min_confidence numeric,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, title, category, pains, solution, severity, auto_escalate, min_confidence,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base
  WHERE active = true AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

CREATE OR REPLACE FUNCTION public.match_faqs(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  video_url text,
  similarity float
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, title, content, video_url,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.faqs
  WHERE active = true AND embedding IS NOT NULL
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ============ SEED FAQ TOPICS ============
INSERT INTO public.faq_topics (name, slug, sort_order) VALUES
  ('Plataforma', 'plataforma', 1),
  ('IA e Prospecção', 'ia-e-prospeccao', 2),
  ('WhatsApp e Disparos', 'whatsapp-e-disparos', 3),
  ('Meta API Oficial', 'meta-api-oficial', 4),
  ('Aquecimento de Chips', 'aquecimento-de-chips', 5),
  ('Agentes de IA', 'agentes-de-ia', 6),
  ('Flows e Automações', 'flows-e-automacoes', 7),
  ('CRM e Leads', 'crm-e-leads', 8),
  ('Planos e Pagamentos', 'planos-e-pagamentos', 9),
  ('Segurança e Privacidade', 'seguranca-e-privacidade', 10),
  ('Conectar Meta API', 'conectar-meta-api', 11),
  ('Relatórios e Métricas', 'relatorios-e-metricas', 12),
  ('Financeiro', 'financeiro', 13)
ON CONFLICT (slug) DO NOTHING;
