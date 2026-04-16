ALTER TABLE public.cancellation_feedback
  ADD COLUMN IF NOT EXISTS intends_to_return text,
  ADD COLUMN IF NOT EXISTS details text,
  ADD COLUMN IF NOT EXISTS provider text;