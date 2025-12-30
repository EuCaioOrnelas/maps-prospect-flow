-- Add fields for daily limit tracking and pause reason
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS paused_at_limit BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pause_reason TEXT,
ADD COLUMN IF NOT EXISTS resume_at TIMESTAMP WITH TIME ZONE;

-- Create index for quick status queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_status ON public.whatsapp_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_user_status ON public.whatsapp_campaigns(user_id, status);