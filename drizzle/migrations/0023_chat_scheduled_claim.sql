-- Proteção contra processamento duplicado de mensagens agendadas do chat.
-- Aditivo: novas colunas nullable + status 'processing' aceito + função de claim atômico.

ALTER TABLE public.chat_scheduled_messages
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;

-- Amplia (não restringe) os status aceitos
ALTER TABLE public.chat_scheduled_messages
  DROP CONSTRAINT IF EXISTS chat_scheduled_messages_status_check;
ALTER TABLE public.chat_scheduled_messages
  ADD CONSTRAINT chat_scheduled_messages_status_check
  CHECK (status = ANY (ARRAY['pending'::text,'processing'::text,'sent'::text,'failed'::text,'canceled'::text]));

CREATE INDEX IF NOT EXISTS idx_chat_scheduled_messages_due
  ON public.chat_scheduled_messages (status, scheduled_at, sequence);

-- Claim atômico: marca como 'processing' e devolve apenas as linhas efetivamente reivindicadas.
CREATE OR REPLACE FUNCTION public.claim_chat_scheduled_messages(_limit integer DEFAULT 40)
RETURNS SETOF public.chat_scheduled_messages
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_scheduled_messages m
     SET status = 'processing',
         claimed_at = now(),
         attempts = m.attempts + 1,
         updated_at = now()
   WHERE m.id IN (
     SELECT c.id
       FROM public.chat_scheduled_messages c
      WHERE c.status = 'pending'
        AND c.scheduled_at <= now()
      ORDER BY c.scheduled_at ASC, c.sequence ASC
      LIMIT GREATEST(COALESCE(_limit, 40), 1)
      FOR UPDATE SKIP LOCKED
   )
  RETURNING m.*;
$$;

REVOKE ALL ON FUNCTION public.claim_chat_scheduled_messages(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_chat_scheduled_messages(integer) TO service_role;