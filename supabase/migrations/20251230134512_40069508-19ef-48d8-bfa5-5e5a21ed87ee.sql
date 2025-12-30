-- Create shared_reports table for password-protected report links
CREATE TABLE public.shared_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  filter_type TEXT NOT NULL DEFAULT 'all',
  report_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;

-- Users can create their own shared reports
CREATE POLICY "Users can create their own shared reports"
ON public.shared_reports
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own shared reports
CREATE POLICY "Users can view their own shared reports"
ON public.shared_reports
FOR SELECT
USING (auth.uid() = user_id);

-- Users can delete their own shared reports
CREATE POLICY "Users can delete their own shared reports"
ON public.shared_reports
FOR DELETE
USING (auth.uid() = user_id);

-- Allow public access to shared reports (for password verification via edge function)
CREATE POLICY "Public can view shared reports for password check"
ON public.shared_reports
FOR SELECT
USING (true);

-- Add index for faster lookups
CREATE INDEX idx_shared_reports_user_id ON public.shared_reports(user_id);
CREATE INDEX idx_shared_reports_expires_at ON public.shared_reports(expires_at);