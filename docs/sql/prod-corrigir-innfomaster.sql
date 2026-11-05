-- ============================================================
-- CORREÇÃO MANUAL — Cliente INNFOMASTER (conta ex-Nikolay Bazzana)
-- Rode UMA VEZ no banco de PRODUÇÃO (SQL Editor), na ordem abaixo.
--
-- Situação: o cliente fez o trial, cancelou (sem limite no cartão),
-- depois comprou o Growth IA (R$129/mês) quando liberou o limite.
-- A Stripe confirmou o pagamento (assinatura ativa, período
-- 05/11/2026 → 05/12/2026), mas o webhook não atualizou a conta,
-- que continuou como "cancelada".
--
-- O que este script faz:
--   1) Libera o acesso pago (plano Growth, vigência até 05/12/2026)
--   2) Troca os dados cadastrais na MESMA conta (mesmo UID):
--      nome, e-mail, CNPJ, telefone e endereço da INNFOMASTER
--   3) Atualiza o e-mail de login na autenticação
--
-- Nada é apagado: prospecção, IA, leads, fluxos e histórico
-- continuam intactos, pois o UID da conta não muda.
-- ============================================================

-- 1) Liberar o acesso pago (equivale ao que o webhook faria)
UPDATE public.profiles
SET
  plan = 'growth',
  payment_provider = 'stripe',
  billing_period = 'monthly',
  subscription_price_cents = 12900,
  subscription_current_period_end = '2026-12-05T23:59:59-03:00',
  trial_will_charge_at = NULL,
  trial_end_at = NULL,
  trial_auto_charge_cancelled = false,
  trial_auto_charge_cancelled_at = NULL,
  searches_used = 0,
  searches_limit = 1000,
  last_searches_reset = now(),
  first_paid_at = COALESCE(first_paid_at, now()),
  is_blocked = false,
  requires_payment_setup = false,
  updated_at = now()
WHERE lower(email) = 'n.bazzana@gmail.com';

-- 2) Trocar os dados cadastrais na mesma conta
UPDATE public.profiles
SET
  email = 'comercial@innfomaster.com.br',
  name = 'INNFOMASTER',
  cpf = '08091350000112',
  phone = '556792213440',
  address = 'Rua Rio Grande do Sul',
  address_number = '968',
  neighborhood = 'Centro',
  city = 'Campo Grande',
  state = 'MS',
  updated_at = now()
WHERE lower(email) = 'n.bazzana@gmail.com';

-- 3) Nome da empresa no perfil comercial (se já existir)
UPDATE public.company_profiles
SET company_name = 'INNFOMASTER', updated_at = now()
WHERE user_id = (
  SELECT id FROM public.profiles
  WHERE lower(email) = 'comercial@innfomaster.com.br'
);

-- 4) Trocar o e-mail de login na autenticação (a senha não muda)
UPDATE auth.users
SET
  email = 'comercial@innfomaster.com.br',
  raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', '"INNFOMASTER"'
  ),
  updated_at = now()
WHERE lower(email) = 'n.bazzana@gmail.com';

-- 5) Conferência — deve mostrar 1 linha com plano growth e o novo e-mail
SELECT id, email, name, plan, payment_provider,
       subscription_current_period_end, searches_limit, searches_used
FROM public.profiles
WHERE lower(email) = 'comercial@innfomaster.com.br';
