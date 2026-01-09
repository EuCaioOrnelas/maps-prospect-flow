-- Tabela para reservar saldo de disparos em dias futuros (campanhas agendadas)
CREATE TABLE IF NOT EXISTS public.campaign_daily_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  reserved_date DATE NOT NULL,
  reserved_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, whatsapp_number_id, reserved_date)
);

-- Index para buscar reservas por número e data
CREATE INDEX idx_campaign_reservations_number_date 
ON public.campaign_daily_reservations(whatsapp_number_id, reserved_date);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_campaign_reservations_updated_at
BEFORE UPDATE ON public.campaign_daily_reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.campaign_daily_reservations ENABLE ROW LEVEL SECURITY;

-- Policy: users can view their own reservations via campaigns
CREATE POLICY "Users can view own reservations" 
ON public.campaign_daily_reservations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns c 
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
);

-- Policy: users can insert reservations for their campaigns
CREATE POLICY "Users can insert own reservations" 
ON public.campaign_daily_reservations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns c 
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
);

-- Policy: users can delete their reservations
CREATE POLICY "Users can delete own reservations" 
ON public.campaign_daily_reservations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.whatsapp_campaigns c 
    WHERE c.id = campaign_id AND c.user_id = auth.uid()
  )
);

-- Adicionar coluna para tracking do índice atual de processamento
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS current_lead_index INTEGER NOT NULL DEFAULT 0;

-- Adicionar coluna para delay máximo
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS delay_seconds_max INTEGER NOT NULL DEFAULT 60;