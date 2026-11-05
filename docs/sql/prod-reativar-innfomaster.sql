-- ============================================================
-- REATIVAÇÃO — Cliente INNFOMASTER (comercial@innfomaster.com.br)
-- Rode UMA VEZ no banco de PRODUÇÃO (SQL Editor).
--
-- Por que é necessário: após o primeiro SQL, um login aconteceu
-- enquanto o e-mail na Stripe ainda era o antigo. A verificação
-- de assinatura não encontrou o cliente na Stripe e rebaixou a
-- conta para free. Agora que o e-mail na Stripe já foi corrigido,
-- esta ativação vai permanecer — e os próximos logins passam a
-- confirmar o plano automaticamente pela assinatura ativa.
-- ============================================================

DO $$
BEGIN
  EXECUTE (
    SELECT 'UPDATE public.profiles SET '
           || string_agg(col || ' = ' || val, ', ')
           || ' WHERE lower(email) = ''comercial@innfomaster.com.br'''
    FROM (VALUES
      ('plan',                           '''growth'''),
      ('payment_provider',               '''stripe'''),
      ('billing_period',                 '''monthly'''),
      ('subscription_price_cents',       '12900'),
      ('subscription_current_period_end','''2026-12-05T23:59:59-03:00'''),
      ('trial_will_charge_at',           'NULL'),
      ('trial_end_at',                   'NULL'),
      ('trial_auto_charge_cancelled',    'false'),
      ('trial_auto_charge_cancelled_at', 'NULL'),
      ('searches_used',                  '0'),
      ('searches_limit',                 '1000'),
      ('last_searches_reset',            'now()'),
      ('is_blocked',                     'false'),
      ('requires_payment_setup',         'false'),
      ('updated_at',                     'now()')
    ) AS v(col, val)
    WHERE EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND c.table_name = 'profiles'
        AND c.column_name = v.col
    )
  );
END $$;

-- Conferência — deve mostrar plano growth, limite 1000
SELECT id, email, name, plan, payment_provider,
       subscription_current_period_end, searches_limit, searches_used
FROM public.profiles
WHERE lower(email) = 'comercial@innfomaster.com.br';
