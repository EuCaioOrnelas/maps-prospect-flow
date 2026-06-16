
-- Versions of the workforce canvas
CREATE TABLE IF NOT EXISTS public.ai_workforce_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  notes TEXT,
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_versions TO authenticated;
GRANT ALL ON public.ai_workforce_versions TO service_role;
ALTER TABLE public.ai_workforce_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages workforce versions"
  ON public.ai_workforce_versions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_workforce_versions_wf ON public.ai_workforce_versions(workforce_id, created_at DESC);

-- Test chat conversations
CREATE TABLE IF NOT EXISTS public.ai_workforce_test_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workforce_id UUID NOT NULL REFERENCES public.ai_workforce(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT,
  message_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_test_conversations TO authenticated;
GRANT ALL ON public.ai_workforce_test_conversations TO service_role;
ALTER TABLE public.ai_workforce_test_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages test conversations"
  ON public.ai_workforce_test_conversations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_test_conv_wf ON public.ai_workforce_test_conversations(workforce_id, created_at DESC);

-- Test chat messages
CREATE TABLE IF NOT EXISTS public.ai_workforce_test_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_workforce_test_conversations(id) ON DELETE CASCADE,
  workforce_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_workforce_test_messages TO authenticated;
GRANT ALL ON public.ai_workforce_test_messages TO service_role;
ALTER TABLE public.ai_workforce_test_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages test messages"
  ON public.ai_workforce_test_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_test_msg_conv ON public.ai_workforce_test_messages(conversation_id, created_at);
