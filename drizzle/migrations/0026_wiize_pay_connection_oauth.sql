ALTER TABLE public.integration_connections
  ADD COLUMN IF NOT EXISTS connected_by uuid,
  ADD COLUMN IF NOT EXISTS connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS external_account_label text;

CREATE TABLE IF NOT EXISTS public.integration_oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'wiize_pay',
  state_hash text NOT NULL UNIQUE,
  code_verifier_enc text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_oauth_states TO service_role;
ALTER TABLE public.integration_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.integration_connection_secrets (
  owner_user_id uuid PRIMARY KEY,
  provider text NOT NULL DEFAULT 'wiize_pay',
  access_token_enc text,
  refresh_token_enc text,
  access_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.integration_connection_secrets TO service_role;
ALTER TABLE public.integration_connection_secrets ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integration_oauth_states_expires ON public.integration_oauth_states(expires_at);