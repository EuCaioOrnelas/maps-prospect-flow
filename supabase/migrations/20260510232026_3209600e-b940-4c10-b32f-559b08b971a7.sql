
CREATE TABLE IF NOT EXISTS public.wian_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tool text NOT NULL,
  params jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wian_tool_calls_user_id_created_at
  ON public.wian_tool_calls (user_id, created_at DESC);

ALTER TABLE public.wian_tool_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own wian tool calls" ON public.wian_tool_calls;
CREATE POLICY "Users view own wian tool calls"
  ON public.wian_tool_calls FOR SELECT
  USING (auth.uid() = user_id);
