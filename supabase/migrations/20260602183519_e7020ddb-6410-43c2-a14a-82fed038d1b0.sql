-- Add columns for email-based ticket system
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS subject TEXT,
  ADD COLUMN IF NOT EXISTS last_customer_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_support_reply_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating_email_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS autoclose_followup_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_rating_token
  ON public.support_tickets(rating_token) WHERE rating_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_autoclose
  ON public.support_tickets(last_customer_reply_at)
  WHERE status IN ('open','in_progress') AND autoclose_followup_sent_at IS NULL;

-- Allow public insert into ratings via token (already public_insert exists)
-- Add public update policy scoped via rating_token (used by rating page) — keep simple: rely on edge fn with service role
-- Ensure pg_cron / pg_net enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;