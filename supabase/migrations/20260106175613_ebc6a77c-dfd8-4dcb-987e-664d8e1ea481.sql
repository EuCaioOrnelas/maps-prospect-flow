
-- Create pipeline stages table
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Basic data
  company_name TEXT,
  contact_name TEXT,
  phone TEXT NOT NULL,
  category TEXT,
  city TEXT,
  region TEXT,
  google_maps_link TEXT,
  website TEXT,
  
  -- Internal data
  origin TEXT DEFAULT 'manual',
  prospected_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  ai_score INTEGER DEFAULT 0,
  pipeline_stage_id UUID REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  estimated_value DECIMAL(12,2) DEFAULT 0,
  
  -- Communication data
  last_message_sent TEXT,
  last_message_sent_at TIMESTAMP WITH TIME ZONE,
  last_response TEXT,
  last_response_at TIMESTAMP WITH TIME ZONE,
  whatsapp_status TEXT DEFAULT 'never_contacted',
  
  -- Relationships
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead notes table
CREATE TABLE public.lead_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead activities table
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- Pipeline stages policies
CREATE POLICY "Users can view their own pipeline stages" ON public.pipeline_stages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own pipeline stages" ON public.pipeline_stages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own pipeline stages" ON public.pipeline_stages FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own pipeline stages" ON public.pipeline_stages FOR DELETE USING (auth.uid() = user_id);

-- Leads policies
CREATE POLICY "Users can view their own leads" ON public.leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own leads" ON public.leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads" ON public.leads FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads" ON public.leads FOR DELETE USING (auth.uid() = user_id);

-- Lead notes policies
CREATE POLICY "Users can view their own lead notes" ON public.lead_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own lead notes" ON public.lead_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lead notes" ON public.lead_notes FOR DELETE USING (auth.uid() = user_id);

-- Lead activities policies
CREATE POLICY "Users can view their own lead activities" ON public.lead_activities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own lead activities" ON public.lead_activities FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON public.pipeline_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.leads REPLICA IDENTITY FULL;
ALTER TABLE public.pipeline_stages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pipeline_stages;

-- Create indexes for performance
CREATE INDEX idx_leads_user_id ON public.leads(user_id);
CREATE INDEX idx_leads_pipeline_stage ON public.leads(pipeline_stage_id);
CREATE INDEX idx_leads_phone ON public.leads(phone);
CREATE INDEX idx_leads_whatsapp_status ON public.leads(whatsapp_status);
CREATE INDEX idx_pipeline_stages_user_id ON public.pipeline_stages(user_id);
CREATE INDEX idx_pipeline_stages_position ON public.pipeline_stages(position);
