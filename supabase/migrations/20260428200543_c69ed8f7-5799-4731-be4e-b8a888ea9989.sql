
-- Adiciona colunas necessárias para aquecimento via IA
ALTER TABLE public.warming_sessions
  ADD COLUMN IF NOT EXISTS ai_mode boolean NOT NULL DEFAULT true;

ALTER TABLE public.warming_interactions
  ADD COLUMN IF NOT EXISTS conversation_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_reply_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lead_diagnostic_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS ai_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_ai_error text;

CREATE INDEX IF NOT EXISTS idx_warming_interactions_next_reply
  ON public.warming_interactions(next_reply_at)
  WHERE next_reply_at IS NOT NULL AND status = 'pending_response';
