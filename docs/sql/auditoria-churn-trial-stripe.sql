-- ============================================================================
-- AUDITORIA + CORREÇÃO: trials Stripe cancelados sendo contados como churn/MRR
-- Idempotente. Rodar no banco de PRODUÇÃO.
-- Passo 1 = diagnóstico (só leitura). Passo 2 = correção. Passo 3 = conferência.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASSO 1 — DIAGNÓSTICO: esses usuários já pagaram alguma vez?
-- ----------------------------------------------------------------------------
WITH alvo AS (
  SELECT unnest(ARRAY[
    'fellipe.otani12@gmail.com',
    'klebsoncarneiromago@gmail.com',
    'maldonadoemagalhaes@gmail.com',
    'geraldocardosousina@gmail.com'
  ]) AS email
),
p AS (
  SELECT pr.id, lower(pr.email) AS email, pr.plan, pr.payment_provider,
         pr.subscription_price_cents, pr.subscription_current_period_end,
         pr.is_custom_subscription, pr.created_at
  FROM public.profiles pr
  JOIN alvo a ON lower(pr.email) = lower(a.email)
)
SELECT
  p.email,
  p.plan,
  p.payment_provider,
  p.subscription_price_cents,
  p.subscription_current_period_end,
  p.is_custom_subscription,
  (SELECT count(*) FROM public.custom_subscription_payments c
     WHERE c.user_id = p.id AND COALESCE(c.amount_cents,0) > 0)            AS pagamentos_custom,
  (SELECT count(*) FROM public.pix_invoices i
     WHERE i.user_id = p.id AND i.status IN ('paid','RECEIVED','CONFIRMED','received','confirmed')
       AND COALESCE(i.amount_cents,0) > 0)                                  AS pix_pagos,
  (SELECT count(*) FROM public.partner_sales s
     WHERE s.customer_user_id = p.id AND COALESCE(s.amount_cents,0) > 0)    AS vendas_parceiro,
  (SELECT count(*) FROM public.subscription_events e
     WHERE e.user_id = p.id
       AND e.event_type IN ('invoice_paid','payment_succeeded','subscription_paid','charge_succeeded')
  )                                                                          AS eventos_pagamento,
  (SELECT count(*) FROM public.subscription_cancellations sc
     WHERE sc.user_id = p.id)                                               AS registros_churn,
  (SELECT count(*) FROM public.subscription_events e
     WHERE e.user_id = p.id
       AND e.event_type IN ('subscription_canceled','subscription_deleted','charge_refunded','pix_not_renewed')
  )                                                                          AS eventos_churn
FROM p
ORDER BY p.email;

-- ----------------------------------------------------------------------------
-- PASSO 2 — CORREÇÃO GENÉRICA
-- Regra: cancelamento só é churn se houve pelo menos 1 pagamento positivo.
-- Quem cancelou ainda no trial (sem nenhum pagamento) sai do churn e do MRR.
-- ----------------------------------------------------------------------------
BEGIN;

CREATE TEMP TABLE tmp_sem_pagamento ON COMMIT DROP AS
SELECT pr.id AS user_id, lower(pr.email) AS email
FROM public.profiles pr
WHERE NOT EXISTS (
        SELECT 1 FROM public.custom_subscription_payments c
        WHERE c.user_id = pr.id AND COALESCE(c.amount_cents,0) > 0)
  AND NOT EXISTS (
        SELECT 1 FROM public.pix_invoices i
        WHERE i.user_id = pr.id
          AND i.status IN ('paid','RECEIVED','CONFIRMED','received','confirmed')
          AND COALESCE(i.amount_cents,0) > 0)
  AND NOT EXISTS (
        SELECT 1 FROM public.partner_sales s
        WHERE s.customer_user_id = pr.id AND COALESCE(s.amount_cents,0) > 0)
  AND NOT EXISTS (
        SELECT 1 FROM public.subscription_events e
        WHERE e.user_id = pr.id
          AND e.event_type IN ('invoice_paid','payment_succeeded','subscription_paid','charge_succeeded'));

-- 2.1 Remove do churn quem nunca pagou (trial cancelado não é churn)
DELETE FROM public.subscription_cancellations sc
USING tmp_sem_pagamento t
WHERE sc.user_id = t.user_id;

DELETE FROM public.subscription_events e
USING tmp_sem_pagamento t
WHERE e.user_id = t.user_id
  AND e.event_type IN ('subscription_canceled','subscription_deleted','charge_refunded','pix_not_renewed');

-- 2.2 Zera resíduo de MRR em perfis free/sem pagamento
UPDATE public.profiles pr
SET subscription_price_cents = 0,
    subscription_current_period_end = NULL,
    payment_provider = NULL
FROM tmp_sem_pagamento t
WHERE pr.id = t.user_id
  AND pr.plan = 'free'
  AND (COALESCE(pr.subscription_price_cents,0) > 0
       OR pr.subscription_current_period_end IS NOT NULL
       OR pr.payment_provider IS NOT NULL);

-- 2.3 Contratos custom órfãos/sem pagamento não podem somar MRR
UPDATE public.custom_subscriptions cs
SET status = 'canceled',
    monthly_value_cents = 0,
    total_value_cents = 0,
    canceled_at = COALESCE(cs.canceled_at, now()),
    cancel_reason = COALESCE(cs.cancel_reason, 'voided_by_admin'),
    updated_at = now()
WHERE cs.status = 'active'
  AND COALESCE(cs.monthly_value_cents,0) > 0
  AND NOT EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.id = cs.user_id);

COMMIT;

-- ----------------------------------------------------------------------------
-- PASSO 3 — CONFERÊNCIA (tudo deve voltar zerado para os 4 e-mails)
-- ----------------------------------------------------------------------------
SELECT lower(pr.email) AS email, pr.plan, pr.subscription_price_cents,
       pr.payment_provider,
       (SELECT count(*) FROM public.subscription_cancellations sc WHERE sc.user_id = pr.id) AS churn_restante,
       (SELECT count(*) FROM public.subscription_events e
          WHERE e.user_id = pr.id
            AND e.event_type IN ('subscription_canceled','subscription_deleted','charge_refunded','pix_not_renewed')) AS eventos_churn_restantes
FROM public.profiles pr
WHERE lower(pr.email) IN (
  'fellipe.otani12@gmail.com','klebsoncarneiromago@gmail.com',
  'maldonadoemagalhaes@gmail.com','geraldocardosousina@gmail.com')
ORDER BY 1;

-- Resumo global do churn válido (só quem pagou pelo menos 1x)
SELECT count(*) AS churn_valido_total
FROM public.subscription_cancellations sc
WHERE sc.cancelled_at >= '2026-06-01';
