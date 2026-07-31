-- =====================================================================
-- AUDITORIA DE COMUNICAÇÃO COM O CLIENTE (evidência para chargeback)
-- Somente leitura. Copie e cole inteiro no SQL Editor.
-- Para outro cliente: substitua 'andreamoraes05@gmail.com' em todo o script.
-- =====================================================================

-- 1) E-mails transacionais disparados pela Wiize
--    (boas-vindas, trial, falha de pagamento, renovação, cobrança, etc.)
SELECT 'email_logs' AS bloco,
       created_at            AS disparado_em,
       sent_at               AS entregue_em,
       email_type::text      AS tipo,
       subject               AS assunto,
       status::text          AS status,
       opened_at, opened_count, clicked_at, clicked_count,
       provider_message_id   AS id_no_provedor,
       error_message
FROM public.email_logs
WHERE lower(to_email) = 'andreamoraes05@gmail.com'
   OR user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'andreamoraes05@gmail.com')
ORDER BY created_at;

-- 2) Tentativas de compra / checkout (intenção de contratação)
SELECT to_jsonb(t) AS checkout_leads
FROM public.checkout_leads t
WHERE lower(t.email) = 'andreamoraes05@gmail.com';

-- 3) Eventos de assinatura (criação, falha, cobrança, cancelamento)
SELECT to_jsonb(t) AS subscription_events
FROM public.subscription_events t
WHERE t.user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'andreamoraes05@gmail.com');

-- 4) Cobranças PIX emitidas
SELECT to_jsonb(t) AS pix_invoices
FROM public.pix_invoices t
WHERE lower(coalesce(t.email, '')) = 'andreamoraes05@gmail.com';

-- 5) Tickets de suporte abertos pelo cliente
SELECT st.id, st.created_at, st.status, st.category, st.ai_summary
FROM public.support_tickets st
WHERE lower(coalesce(st.email, '')) = 'andreamoraes05@gmail.com'
   OR st.user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'andreamoraes05@gmail.com')
ORDER BY st.created_at;

-- 6) Mensagens trocadas nesses tickets
SELECT sm.*
FROM public.support_messages sm
WHERE sm.ticket_id IN (
  SELECT st.id FROM public.support_tickets st
  WHERE lower(coalesce(st.email, '')) = 'andreamoraes05@gmail.com'
     OR st.user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'andreamoraes05@gmail.com')
)
ORDER BY sm.created_at;

-- 7) Pedido de cancelamento / motivo declarado
SELECT to_jsonb(t) AS cancellation_feedback
FROM public.cancellation_feedback t
WHERE lower(coalesce(t.email, '')) = 'andreamoraes05@gmail.com';

SELECT to_jsonb(t) AS subscription_cancellations
FROM public.subscription_cancellations t
WHERE t.user_id = (SELECT id FROM public.profiles WHERE lower(email) = 'andreamoraes05@gmail.com');

-- 8) RESUMO CONSOLIDADO (o número que interessa para a contestação)
SELECT
  (SELECT count(*) FROM public.email_logs
     WHERE lower(to_email) = 'andreamoraes05@gmail.com')                       AS emails_enviados,
  (SELECT count(*) FROM public.support_tickets st
     WHERE lower(coalesce(st.email,'')) = 'andreamoraes05@gmail.com'
        OR st.user_id = (SELECT id FROM public.profiles
                          WHERE lower(email) = 'andreamoraes05@gmail.com'))    AS tickets_abertos,
  (SELECT count(*) FROM public.cancellation_feedback
     WHERE lower(coalesce(email,'')) = 'andreamoraes05@gmail.com')             AS pedidos_cancelamento,
  (SELECT count(*) FROM public.subscription_cancellations
     WHERE user_id = (SELECT id FROM public.profiles
                       WHERE lower(email) = 'andreamoraes05@gmail.com'))       AS cancelamentos_registrados;
