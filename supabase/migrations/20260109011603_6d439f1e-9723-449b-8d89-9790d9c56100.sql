-- Create table to store cron job heartbeats
CREATE TABLE public.campaign_processor_heartbeats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'running',
  campaigns_processed INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_processor_heartbeats ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read heartbeats
CREATE POLICY "Users can view heartbeats" 
ON public.campaign_processor_heartbeats 
FOR SELECT 
USING (true);

-- Create index for faster queries
CREATE INDEX idx_heartbeats_created_at ON public.campaign_processor_heartbeats(created_at DESC);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.campaign_processor_heartbeats;