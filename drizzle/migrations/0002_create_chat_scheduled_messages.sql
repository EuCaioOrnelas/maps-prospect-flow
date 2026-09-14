CREATE TABLE IF NOT EXISTS public.chat_scheduled_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  created_by uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  waba_connection_id uuid NOT NULL,
  contact_phone text NOT NULL,
  kind text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','template')),
  content text,
  template_name text,
  template_language text DEFAULT 'pt_BR',
  scheduled_at timestamptz NOT NULL,
  sequence integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','canceled')),
  sent_at timestamptz,
  waba_message_id text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_scheduled_messages TO authenticated;
GRANT ALL ON public.chat_scheduled_messages TO service_role;

ALTER TABLE public.chat_scheduled_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account members manage scheduled messages" ON public.chat_scheduled_messages;
CREATE POLICY "account members manage scheduled messages"
ON public.chat_scheduled_messages
FOR ALL
TO authenticated
USING (owner_user_id = ANY (public.accessible_owner_ids()))
WITH CHECK (owner_user_id = ANY (public.accessible_owner_ids()));

CREATE INDEX IF NOT EXISTS idx_chat_sched_due ON public.chat_scheduled_messages (status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_chat_sched_conv ON public.chat_scheduled_messages (conversation_id, scheduled_at);