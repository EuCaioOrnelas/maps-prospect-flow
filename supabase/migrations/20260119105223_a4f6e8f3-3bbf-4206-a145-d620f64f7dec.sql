-- Add index for faster landing page events queries
CREATE INDEX IF NOT EXISTS idx_landing_page_events_page_id ON public.landing_page_events(landing_page_id);
CREATE INDEX IF NOT EXISTS idx_landing_page_events_event_type ON public.landing_page_events(event_type);
CREATE INDEX IF NOT EXISTS idx_landing_page_events_created_at ON public.landing_page_events(created_at DESC);