-- Tabela para sessões de aquecimento por número
CREATE TABLE public.warming_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'active', 'paused', 'completed', 'error')),
  warming_level INTEGER NOT NULL DEFAULT 1 CHECK (warming_level >= 1 AND warming_level <= 4),
  warming_status TEXT NOT NULL DEFAULT 'cold' CHECK (warming_status IN ('cold', 'warm', 'hot')),
  leads_used INTEGER NOT NULL DEFAULT 0,
  leads_limit INTEGER NOT NULL DEFAULT 50,
  current_day INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_message_at TIMESTAMP WITH TIME ZONE,
  messages_sent_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(whatsapp_number_id)
);

-- Tabela para interações de aquecimento
CREATE TABLE public.warming_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warming_session_id UUID NOT NULL REFERENCES public.warming_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  warming_level INTEGER NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  messages_received INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'no_response')),
  last_message_sent TEXT,
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_response_at TIMESTAMP WITH TIME ZONE,
  conversation_ended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_warming_sessions_user ON public.warming_sessions(user_id);
CREATE INDEX idx_warming_sessions_number ON public.warming_sessions(whatsapp_number_id);
CREATE INDEX idx_warming_sessions_status ON public.warming_sessions(status);
CREATE INDEX idx_warming_interactions_session ON public.warming_interactions(warming_session_id);
CREATE INDEX idx_warming_interactions_phone ON public.warming_interactions(lead_phone);

-- Enable RLS
ALTER TABLE public.warming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warming_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies para warming_sessions
CREATE POLICY "Users can view own warming sessions"
ON public.warming_sessions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own warming sessions"
ON public.warming_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own warming sessions"
ON public.warming_sessions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own warming sessions"
ON public.warming_sessions FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies para warming_interactions
CREATE POLICY "Users can view own warming interactions"
ON public.warming_interactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own warming interactions"
ON public.warming_interactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own warming interactions"
ON public.warming_interactions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own warming interactions"
ON public.warming_interactions FOR DELETE
USING (auth.uid() = user_id);

-- Triggers para updated_at
CREATE TRIGGER update_warming_sessions_updated_at
BEFORE UPDATE ON public.warming_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_warming_interactions_updated_at
BEFORE UPDATE ON public.warming_interactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.warming_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.warming_interactions;