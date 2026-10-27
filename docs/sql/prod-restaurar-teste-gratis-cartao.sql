-- =====================================================================
-- RESTAURAR TESTE GRÁTIS COM CARTÃO (rodar na PRODUÇÃO, bloco por bloco)
-- Troque o e-mail em TODOS os lugares marcados com  <<< E-MAIL
-- =====================================================================


-- ---------------------------------------------------------------------
-- BLOCO 1 — DIAGNÓSTICO DO CLIENTE (só leitura)
-- Mostra o que o cadastro mandou (cartão/assinatura) e como a ficha ficou.
-- ---------------------------------------------------------------------
select u.email,
       u.created_at                                         as criado_em,
       u.email_confirmed_at                                 as email_confirmado_em,
       u.raw_user_meta_data ->> 'trial_with_card'           as veio_do_teste_com_cartao,
       u.raw_user_meta_data ->> 'trial_plan_chosen'         as plano_escolhido,
       u.raw_user_meta_data ->> 'stripe_subscription_id'    as assinatura_stripe_no_cadastro,
       u.raw_user_meta_data ->> 'trial_will_charge_at'      as cobranca_prevista_no_cadastro,
       p.plan, p.payment_provider, p.searches_limit,
       p.terms_accepted_at, p.trial_start_at, p.trial_end_at,
       p.trial_will_charge_at, p.subscription_current_period_end,
       p.trial_auto_charge_cancelled, p.trial_asaas_subscription_id,
       p.trial_card_brand, p.trial_card_last4, p.is_blocked,
       public.has_active_access(p.id)                        as tem_acesso_agora
from auth.users u
left join public.profiles p on p.id = u.id
where lower(u.email) = lower('EMAIL_DO_CLIENTE@exemplo.com');   -- <<< E-MAIL


