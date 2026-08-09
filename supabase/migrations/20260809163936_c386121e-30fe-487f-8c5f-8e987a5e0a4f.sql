ALTER TABLE public.user_ai_credentials
  ALTER COLUMN api_key DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS encrypted_key TEXT,
  ADD COLUMN IF NOT EXISTS key_hint TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.sdr_agents
  ADD COLUMN IF NOT EXISTS ai JSONB NOT NULL DEFAULT '{"provider":"openai","model":"gpt-4o-mini"}'::jsonb;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_credentials TO authenticated;
GRANT ALL ON public.user_ai_credentials TO service_role;