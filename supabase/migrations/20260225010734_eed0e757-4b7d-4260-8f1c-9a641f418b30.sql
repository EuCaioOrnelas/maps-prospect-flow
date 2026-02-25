
-- Add multidimensional score columns to revenue_leads
ALTER TABLE public.revenue_leads
  ADD COLUMN IF NOT EXISTS score_intent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_engagement integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_urgency integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_risk integer NOT NULL DEFAULT 0;

-- Add weight configuration to revenue_settings
ALTER TABLE public.revenue_settings
  ADD COLUMN IF NOT EXISTS weight_intent numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS weight_engagement numeric NOT NULL DEFAULT 0.30,
  ADD COLUMN IF NOT EXISTS weight_urgency numeric NOT NULL DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS weight_risk numeric NOT NULL DEFAULT 0.15;

-- Create revenue_reports table for executive reports
CREATE TABLE IF NOT EXISTS public.revenue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.revenue_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage revenue reports"
  ON public.revenue_reports
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
