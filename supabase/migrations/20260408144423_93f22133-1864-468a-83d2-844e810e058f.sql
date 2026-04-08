
ALTER TABLE public.user_ai_credentials ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Minha Credencial';

CREATE TABLE IF NOT EXISTS public.user_ai_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  credential_id UUID REFERENCES public.user_ai_credentials(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Meu Agente',
  ai_provider TEXT NOT NULL DEFAULT 'openai',
  ai_model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  system_prompt TEXT,
  ai_routes TEXT,
  ai_output_type TEXT NOT NULL DEFAULT 'message_and_route',
  max_chars INTEGER NOT NULL DEFAULT 500,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_ai_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agents" ON public.user_ai_agents
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
