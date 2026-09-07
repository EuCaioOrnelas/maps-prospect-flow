ALTER TABLE public.wiize_api_keys
  ADD COLUMN IF NOT EXISTS allowed_ips text[] NOT NULL DEFAULT '{}'::text[];