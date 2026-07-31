-- ============================================================
-- 1) AUDITORIA DE LTV — duração real (em meses) de cada assinante
-- ============================================================
-- Regra: o tempo pago começa em first_paid_at (ou trial_will_charge_at,
-- ou created_at + 7 dias de trial). Compara com o LTV exibido no cockpit.
WITH pagantes AS (
  SELECT
    p.id,
    p.email,
    p.plan,
    p.payment_provider,
    COALESCE(
      p.first_paid_at,
      p.trial_will_charge_at,
      p.created_at + interval '7 days'
    ) AS inicio_pago,
    p.subscription_price_cents,
    p.subscription_current_period_end
  FROM public.profiles p
  WHERE p.plan <> 'free'
    AND COALESCE(p.is_blocked, false) = false
    AND (p.trial_will_charge_at IS NULL OR p.trial_will_charge_at <= now())
)
SELECT
  email,
  plan,
  payment_provider,
  inicio_pago::date                                            AS inicio_pago,
  ROUND(EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0, 2) AS meses_pagos,
  ROUND(COALESCE(subscription_price_cents, 0) / 100.0, 2)      AS valor_cobrado,
  subscription_current_period_end::date                        AS proxima_renovacao
FROM pagantes
WHERE inicio_pago <= now()
ORDER BY meses_pagos DESC;

-- Resumo: média de meses pagos + LTV realista (média de meses x ticket médio)
WITH pagantes AS (
  SELECT
    COALESCE(p.first_paid_at, p.trial_will_charge_at, p.created_at + interval '7 days') AS inicio_pago,
    COALESCE(p.subscription_price_cents, 0) / 100.0 AS valor
  FROM public.profiles p
  WHERE p.plan <> 'free'
    AND COALESCE(p.is_blocked, false) = false
    AND (p.trial_will_charge_at IS NULL OR p.trial_will_charge_at <= now())
)
SELECT
  COUNT(*)                                                                      AS assinantes,
  ROUND(AVG(EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0), 2)          AS media_meses_real,
  ROUND(AVG(NULLIF(valor, 0))::numeric, 2)                                      AS ticket_medio,
  ROUND((AVG(EXTRACT(epoch FROM (now() - inicio_pago)) / 2592000.0)
         * AVG(NULLIF(valor, 0)))::numeric, 2)                                  AS ltv_observado
FROM pagantes
WHERE inicio_pago <= now();

-- Pagamentos reais por usuário (checagem cruzada da duração)
SELECT
  p.email,
  MIN(i.paid_at)::date  AS primeiro_pagamento,
  MAX(i.paid_at)::date  AS ultimo_pagamento,
  COUNT(*)              AS pagamentos_confirmados,
  ROUND(EXTRACT(epoch FROM (MAX(i.paid_at) - MIN(i.paid_at))) / 2592000.0, 2) AS meses_entre_1o_e_ultimo
FROM public.pix_invoices i
JOIN public.profiles p ON p.id = i.user_id
WHERE i.status IN ('RECEIVED', 'CONFIRMED', 'paid')
GROUP BY p.email
ORDER BY pagamentos_confirmados DESC;


-- ============================================================
-- 2) RECUPERAR O CASO "ANDREA" (reembolso) — só leitura
-- ============================================================
-- O perfil/contrato pode ter sido apagado, mas o rastro fica nas tabelas
-- de auditoria abaixo. Rode uma por uma.

SELECT * FROM public.subscription_cancellations
WHERE lower(COALESCE(user_email, '')) LIKE '%andrea%'
   OR lower(COALESCE(reason, ''))     LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.subscription_events
WHERE lower(COALESCE(metadata::text, '')) LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.custom_subscriptions
WHERE lower(COALESCE(notes, '')) LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.custom_subscription_payments
WHERE subscription_id IN (
  SELECT id FROM public.custom_subscriptions WHERE lower(COALESCE(notes, '')) LIKE '%andrea%'
)
ORDER BY created_at DESC;

SELECT * FROM public.pix_invoices
WHERE lower(COALESCE(customer_email, '')) LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.checkout_leads
WHERE lower(COALESCE(email, '')) LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.cancellation_feedback
WHERE lower(COALESCE(email, '')) LIKE '%andrea%'
ORDER BY created_at DESC;

SELECT * FROM public.email_logs
WHERE lower(COALESCE(recipient_email, '')) LIKE '%andrea%'
ORDER BY created_at DESC
LIMIT 100;

SELECT * FROM public.security_audit_log
WHERE lower(COALESCE(details::text, '')) LIKE '%andrea%'
ORDER BY created_at DESC
LIMIT 100;

SELECT * FROM public.account_audit_log
WHERE lower(COALESCE(metadata::text, '')) LIKE '%andrea%'
ORDER BY created_at DESC
LIMIT 100;

-- O usuário ainda pode existir em auth.users (perfil apagado ≠ conta apagada)
SELECT id, email, created_at, last_sign_in_at, raw_user_meta_data
FROM auth.users
WHERE lower(email) LIKE '%andrea%';
