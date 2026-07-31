-- =====================================================================
-- AUDITORIA DE COMUNICAÇÃO COM O CLIENTE (evidência para chargeback)
-- Somente leitura. Copie e cole inteiro no SQL Editor.
-- Versão à prova de diferenças de schema: não referencia colunas
-- opcionais diretamente (usa to_jsonb), então roda em qualquer ambiente.
-- Para outro cliente: substitua 'andreamoraes05@gmail.com' em todo o script.
-- =====================================================================

-- 1) E-mails transacionais disparados pela Wiize
SELECT j->>'created_at'          AS disparado_em,
       j->>'sent_at'             AS entregue_em,
       j->>'email_type'          AS tipo,
       j->>'subject'             AS assunto,        -- nulo se a coluna não existir
       j->>'status'              AS status,
       j->>'opened_at'           AS aberto_em,
       j->>'clicked_at'          AS clicado_em,
       j->>'provider_message_id' AS id_no_provedor,
       j->>'error_message'       AS erro
FROM (SELECT to_jsonb(t) AS j FROM public.email_logs t) s
WHERE lower(j->>'to_email') = 'andreamoraes05@gmail.com'
   OR j->>'user_id' = (SELECT id::text FROM public.profiles
                        WHERE lower(email) = 'andreamoraes05@gmail.com')
ORDER BY 1;

-- 2) Tentativas de compra / checkout (intenção de contratação)
SELECT j AS checkout_leads
FROM (SELECT to_jsonb(t) AS j FROM public.checkout_leads t) s
WHERE lower(coalesce(j->>'email','')) = 'andreamoraes05@gmail.com';

-- 3) Eventos de assinatura (criação, falha, cobrança, cancelamento)
SELECT j AS subscription_events
FROM (SELECT to_jsonb(t) AS j FROM public.subscription_events t) s
WHERE j->>'user_id' = (SELECT id::text FROM public.profiles
                        WHERE lower(email) = 'andreamoraes05@gmail.com');

-- 4) Cobranças PIX emitidas
SELECT j AS pix_invoices
FROM (SELECT to_jsonb(t) AS j FROM public.pix_invoices t) s
WHERE lower(coalesce(j->>'email','')) = 'andreamoraes05@gmail.com';

-- 5) Tickets de suporte abertos pelo cliente
SELECT j AS support_tickets
FROM (SELECT to_jsonb(t) AS j FROM public.support_tickets t) s
WHERE lower(coalesce(j->>'email','')) = 'andreamoraes05@gmail.com'
   OR j->>'user_id' = (SELECT id::text FROM public.profiles
                        WHERE lower(email) = 'andreamoraes05@gmail.com');

-- 6) Mensagens trocadas nesses tickets
SELECT j AS support_messages
FROM (SELECT to_jsonb(t) AS j FROM public.support_messages t) s
WHERE j->>'ticket_id' IN (
  SELECT st.id::text FROM public.support_tickets st
  WHERE lower(coalesce(to_jsonb(st)->>'email','')) = 'andreamoraes05@gmail.com'
     OR st.user_id = (SELECT id FROM public.profiles
                       WHERE lower(email) = 'andreamoraes05@gmail.com')
);

-- 7) Pedido de cancelamento / motivo declarado
SELECT j AS cancellation_feedback
FROM (SELECT to_jsonb(t) AS j FROM public.cancellation_feedback t) s
WHERE lower(coalesce(j->>'email','')) = 'andreamoraes05@gmail.com';

SELECT j AS subscription_cancellations
FROM (SELECT to_jsonb(t) AS j FROM public.subscription_cancellations t) s
WHERE j->>'user_id' = (SELECT id::text FROM public.profiles
                        WHERE lower(email) = 'andreamoraes05@gmail.com');

-- 8) RESUMO CONSOLIDADO (o número que interessa para a contestação)
WITH alvo AS (
  SELECT id::text AS uid FROM public.profiles
  WHERE lower(email) = 'andreamoraes05@gmail.com'
)
SELECT
  (SELECT count(*) FROM (SELECT to_jsonb(t) j FROM public.email_logs t) x
     WHERE lower(x.j->>'to_email') = 'andreamoraes05@gmail.com')          AS emails_enviados,
  (SELECT count(*) FROM (SELECT to_jsonb(t) j FROM public.support_tickets t) x
     WHERE lower(coalesce(x.j->>'email','')) = 'andreamoraes05@gmail.com'
        OR x.j->>'user_id' = (SELECT uid FROM alvo))                      AS tickets_abertos,
  (SELECT count(*) FROM (SELECT to_jsonb(t) j FROM public.cancellation_feedback t) x
     WHERE lower(coalesce(x.j->>'email','')) = 'andreamoraes05@gmail.com') AS pedidos_cancelamento,
  (SELECT count(*) FROM (SELECT to_jsonb(t) j FROM public.subscription_cancellations t) x
     WHERE x.j->>'user_id' = (SELECT uid FROM alvo))                      AS cancelamentos_registrados;
