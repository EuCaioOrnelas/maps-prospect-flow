ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS follow_up_message TEXT,
  ADD COLUMN IF NOT EXISTS follow_up_delay_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS follow_up_status TEXT DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS follow_up_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS follow_up_scheduled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS initial_template_id UUID;

CREATE INDEX IF NOT EXISTS idx_leads_follow_up_pending
  ON public.leads(follow_up_status)
  WHERE follow_up_status = 'pending';