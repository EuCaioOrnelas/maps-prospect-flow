-- Diagnóstico dos clientes do teste grátis com cartão (planos novos R$89 / R$129)
-- Somente leitura. Rodar na PRODUÇÃO depois de publicar as funções.

-- 1) Quem entrou pelo teste com cartão nos últimos 45 dias e como está a ficha
select p.email, p.plan, p.payment_provider, p.trial_plan_chosen,
       p.trial_will_charge_at, p.trial_auto_charge_cancelled,
       p.trial_asaas_subscription_id as assinatura_stripe,
       p.trial_card_brand, p.trial_card_last4,
       (p.cpf is not null) as tem_cpf, (p.address is not null) as tem_endereco,
       p.created_at
from public.profiles p
where p.trial_asaas_subscription_id like 'sub_%'
  and p.created_at > now() - interval '45 days'
order by p.created_at desc;

-- 2) Possíveis pagantes rebaixados por engano para Grátis
--    (o teste já terminou, não cancelaram, mas a ficha está "free").
--    Eles voltam sozinhos ao plano certo quando entrarem no sistema
--    com a nova verificação de assinatura publicada.
select p.email, p.plan, p.trial_will_charge_at, p.trial_asaas_subscription_id
from public.profiles p
where p.trial_asaas_subscription_id like 'sub_%'
  and p.plan = 'free'
  and coalesce(p.trial_auto_charge_cancelled, false) = false
  and p.trial_will_charge_at < now();
