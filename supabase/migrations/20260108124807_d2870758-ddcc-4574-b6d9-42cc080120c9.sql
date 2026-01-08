-- Add field to track if conversation was manually marked as unread
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS manually_marked_unread BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_conversations_manually_marked_unread 
ON public.conversations(manually_marked_unread) WHERE manually_marked_unread = true;