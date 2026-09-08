ALTER TABLE public.user_waba_connections
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'meta',
  ADD COLUMN IF NOT EXISTS evolution_instance_name text,
  ADD COLUMN IF NOT EXISTS evolution_instance_id text,
  ADD COLUMN IF NOT EXISTS evolution_token text,
  ADD COLUMN IF NOT EXISTS evolution_state text,
  ADD COLUMN IF NOT EXISTS evolution_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_name text,
  ADD COLUMN IF NOT EXISTS profile_pic_url text,
  ADD COLUMN IF NOT EXISTS last_connected_at timestamptz;

ALTER TABLE public.user_waba_connections
  ALTER COLUMN waba_id DROP NOT NULL,
  ALTER COLUMN access_token DROP NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_waba_connections_provider_check') THEN
    ALTER TABLE public.user_waba_connections
      ADD CONSTRAINT user_waba_connections_provider_check CHECK (provider IN ('meta','evolution'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS user_waba_connections_evolution_instance_uidx
  ON public.user_waba_connections (evolution_instance_name)
  WHERE evolution_instance_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS user_waba_connections_provider_idx
  ON public.user_waba_connections (provider, status);