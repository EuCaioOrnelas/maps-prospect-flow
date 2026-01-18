-- Add columns to track when user (owner) responds to a lead
-- This allows pausing the agent for that lead for the day
ALTER TABLE public.agent_conversations 
ADD COLUMN IF NOT EXISTS user_responded_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS user_responded_date DATE;