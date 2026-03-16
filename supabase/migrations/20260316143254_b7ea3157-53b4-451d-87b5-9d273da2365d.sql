
ALTER TABLE public.agent_conversations 
  ADD COLUMN IF NOT EXISTS agent_manually_paused boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS agent_paused_until timestamptz DEFAULT null;
