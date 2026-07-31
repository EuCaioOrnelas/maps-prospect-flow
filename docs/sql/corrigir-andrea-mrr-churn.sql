-- Correção idempotente: contrato custom desfeito não é receita nem churn.
-- Alvo: andreamoraes05@gmail.com
BEGIN;

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id
  FROM public.profiles
  WHERE lower(email) = lower('andreamoraes05@gmail.com')
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Perfil não encontrado; procurando apenas eventos pelo e-mail.';
  ELSE
    UPDATE public.custom_subscriptions
       SET status = 'canceled',
           monthly_value_cents = 0,
           total_value_cents = 0,
           canceled_at = COALESCE(canceled_at, now()),
           cancel_reason = 'voided_by_admin',
           updated_at = now()
     WHERE user_id = v_user_id
       AND status IN ('active', 'canceled');

    DELETE FROM public.custom_subscription_payments
     WHERE user_id = v_user_id;

    DELETE FROM public.subscription_cancellations
     WHERE user_id = v_user_id;

    DELETE FROM public.subscription_events
     WHERE user_id = v_user_id
       AND event_type IN ('subscription_canceled', 'subscription_deleted', 'charge_refunded', 'pix_not_renewed');

    UPDATE public.profiles
       SET plan = 'free',
           is_custom_subscription = false,
           custom_subscription_id = NULL,
           custom_searches_limit = NULL,
           custom_whatsapp_numbers_limit = NULL,
           custom_feature_permissions = NULL,
           admin_assigned_plan = false,
           payment_provider = NULL,
           subscription_current_period_end = NULL,
           subscription_price_cents = 0
     WHERE id = v_user_id;
  END IF;

  DELETE FROM public.subscription_events
   WHERE lower(COALESCE(email, '')) = lower('andreamoraes05@gmail.com')
     AND event_type IN ('subscription_canceled', 'subscription_deleted', 'charge_refunded', 'pix_not_renewed');
END $$;

COMMIT;

-- Auditoria final: todos os indicadores abaixo devem retornar zero/falso.
SELECT
  p.id AS user_id,
  p.email,
  p.plan,
  p.is_custom_subscription,
  p.subscription_price_cents,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'active' AND cs.monthly_value_cents > 0) AS active_custom_subscriptions,
  COUNT(DISTINCT csp.id) AS custom_payments,
  COUNT(DISTINCT sc.id) AS churn_cancellations,
  COUNT(DISTINCT se.id) FILTER (
    WHERE se.event_type IN ('subscription_canceled', 'subscription_deleted', 'charge_refunded', 'pix_not_renewed')
  ) AS churn_events
FROM public.profiles p
LEFT JOIN public.custom_subscriptions cs ON cs.user_id = p.id
LEFT JOIN public.custom_subscription_payments csp ON csp.user_id = p.id
LEFT JOIN public.subscription_cancellations sc ON sc.user_id = p.id
LEFT JOIN public.subscription_events se ON se.user_id = p.id
WHERE lower(p.email) = lower('andreamoraes05@gmail.com')
GROUP BY p.id, p.email, p.plan, p.is_custom_subscription, p.subscription_price_cents;