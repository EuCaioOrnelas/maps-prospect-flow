-- Create table for custom lead origins
CREATE TABLE public.lead_origins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.lead_origins ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own origins" 
ON public.lead_origins 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own origins" 
ON public.lead_origins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own origins" 
ON public.lead_origins 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint to prevent duplicate origins per user
CREATE UNIQUE INDEX idx_lead_origins_user_name ON public.lead_origins (user_id, name);