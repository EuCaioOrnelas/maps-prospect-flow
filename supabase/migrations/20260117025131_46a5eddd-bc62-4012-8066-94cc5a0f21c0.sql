-- Create table to buffer incoming messages before agent responds
CREATE TABLE public.agent_message_buffer (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.ai_agents(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  lead_phone TEXT NOT NULL,
  lead_name TEXT,
  message_content TEXT NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_agent_message_buffer_agent_phone ON public.agent_message_buffer(agent_id, lead_phone);
CREATE INDEX idx_agent_message_buffer_received_at ON public.agent_message_buffer(received_at);

-- Add process_after column to agent_conversations to track when to process buffered messages
ALTER TABLE public.agent_conversations 
ADD COLUMN IF NOT EXISTS process_after TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_processing BOOLEAN DEFAULT false;

-- Create index for processor queries
CREATE INDEX IF NOT EXISTS idx_agent_conversations_process_after 
ON public.agent_conversations(process_after) 
WHERE process_after IS NOT NULL AND is_processing = false;

-- Enable RLS
ALTER TABLE public.agent_message_buffer ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role only for edge functions)
CREATE POLICY "Service role can manage buffer" 
ON public.agent_message_buffer 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Enable realtime for buffer table
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_message_buffer;