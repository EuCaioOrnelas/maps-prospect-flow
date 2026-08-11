CREATE TABLE IF NOT EXISTS public.waba_number_responsibles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.user_waba_connections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Cada usuário pode ser responsável por apenas 1 número
CREATE UNIQUE INDEX IF NOT EXISTS waba_number_responsibles_user_unique
  ON public.waba_number_responsibles (user_id);
CREATE INDEX IF NOT EXISTS waba_number_responsibles_conn_idx
  ON public.waba_number_responsibles (connection_id);
CREATE INDEX IF NOT EXISTS waba_number_responsibles_owner_idx
  ON public.waba_number_responsibles (owner_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waba_number_responsibles TO authenticated;
GRANT ALL ON public.waba_number_responsibles TO service_role;

ALTER TABLE public.waba_number_responsibles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "account can view number responsibles" ON public.waba_number_responsibles;
CREATE POLICY "account can view number responsibles"
  ON public.waba_number_responsibles FOR SELECT TO authenticated
  USING (owner_user_id = public.get_account_owner(auth.uid()));

DROP POLICY IF EXISTS "account can manage number responsibles" ON public.waba_number_responsibles;
CREATE POLICY "account can manage number responsibles"
  ON public.waba_number_responsibles FOR ALL TO authenticated
  USING (owner_user_id = public.get_account_owner(auth.uid()))
  WITH CHECK (owner_user_id = public.get_account_owner(auth.uid()));

-- Migra os responsáveis atuais (1 por número) para a nova tabela
INSERT INTO public.waba_number_responsibles (owner_user_id, connection_id, user_id)
SELECT c.owner_user_id, c.id, c.responsible_user_id
FROM public.user_waba_connections c
WHERE c.responsible_user_id IS NOT NULL
ON CONFLICT (user_id) DO NOTHING;