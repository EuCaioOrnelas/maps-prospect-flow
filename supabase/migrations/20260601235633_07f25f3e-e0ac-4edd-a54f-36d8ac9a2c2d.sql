-- Phase 4: responsible_user_id on WhatsApp/Meta numbers and conversations
ALTER TABLE public.whatsapp_numbers       ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
ALTER TABLE public.user_waba_connections  ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
ALTER TABLE public.chat_conversations     ADD COLUMN IF NOT EXISTS responsible_user_id uuid;
ALTER TABLE public.agent_conversations    ADD COLUMN IF NOT EXISTS responsible_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_responsible      ON public.whatsapp_numbers(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_user_waba_connections_responsible ON public.user_waba_connections(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_responsible    ON public.chat_conversations(responsible_user_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_responsible   ON public.agent_conversations(responsible_user_id);

-- Ensure chat_conversations is in realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='agent_conversations'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_conversations';
  END IF;
END$$;

ALTER TABLE public.chat_conversations  REPLICA IDENTITY FULL;
ALTER TABLE public.agent_conversations REPLICA IDENTITY FULL;