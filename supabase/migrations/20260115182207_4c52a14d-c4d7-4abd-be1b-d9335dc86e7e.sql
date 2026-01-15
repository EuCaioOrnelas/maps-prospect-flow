-- =====================================================
-- Sistema de Janelas de Envio Anti-Bloqueio
-- =====================================================

-- Tabela para rastrear contatos que não responderam (bloqueio de reenvio)
CREATE TABLE public.ignored_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  phone VARCHAR(20) NOT NULL,
  first_message_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone)
);

-- Enable RLS
ALTER TABLE public.ignored_contacts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own ignored contacts" 
ON public.ignored_contacts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ignored contacts" 
ON public.ignored_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ignored contacts" 
ON public.ignored_contacts FOR DELETE USING (auth.uid() = user_id);

-- Índice para busca rápida
CREATE INDEX idx_ignored_contacts_user_phone ON public.ignored_contacts(user_id, phone);

-- Adicionar colunas novas na tabela whatsapp_campaigns para o sistema de janelas
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS current_window INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS window_sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_responses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS window_unlocked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_first_stage BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS accepted_window_terms BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_10_no_response_count INTEGER DEFAULT 0;

-- Tabela para rastrear respostas recebidas por campanha
CREATE TABLE public.campaign_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  message_content TEXT,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  window_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_responses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own campaign responses" 
ON public.campaign_responses FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert campaign responses" 
ON public.campaign_responses FOR INSERT WITH CHECK (true);

-- Índices
CREATE INDEX idx_campaign_responses_campaign ON public.campaign_responses(campaign_id);
CREATE INDEX idx_campaign_responses_phone ON public.campaign_responses(contact_phone);

-- Tabela para rastrear bloqueios/denúncias
CREATE TABLE public.campaign_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  incident_type VARCHAR(20) NOT NULL CHECK (incident_type IN ('block', 'report')),
  contact_phone VARCHAR(20),
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_incidents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own campaign incidents" 
ON public.campaign_incidents FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert campaign incidents" 
ON public.campaign_incidents FOR INSERT WITH CHECK (true);

-- Índice
CREATE INDEX idx_campaign_incidents_campaign ON public.campaign_incidents(campaign_id);
CREATE INDEX idx_campaign_incidents_number ON public.campaign_incidents(whatsapp_number_id);

-- Adicionar coluna na tabela leads para marcar se já recebeu primeira mensagem
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS first_message_sent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS first_message_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_responded BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- Comentários nas tabelas para documentação
COMMENT ON TABLE public.ignored_contacts IS 'Contatos que receberam mensagem mas não responderam - bloqueados para reenvio';
COMMENT ON TABLE public.campaign_responses IS 'Respostas recebidas durante campanhas para liberar janelas';
COMMENT ON TABLE public.campaign_incidents IS 'Registro de bloqueios e denúncias para pausar campanhas automaticamente';

COMMENT ON COLUMN public.whatsapp_campaigns.current_window IS 'Janela atual (1-4): 20, 30, 50, 100 mensagens';
COMMENT ON COLUMN public.whatsapp_campaigns.window_sent_count IS 'Mensagens enviadas na janela atual';
COMMENT ON COLUMN public.whatsapp_campaigns.total_responses IS 'Total de respostas recebidas na campanha';
COMMENT ON COLUMN public.whatsapp_campaigns.is_first_stage IS 'Se está no estágio de validação (só primeira mensagem)';
COMMENT ON COLUMN public.whatsapp_campaigns.first_10_no_response_count IS 'Contador de sem resposta nos primeiros 10 disparos';