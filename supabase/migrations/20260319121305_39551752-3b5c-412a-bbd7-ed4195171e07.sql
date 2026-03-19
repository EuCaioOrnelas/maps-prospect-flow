
-- Add bot detection state to agent_conversations
-- States: 'normal' (default), 'antiloop_sent' (anti-loop message was sent, awaiting validation), 'blocked_by_loop' (confirmed bot loop, agent stops responding)
ALTER TABLE public.agent_conversations 
  ADD COLUMN IF NOT EXISTS bot_detection_state text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS antiloop_sent_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bot_detection_reason text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS bot_confidence_score numeric DEFAULT NULL;

-- Add index for quick filtering of conversations in anti-loop states
CREATE INDEX IF NOT EXISTS idx_agent_conversations_bot_state 
  ON public.agent_conversations (bot_detection_state) 
  WHERE bot_detection_state != 'normal';

-- Comment for documentation
COMMENT ON COLUMN public.agent_conversations.bot_detection_state IS 'Anti-loop state: normal, antiloop_sent, blocked_by_loop';
COMMENT ON COLUMN public.agent_conversations.antiloop_sent_at IS 'Timestamp when anti-loop message was sent to this lead';
COMMENT ON COLUMN public.agent_conversations.bot_detection_reason IS 'Reasons why bot was detected (for auditing)';
COMMENT ON COLUMN public.agent_conversations.bot_confidence_score IS 'Confidence score from classifier (0-1)';
