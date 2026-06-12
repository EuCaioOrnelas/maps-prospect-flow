
-- AUTO REPLY SETTINGS (one per waba connection)
CREATE TABLE public.chat_auto_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waba_connection_id uuid NOT NULL REFERENCES public.user_waba_connections(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  message text NOT NULL DEFAULT 'Olá! 👋 Recebemos sua mensagem fora do nosso horário de atendimento. Retornaremos assim que possível.',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '18:00',
  weekdays int[] NOT NULL DEFAULT ARRAY[1,2,3,4,5], -- 0=Sun..6=Sat
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  once_per_day boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (waba_connection_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_auto_replies TO authenticated;
GRANT ALL ON public.chat_auto_replies TO service_role;
ALTER TABLE public.chat_auto_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own auto-replies"
  ON public.chat_auto_replies FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_chat_auto_replies()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_touch_chat_auto_replies BEFORE UPDATE ON public.chat_auto_replies
FOR EACH ROW EXECUTE FUNCTION public.touch_chat_auto_replies();

-- Track last auto-reply per conversation/day to honor once_per_day
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS last_auto_reply_at timestamptz;

-- AI SUMMARY USAGE
CREATE TABLE public.chat_ai_summary_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE ON public.chat_ai_summary_usage TO authenticated;
GRANT ALL ON public.chat_ai_summary_usage TO service_role;
ALTER TABLE public.chat_ai_summary_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own summary usage"
  ON public.chat_ai_summary_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Cache last AI summary per conversation
CREATE TABLE public.chat_conversation_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  summary text NOT NULL,
  message_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.chat_conversation_summaries TO authenticated;
GRANT ALL ON public.chat_conversation_summaries TO service_role;
ALTER TABLE public.chat_conversation_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own summaries"
  ON public.chat_conversation_summaries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_chat_conv_summaries_conv ON public.chat_conversation_summaries(conversation_id, created_at DESC);

-- TRIGGER: on inbound chat_messages -> async call chat-auto-reply
CREATE OR REPLACE FUNCTION public.notify_chat_auto_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  fn_url text := 'https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/chat-auto-reply';
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indnb2toa2F3amR4c212ZnVoYXpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MTIyODgsImV4cCI6MjA4ODI4ODI4OH0.zB0PjQDsitFoRn21HDvI7v7uRrTOpd3LdqFTW6mlGYI';
BEGIN
  IF NEW.direction = 'inbound' THEN
    PERFORM net.http_post(
      url := fn_url,
      headers := jsonb_build_object('Content-Type','application/json','apikey', anon),
      body := jsonb_build_object('message_id', NEW.id, 'conversation_id', NEW.conversation_id, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chat_auto_reply ON public.chat_messages;
CREATE TRIGGER trg_chat_auto_reply
AFTER INSERT ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_auto_reply();
