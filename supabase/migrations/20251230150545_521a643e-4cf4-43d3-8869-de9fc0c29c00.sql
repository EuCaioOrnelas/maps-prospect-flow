-- Add scheduled_at column for campaign scheduling
ALTER TABLE public.whatsapp_campaigns
ADD COLUMN scheduled_at timestamp with time zone NULL;

-- Add index for finding scheduled campaigns
CREATE INDEX idx_whatsapp_campaigns_scheduled ON public.whatsapp_campaigns(scheduled_at) 
WHERE scheduled_at IS NOT NULL AND status = 'scheduled';