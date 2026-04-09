-- Remove unique constraint on user_id to allow multiple Google accounts per user
ALTER TABLE public.user_google_tokens DROP CONSTRAINT IF EXISTS user_google_tokens_user_id_key;

-- Add unique constraint on user_id + google_email to prevent duplicate accounts
CREATE UNIQUE INDEX IF NOT EXISTS user_google_tokens_user_email_unique ON public.user_google_tokens (user_id, google_email);