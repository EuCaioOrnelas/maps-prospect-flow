-- Create table for deal history (closed negotiations)
CREATE TABLE public.lead_deals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  value DECIMAL(12, 2) NOT NULL,
  contract_type TEXT NOT NULL DEFAULT 'custom',
  contract_months INTEGER NOT NULL DEFAULT 1,
  closed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_deals ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own lead deals"
ON public.lead_deals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lead deals"
ON public.lead_deals
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lead deals"
ON public.lead_deals
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lead deals"
ON public.lead_deals
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster queries
CREATE INDEX idx_lead_deals_lead_id ON public.lead_deals(lead_id);
CREATE INDEX idx_lead_deals_user_id ON public.lead_deals(user_id);