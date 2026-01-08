-- Add is_group flag to conversations table
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN DEFAULT FALSE;

-- Add group_name column to conversations for group display name
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Add sender_jid to messages to store who sent the message in a group
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_jid TEXT;

-- Add sender_name to messages to store the push name of sender in groups
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Create index for faster group filtering
CREATE INDEX IF NOT EXISTS idx_conversations_is_group ON public.conversations(user_id, is_group) WHERE is_group = TRUE;