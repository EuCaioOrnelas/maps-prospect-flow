-- Add last_message_sent_at column to track when last message was sent (for delay control)
ALTER TABLE public.whatsapp_campaigns 
ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMP WITH TIME ZONE;