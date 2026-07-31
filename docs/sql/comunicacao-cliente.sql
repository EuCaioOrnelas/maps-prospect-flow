-- =====================================================================
-- AUDITORIA DE COMUNICAÇÃO COM O CLIENTE (evidência para chargeback)
-- Troque o e-mail abaixo e rode tudo de uma vez no SQL Editor.
-- Somente leitura.
-- =====================================================================
\set alvo '''andreamoraes05@gmail.com'''

-- 1) E-mails transacionais disparados pela Wiize
--    (boas-vindas, trial, falha de pagamento, renovação, cobrança, etc.)
SELECT created_at            AS disparado_em,
       sent_at               AS entregue_em,
       email_type            AS tipo,
       subject               AS assunto,
       status,
       opened_at, opened_count, clicked_at, clicked_count,
       provider_message_id   AS id_no_provedor,
       error_message
FROM public.email_logs
WHERE lower(to_email) = lower(:alvo)
ORDER BY created_at;

-- 2) Mesma busca por user_id (caso o e-mail de envio tenha sido diferente)
SELECT el.created_at, el.email_type, el.subject, el.status, el.to_email
FROM public.email_logs el
WHERE el.user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower(:alvo))
ORDER BY el.created_at;

-- 3) Tentativas de compra / checkout (intenção de contratação)
SELECT to_jsonb(t) FROM public.checkout_leads t WHERE lower(email) = lower(:alvo);

-- 4) Eventos de assinatura (criação, falha, cobrança, cancelamento)
SELECT to_jsonb(t) FROM public.subscription_events t
WHERE lower(coalesce(t.email,'')) = lower(:alvo)
   OR t.user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower(:alvo));

-- 5) Cobranças PIX emitidas
SELECT to_jsonb(t) FROM public.pix_invoices t WHERE lower(coalesce(t.email,'')) = lower(:alvo);

-- 6) Tickets de suporte + mensagens trocadas
SELECT st.id, st.created_at, st.status, st.category, st.ai_summary
FROM public.support_tickets st
WHERE lower(coalesce(st.email,'')) = lower(:alvo)
   OR st.user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower(:alvo));

SELECT sm.created_at, sm.*
FROM public.support_messages sm
JOIN public.support_tickets st ON st.id = sm.ticket_id
WHERE lower(coalesce(st.email,'')) = lower(:alvo)
   OR st.user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower(:alvo))
ORDER BY sm.created_at;

-- 7) Pedido de cancelamento / motivo declarado
SELECT to_jsonb(t) FROM public.cancellation_feedback t
WHERE lower(coalesce(t.email,'')) = lower(:alvo);
SELECT to_jsonb(t) FROM public.subscription_cancellations t
WHERE t.user_id = (SELECT id FROM public.profiles WHERE lower(email) = lower(:alvo));
