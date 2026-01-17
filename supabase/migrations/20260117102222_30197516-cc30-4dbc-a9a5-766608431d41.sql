-- Add simulation_mode to campaigns table
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS simulation_mode boolean DEFAULT false;