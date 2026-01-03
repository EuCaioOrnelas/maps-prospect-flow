-- Tabela para armazenar as landing pages criadas
CREATE TABLE public.landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para tracking de eventos das páginas
CREATE TABLE public.landing_page_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'page_view', 'signup_click', 'signup_completed', 'purchase', 'trial_no_upgrade'
  user_id UUID, -- opcional, preenchido após signup
  session_id TEXT, -- para tracking anônimo
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela para associar usuários à página de origem
CREATE TABLE public.user_landing_source (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Inserir a página principal (index) como padrão
INSERT INTO public.landing_pages (slug, name) VALUES ('index', 'Página Principal');

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.landing_page_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_landing_source ENABLE ROW LEVEL SECURITY;

-- Políticas para landing_pages (apenas admins podem gerenciar)
CREATE POLICY "Admins can manage landing pages"
ON public.landing_pages
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view active landing pages"
ON public.landing_pages
FOR SELECT
USING (is_active = true);

-- Políticas para landing_page_events
CREATE POLICY "Anyone can insert events"
ON public.landing_page_events
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all events"
ON public.landing_page_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Políticas para user_landing_source
CREATE POLICY "Service role can insert source"
ON public.user_landing_source
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all sources"
ON public.user_landing_source
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own source"
ON public.user_landing_source
FOR SELECT
USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_landing_page_events_page_id ON public.landing_page_events(landing_page_id);
CREATE INDEX idx_landing_page_events_event_type ON public.landing_page_events(event_type);
CREATE INDEX idx_landing_page_events_created_at ON public.landing_page_events(created_at);
CREATE INDEX idx_user_landing_source_page_id ON public.user_landing_source(landing_page_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();