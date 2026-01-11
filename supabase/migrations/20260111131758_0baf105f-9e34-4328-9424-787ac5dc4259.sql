-- Add search assignment to warming sessions
ALTER TABLE public.warming_sessions 
ADD COLUMN IF NOT EXISTS assigned_search_query TEXT,
ADD COLUMN IF NOT EXISTS assigned_search_city TEXT;

-- Create table to track which searches are assigned to warming
CREATE TABLE IF NOT EXISTS public.warming_search_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  whatsapp_number_id UUID NOT NULL REFERENCES public.whatsapp_numbers(id) ON DELETE CASCADE,
  warming_session_id UUID REFERENCES public.warming_sessions(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  search_city TEXT,
  leads_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, whatsapp_number_id)
);

-- Enable RLS
ALTER TABLE public.warming_search_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own warming search assignments"
ON public.warming_search_assignments
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own warming search assignments"
ON public.warming_search_assignments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own warming search assignments"
ON public.warming_search_assignments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own warming search assignments"
ON public.warming_search_assignments
FOR DELETE
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_warming_search_assignments_user 
ON public.warming_search_assignments(user_id);

CREATE INDEX IF NOT EXISTS idx_warming_search_assignments_query 
ON public.warming_search_assignments(user_id, search_query, search_city);