-- Add leads column to search_history to store the results
ALTER TABLE public.search_history 
ADD COLUMN leads JSONB DEFAULT '[]'::jsonb;