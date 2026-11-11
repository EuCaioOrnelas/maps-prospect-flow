-- =====================================================================
-- PARTE 1 — DIAGNÓSTICO (só leitura). Rode e veja o resultado.
-- =====================================================================
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_schema='public' AND table_name='profiles' AND column_name='first_paid_at')
    AS coluna_first_paid_at_existe,           -- se FALSE, é a causa do admin zerado
  (SELECT count(*) FROM public.profiles)      AS total_usuarios,
  (SELECT count(*) FROM public.profiles WHERE updated_at >= now() - interval '7 days')  AS atualizados_7d,
  (SELECT count(*) FROM public.profiles WHERE updated_at >= now() - interval '30 days') AS atualizados_30d,
  (SELECT count(*) FROM public.subscription_cancellations
     WHERE created_at >= now() - interval '30 days') AS cancelamentos_30d;

-- =====================================================================
-- PARTE 2 — CORREÇÃO (pode rodar várias vezes sem problema)
-- =====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_paid_at timestamptz;

-- Preenche a data do 1º pagamento de quem já pagou faturas PIX
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='pix_invoices' AND column_name='paid_at') THEN
    UPDATE public.profiles p
       SET first_paid_at = x.first_paid
      FROM (SELECT user_id, min(paid_at) AS first_paid
              FROM public.pix_invoices
             WHERE paid_at IS NOT NULL
             GROUP BY user_id) x
     WHERE x.user_id = p.id AND p.first_paid_at IS NULL;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
