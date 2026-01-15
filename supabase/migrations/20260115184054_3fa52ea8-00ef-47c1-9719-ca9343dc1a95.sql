-- Create campaign_drafts table for storing draft campaigns
CREATE TABLE public.campaign_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Rascunho',
  step TEXT NOT NULL DEFAULT 'leads',
  selected_leads JSONB NOT NULL DEFAULT '[]'::jsonb,
  messages JSONB NOT NULL DEFAULT '["","","","",""]'::jsonb,
  campaign_name TEXT NOT NULL DEFAULT '',
  delay_seconds_min INTEGER NOT NULL DEFAULT 40,
  delay_seconds_max INTEGER NOT NULL DEFAULT 60,
  pause_after_contacts INTEGER NOT NULL DEFAULT 30,
  pause_minutes INTEGER NOT NULL DEFAULT 5,
  enable_smart_pause BOOLEAN NOT NULL DEFAULT true,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  scheduled_date TIMESTAMPTZ,
  scheduled_time TEXT NOT NULL DEFAULT '09:00',
  selected_number_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_drafts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own drafts"
ON public.campaign_drafts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own drafts"
ON public.campaign_drafts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own drafts"
ON public.campaign_drafts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own drafts"
ON public.campaign_drafts
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_campaign_drafts_user_id ON public.campaign_drafts(user_id);
CREATE INDEX idx_campaign_drafts_created_at ON public.campaign_drafts(created_at);