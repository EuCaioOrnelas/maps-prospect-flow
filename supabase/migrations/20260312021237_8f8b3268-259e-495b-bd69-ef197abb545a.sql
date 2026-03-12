
-- Add tracking columns to email_logs for open/click tracking
ALTER TABLE public.email_logs 
  ADD COLUMN IF NOT EXISTS opened_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS opened_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS clicked_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS clicked_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subject text DEFAULT NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON public.email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON public.email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status);
