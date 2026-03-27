
CREATE TABLE public.meta_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waba_id TEXT,
  phone_number_id TEXT,
  event_type TEXT NOT NULL,
  from_phone TEXT,
  contact_name TEXT,
  message_type TEXT,
  message_content TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying by WABA and event type
CREATE INDEX idx_meta_webhook_events_waba ON public.meta_webhook_events(waba_id, event_type);
CREATE INDEX idx_meta_webhook_events_received ON public.meta_webhook_events(received_at DESC);

-- RLS: only admins and service role can access
ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view meta webhook events"
  ON public.meta_webhook_events
  FOR SELECT
  TO authenticated
  USING (public.is_current_user_admin());
