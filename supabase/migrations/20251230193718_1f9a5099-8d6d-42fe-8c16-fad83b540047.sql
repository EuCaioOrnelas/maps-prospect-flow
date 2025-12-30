
-- Create table for connected WhatsApp numbers
CREATE TABLE public.whatsapp_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  daily_sent_count INTEGER NOT NULL DEFAULT 0,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_numbers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own numbers"
ON public.whatsapp_numbers
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own numbers"
ON public.whatsapp_numbers
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own numbers"
ON public.whatsapp_numbers
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own numbers"
ON public.whatsapp_numbers
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_numbers_updated_at
BEFORE UPDATE ON public.whatsapp_numbers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add whatsapp_number_id to campaigns
ALTER TABLE public.whatsapp_campaigns
ADD COLUMN whatsapp_number_id UUID REFERENCES public.whatsapp_numbers(id);