-- ---------------------------------------------------------------------
-- BLOCO 2 — LIBERAR O TESTE DE 7 DIAS DESSE CLIENTE
-- Usa a assinatura do Stripe que o próprio cadastro gravou. A cobrança
-- automática continua no Stripe; aqui só arrumamos a ficha.
-- O fim do teste = data prevista do cadastro; se não houver, 7 dias após criar a conta.
-- ---------------------------------------------------------------------
with u as (
  select id,
         created_at,
         raw_user_meta_data as m
  from auth.users
  where lower(email) = lower('EMAIL_DO_CLIENTE@exemplo.com')    -- <<< E-MAIL
)
update public.profiles p
set plan = coalesce(nullif(u.m ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth'),
    searches_limit = case coalesce(nullif(u.m ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth')
                       when 'scale' then 10000 else 1000 end,
    searches_used = 0,
    payment_provider = 'stripe',
    requires_payment_setup = false,
    is_blocked = false,
    terms_accepted_at = coalesce(p.terms_accepted_at, now()),
    trial_start_at = coalesce(p.trial_start_at, u.created_at),
    trial_plan_chosen = coalesce(nullif(u.m ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth'),
    trial_billing_period = 'monthly',
    trial_auto_charge_cancelled = false,
    trial_asaas_subscription_id = coalesce(p.trial_asaas_subscription_id, u.m ->> 'stripe_subscription_id'),
    trial_asaas_customer_id = coalesce(p.trial_asaas_customer_id, u.m ->> 'stripe_customer_id'),
    trial_card_last4 = coalesce(p.trial_card_last4, u.m ->> 'trial_card_last4'),
    trial_card_brand = coalesce(p.trial_card_brand, u.m ->> 'trial_card_brand'),
    trial_will_charge_at = greatest(
      coalesce((u.m ->> 'trial_will_charge_at')::timestamptz, u.created_at + interval '7 days'),
      u.created_at + interval '7 days'),
    trial_end_at = greatest(
      coalesce((u.m ->> 'trial_will_charge_at')::timestamptz, u.created_at + interval '7 days'),
      u.created_at + interval '7 days'),
    subscription_current_period_end = greatest(
      coalesce((u.m ->> 'trial_will_charge_at')::timestamptz, u.created_at + interval '7 days'),
      u.created_at + interval '7 days'),
    updated_at = now()
from u
where p.id = u.id;

-- Depois rode o BLOCO 1 de novo: "tem_acesso_agora" precisa vir TRUE.
-- Confira também no Stripe se a assinatura (sub_...) está "Em teste" (trialing).
-- Se o Stripe mostrar outra assinatura sub_ ativa, troque manualmente:
--   update public.profiles set trial_asaas_subscription_id = 'sub_XXXX'
--   where lower(email) = lower('EMAIL_DO_CLIENTE@exemplo.com');


-- ---------------------------------------------------------------------
-- BLOCO 3 — ACHAR OUTROS CLIENTES NA MESMA SITUAÇÃO (só leitura)
-- Entraram pelo teste com cartão nos últimos 10 dias, não cancelaram,
-- e hoje estão SEM acesso.
-- ---------------------------------------------------------------------
select u.email, u.created_at, p.plan, p.trial_will_charge_at, p.terms_accepted_at,
       p.trial_asaas_subscription_id,
       u.raw_user_meta_data ->> 'stripe_subscription_id' as assinatura_no_cadastro
from auth.users u
join public.profiles p on p.id = u.id
where u.raw_user_meta_data ->> 'trial_with_card' = 'true'
  and u.created_at > now() - interval '10 days'
  and coalesce(p.trial_auto_charge_cancelled, false) = false
  and coalesce(p.admin_assigned_plan, false) = false
  and public.has_active_access(p.id) = false
order by u.created_at desc;


-- ---------------------------------------------------------------------
-- BLOCO 4 — LIBERAR TODOS OS DO BLOCO 3 DE UMA VEZ
-- Só mexe em quem ainda está dentro dos 7 dias do teste.
-- ---------------------------------------------------------------------
update public.profiles p
set plan = coalesce(nullif(u.raw_user_meta_data ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth'),
    searches_limit = case coalesce(nullif(u.raw_user_meta_data ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth')
                       when 'scale' then 10000 else 1000 end,
    payment_provider = 'stripe',
    requires_payment_setup = false,
    terms_accepted_at = coalesce(p.terms_accepted_at, now()),
    trial_start_at = coalesce(p.trial_start_at, u.created_at),
    trial_plan_chosen = coalesce(nullif(u.raw_user_meta_data ->> 'trial_plan_chosen', ''), p.trial_plan_chosen, 'growth'),
    trial_asaas_subscription_id = coalesce(p.trial_asaas_subscription_id, u.raw_user_meta_data ->> 'stripe_subscription_id'),
    trial_asaas_customer_id = coalesce(p.trial_asaas_customer_id, u.raw_user_meta_data ->> 'stripe_customer_id'),
    trial_card_last4 = coalesce(p.trial_card_last4, u.raw_user_meta_data ->> 'trial_card_last4'),
    trial_card_brand = coalesce(p.trial_card_brand, u.raw_user_meta_data ->> 'trial_card_brand'),
    trial_will_charge_at = u.created_at + interval '7 days',
    trial_end_at = u.created_at + interval '7 days',
    subscription_current_period_end = u.created_at + interval '7 days',
    updated_at = now()
from auth.users u
where p.id = u.id
  and u.raw_user_meta_data ->> 'trial_with_card' = 'true'
  and u.created_at > now() - interval '7 days'
  and coalesce(p.trial_auto_charge_cancelled, false) = false
  and coalesce(p.admin_assigned_plan, false) = false
  and coalesce(p.is_blocked, false) = false
  and public.has_active_access(p.id) = false;


-- ---------------------------------------------------------------------
-- BLOCO 5 — REGRA DE ACESSO (garante que a produção usa a versão certa)
-- Teste em andamento sempre dá acesso; termos aceitos são obrigatórios.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_active_access(_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
  owner_id uuid;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  SELECT * INTO p FROM public.profiles WHERE id = _user_id;
  IF NOT FOUND THEN RETURN false; END IF;

  IF COALESCE(p.is_blocked, false) THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;

  owner_id := COALESCE(p.parent_owner_id, p.id);
  IF owner_id <> p.id THEN
    IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;
    RETURN public.has_active_access(owner_id);
  END IF;

  IF p.terms_accepted_at IS NULL THEN RETURN false; END IF;

  IF public.is_downgrade_protected(_user_id) THEN RETURN true; END IF;

  IF p.trial_will_charge_at IS NOT NULL AND p.trial_will_charge_at > now() THEN
    RETURN true;
  END IF;
  IF p.trial_end_at IS NOT NULL AND p.trial_end_at > now() THEN
    RETURN true;
  END IF;

  IF COALESCE(p.plan, 'free') <> 'free'
     AND p.subscription_current_period_end IS NOT NULL
     AND (p.subscription_current_period_end + interval '7 days') > now()
  THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;


-- ---------------------------------------------------------------------
-- BLOCO 6 — CONFERIR A REGRA DE CADASTRO DA PRODUÇÃO (só leitura)
-- As 3 colunas precisam vir TRUE. Se alguma vier FALSE, me mande o resultado.
-- ---------------------------------------------------------------------
select pg_get_functiondef('public.handle_new_user()'::regprocedure) ilike '%trial_with_card%'       as entende_teste_com_cartao,
       pg_get_functiondef('public.handle_new_user()'::regprocedure) ilike '%terms_accepted_at%'     as grava_aceite_dos_termos,
       pg_get_functiondef('public.handle_new_user()'::regprocedure) ilike '%trial_will_charge_at%'  as grava_data_da_cobranca;
