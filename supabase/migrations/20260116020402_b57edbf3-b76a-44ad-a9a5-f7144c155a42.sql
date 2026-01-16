-- Add column to store custom reply limit during warming
ALTER TABLE public.warming_sessions 
ADD COLUMN IF NOT EXISTS agent_reply_limit integer DEFAULT 2;