-- Add max_replies field to ai_agents (null = unlimited, 1 = single reply, etc)
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS max_replies integer DEFAULT NULL;

-- Add comment explaining the field
COMMENT ON COLUMN public.ai_agents.max_replies IS 'Maximum number of replies per lead. NULL or 0 = unlimited, 1 = single reply (default behavior)';

-- Also add a reply_count to agent_conversations to track how many times we replied
ALTER TABLE public.agent_conversations
ADD COLUMN IF NOT EXISTS reply_count integer DEFAULT 0;