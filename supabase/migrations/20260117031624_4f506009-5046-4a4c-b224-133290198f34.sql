-- Drop the old constraint and add new one with 'buffering' status
ALTER TABLE public.agent_conversations DROP CONSTRAINT agent_conversations_status_check;

ALTER TABLE public.agent_conversations ADD CONSTRAINT agent_conversations_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_response'::text, 'responded'::text, 'completed'::text, 'ignored'::text, 'buffering'::text]));