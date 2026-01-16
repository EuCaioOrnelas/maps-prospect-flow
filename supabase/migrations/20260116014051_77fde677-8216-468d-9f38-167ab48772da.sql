-- Add post_response_behavior column to ai_agents table
ALTER TABLE public.ai_agents 
ADD COLUMN post_response_behavior TEXT DEFAULT NULL;