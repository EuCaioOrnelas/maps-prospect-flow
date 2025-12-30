-- Create whatsapp_campaigns table to store campaign history
CREATE TABLE public.whatsapp_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total_leads INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER NOT NULL DEFAULT 40,
  pause_after_contacts INTEGER DEFAULT 50,
  pause_minutes INTEGER DEFAULT 5,
  enable_smart_pause BOOLEAN NOT NULL DEFAULT true,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  leads JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own campaigns" 
ON public.whatsapp_campaigns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own campaigns" 
ON public.whatsapp_campaigns 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.whatsapp_campaigns 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.whatsapp_campaigns 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_whatsapp_campaigns_updated_at
BEFORE UPDATE ON public.whatsapp_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();