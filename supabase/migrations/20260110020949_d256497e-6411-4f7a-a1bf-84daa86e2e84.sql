-- Create subscription events log table for debugging
CREATE TABLE IF NOT EXISTS public.subscription_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_source TEXT NOT NULL,
  previous_plan TEXT,
  new_plan TEXT,
  previous_searches_limit INTEGER,
  new_searches_limit INTEGER,
  carry_over INTEGER DEFAULT 0,
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  stripe_event_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_subscription_events_email ON public.subscription_events(email);
CREATE INDEX idx_subscription_events_created_at ON public.subscription_events(created_at DESC);
CREATE INDEX idx_subscription_events_event_type ON public.subscription_events(event_type);

-- Enable RLS
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view subscription events
CREATE POLICY "Admins can view all subscription events"
ON public.subscription_events
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Add realtime for live monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscription_events;