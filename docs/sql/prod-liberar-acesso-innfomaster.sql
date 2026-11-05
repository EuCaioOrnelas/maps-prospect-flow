-- ============================================================
-- LIBERAR ACESSO — Cliente INNFOMASTER (comercial@innfomaster.com.br)
-- Rode UMA VEZ no banco de PRODUÇÃO (SQL Editor).
--
-- Motivo real da tela "teste expirou": a conta ainda guardava a
-- data de fim do TESTE ANTIGO (cancelado). O site olha essa data
-- primeiro e, como ela já passou, mostra "expirado" mesmo com o
-- plano Growth pago. Este SQL apaga as marcas do teste antigo.
-- Funciona em qualquer versão do banco (só mexe nas colunas que existem).
-- ============================================================

DO $$
DECLARE
  v_id uuid;
  col text;
BEGIN
  SELECT id INTO v_id FROM public.profiles
  WHERE lower(email) = 'comercial@innfomaster.com.br';
  IF v_id IS NULL THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;

  -- Datas do teste antigo -> vazias
  FOREACH col IN ARRAY ARRAY['trial_will_charge_at','trial_end_at',
    'trial_auto_charge_cancelled_at','trial_cancelled_at','trial_expired_at']
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='profiles' AND column_name=col) THEN
      EXECUTE format('UPDATE public.profiles SET %I = NULL WHERE id = $1', col) USING v_id;
    END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles' AND column_name='trial_auto_charge_cancelled') THEN
    UPDATE public.profiles SET trial_auto_charge_cancelled = false WHERE id = v_id;
  END IF;

  UPDATE public.profiles
  SET plan = 'growth',
      is_blocked = false,
      terms_accepted_at = COALESCE(terms_accepted_at, now()),
      subscription_current_period_end =
        GREATEST(COALESCE(subscription_current_period_end, now()),
                 '2026-12-05T23:59:59-03:00'::timestamptz),
      updated_at = now()
  WHERE id = v_id;
END $$;

-- Conferência: "trial_will_charge_at" precisa ficar VAZIO e "acesso_liberado" TRUE
SELECT id, email, plan, is_blocked, trial_will_charge_at,
       subscription_current_period_end,
       public.has_active_access(id) AS acesso_liberado
FROM public.profiles
WHERE lower(email) = 'comercial@innfomaster.com.br';
