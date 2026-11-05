-- ============================================================
-- LIBERAR ACESSO — Cliente INNFOMASTER (comercial@innfomaster.com.br)
-- Rode UMA VEZ no banco de PRODUÇÃO (SQL Editor).
--
-- Por que ainda aparecia "teste gratuito expirou":
-- o plano já estava growth, mas a regra de acesso do sistema
-- também exige o aceite dos termos registrado na conta. Como ele
-- cancelou o teste antes de concluir o cadastro, esse aceite ficou
-- vazio — e sem ele o sistema trava a conta, mesmo com plano pago.
-- Este SQL registra o aceite e garante que a conta não está bloqueada.
-- ============================================================

-- 1) Diagnóstico ANTES (para você ver o motivo)
SELECT id, email, plan, is_blocked, terms_accepted_at,
       subscription_current_period_end, parent_owner_id,
       public.has_active_access(id) AS acesso_liberado
FROM public.profiles
WHERE lower(email) = 'comercial@innfomaster.com.br';

-- 2) Correção
UPDATE public.profiles
SET terms_accepted_at = COALESCE(terms_accepted_at, now()),
    is_blocked        = false,
    plan              = 'growth',
    subscription_current_period_end =
      GREATEST(COALESCE(subscription_current_period_end, now()),
               '2026-12-05T23:59:59-03:00'::timestamptz),
    updated_at        = now()
WHERE lower(email) = 'comercial@innfomaster.com.br';

-- 3) Conferência DEPOIS — "acesso_liberado" precisa aparecer TRUE
SELECT id, email, plan, is_blocked, terms_accepted_at,
       subscription_current_period_end,
       public.has_active_access(id) AS acesso_liberado
FROM public.profiles
WHERE lower(email) = 'comercial@innfomaster.com.br';
