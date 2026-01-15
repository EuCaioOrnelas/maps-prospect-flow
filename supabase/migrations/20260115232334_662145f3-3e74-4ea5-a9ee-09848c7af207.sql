-- Add new columns for agent prompt configuration
ALTER TABLE public.ai_agents 
ADD COLUMN IF NOT EXISTS system_prompt text,
ADD COLUMN IF NOT EXISTS agent_objective text,
ADD COLUMN IF NOT EXISTS end_conversation_criteria text,
ADD COLUMN IF NOT EXISTS max_response_chars integer DEFAULT 300;