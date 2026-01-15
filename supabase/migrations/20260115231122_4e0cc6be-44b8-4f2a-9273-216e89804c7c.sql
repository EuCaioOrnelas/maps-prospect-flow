-- Tabela principal de agentes de IA
CREATE TABLE public.ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  objective TEXT NOT NULL CHECK (objective IN ('prospecting', 'warming', 'first_contact')),
  target_audience TEXT,
  communication_style TEXT NOT NULL DEFAULT 'neutral' CHECK (communication_style IN ('formal', 'neutral', 'informal')),
  operating_hours_start TIME NOT NULL DEFAULT '08:00',
  operating_hours_end TIME NOT NULL DEFAULT '18:00',
  daily_limit INTEGER NOT NULL DEFAULT 20,
  is_warmed BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'warming', 'error')),
  n8n_workflow_id TEXT,
  n8n_webhook_url TEXT,
  messages_sent_today INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  message_templates JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Conversas do agente (1 por lead, nunca responde 2x)
CREATE TABLE public.agent_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  initial_message_sent_at TIMESTAMP WITH TIME ZONE,
  initial_message_content TEXT,
  response_received BOOLEAN NOT NULL DEFAULT false,
  response_received_at TIMESTAMP WITH TIME ZONE,
  response_content TEXT,
  reply_sent BOOLEAN NOT NULL DEFAULT false,
  reply_sent_at TIMESTAMP WITH TIME ZONE,
  reply_content TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_response', 'responded', 'completed', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(agent_id, lead_phone)
);

-- Log de mensagens para auditoria
CREATE TABLE public.agent_message_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('sent', 'received')),
  content TEXT,
  message_type TEXT DEFAULT 'text',
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_message_logs ENABLE ROW LEVEL SECURITY;

-- Policies for ai_agents
CREATE POLICY "Users can view their own agents" 
ON public.ai_agents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own agents" 
ON public.ai_agents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agents" 
ON public.ai_agents FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agents" 
ON public.ai_agents FOR DELETE 
USING (auth.uid() = user_id);

-- Policies for agent_conversations
CREATE POLICY "Users can view their agent conversations" 
ON public.agent_conversations FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = agent_id AND user_id = auth.uid()));

CREATE POLICY "Users can manage their agent conversations" 
ON public.agent_conversations FOR ALL 
USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = agent_id AND user_id = auth.uid()));

-- Policies for agent_message_logs
CREATE POLICY "Users can view their agent message logs" 
ON public.agent_message_logs FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = agent_id AND user_id = auth.uid()));

CREATE POLICY "Users can insert their agent message logs" 
ON public.agent_message_logs FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM public.ai_agents WHERE id = agent_id AND user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_ai_agents_updated_at
BEFORE UPDATE ON public.ai_agents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_conversations_updated_at
BEFORE UPDATE ON public.agent_conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for agent tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_agents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations;