-- ============================================================
-- PROVA DE ACEITE CONTRATUAL — Andrea (DEDA CONSTANTINO)
-- user_id: 77b33b64-b24a-4a5c-9894-5c1798cb0ee8
-- e-mail:  andreamoraes05@gmail.com
-- Somente leitura. Rode bloco por bloco no SQL Editor de produção.
-- ============================================================

-- 1) ACEITE DE TERMOS + IDENTIFICAÇÃO (linha única, à prova de coluna faltante)
SELECT
  u.id                                              AS user_id,
  u.email,
  u.raw_user_meta_data ->> 'full_name'              AS nome_informado,
  u.raw_user_meta_data ->> 'iss'                    AS provedor_login,
  (u.raw_user_meta_data ->> 'email_verified')::text AS email_verificado,
  u.created_at                                      AS conta_criada_em,
  u.last_sign_in_at                                 AS ultimo_acesso,
  u.confirmed_at                                    AS email_confirmado_em,
  to_jsonb(p) ->> 'terms_accepted_at'               AS termos_aceitos_em,
  to_jsonb(p) ->> 'signup_ip'                       AS ip_do_cadastro,
  to_jsonb(p) ->> 'plan'                            AS plano,
  to_jsonb(p) ->> 'subscription_status'             AS status_assinatura,
  to_jsonb(p) ->> 'subscription_price_cents'        AS preco_centavos,
  to_jsonb(p) ->> 'trial_will_charge_at'            AS trial_cobranca_em,
  to_jsonb(p) ->> 'payment_provider'                AS provedor_pagamento
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'andreamoraes05@gmail.com';


-- 2) CHECKOUT: intenção de compra manifestada pela própria titular
SELECT jsonb_pretty(to_jsonb(c))
FROM public.checkout_leads c
WHERE c.email ILIKE '%andreamoraes05%'
ORDER BY c.created_at;


-- 3) EVENTOS DE ASSINATURA (tentativas, aprovação, cancelamento)
SELECT
  e.created_at, e.event_type, e.event_source,
  e.previous_plan, e.new_plan, jsonb_pretty(e.metadata) AS detalhes
FROM public.subscription_events e
WHERE e.email ILIKE '%andreamoraes05%'
   OR e.user_id = '77b33b64-b24a-4a5c-9894-5c1798cb0ee8'
ORDER BY e.created_at;


-- 4) FATURAS / PAGAMENTOS (PIX e contratos custom)
SELECT 'pix_invoices' AS origem, jsonb_pretty(to_jsonb(i)) AS registro
FROM public.pix_invoices i
WHERE to_jsonb(i)::text ILIKE '%andreamoraes05%'
UNION ALL
SELECT 'custom_subscription_payments', jsonb_pretty(to_jsonb(cp))
FROM public.custom_subscription_payments cp
WHERE to_jsonb(cp)::text ILIKE '%andreamoraes05%';


-- 5) E-MAILS TRANSACIONAIS ENTREGUES (prova de comunicação recebida)
--    À prova de schema: não referencia colunas específicas.
SELECT
  (to_jsonb(l) ->> 'created_at')::timestamptz AS enviado_em,
  COALESCE(to_jsonb(l) ->> 'email_type', to_jsonb(l) ->> 'template_name', to_jsonb(l) ->> 'type') AS tipo,
  to_jsonb(l) ->> 'status'  AS status,
  COALESCE(to_jsonb(l) ->> 'subject', to_jsonb(l) ->> 'assunto', to_jsonb(l) ->> 'title') AS assunto,
  jsonb_pretty(to_jsonb(l)) AS registro_completo
FROM public.email_logs l
WHERE to_jsonb(l)::text ILIKE '%andreamoraes05%'
ORDER BY 1;


-- 6) CANCELAMENTO / MOTIVO DECLARADO (ou ausência dele)
SELECT 'subscription_cancellations' AS origem, jsonb_pretty(to_jsonb(sc))
FROM public.subscription_cancellations sc
WHERE to_jsonb(sc)::text ILIKE '%andreamoraes05%'
UNION ALL
SELECT 'cancellation_feedback', jsonb_pretty(to_jsonb(cf))
FROM public.cancellation_feedback cf
WHERE to_jsonb(cf)::text ILIKE '%andreamoraes05%';


-- 7) RESUMO EXECUTIVO PARA O PDF (uma linha só — é essa que você me manda)
SELECT
  u.email,
  u.raw_user_meta_data ->> 'full_name'   AS titular,
  u.created_at                           AS cadastro,
  to_jsonb(p) ->> 'terms_accepted_at'    AS aceite_termos,
  to_jsonb(p) ->> 'signup_ip'            AS ip,
  u.last_sign_in_at                      AS ultimo_acesso,
  (SELECT min(created_at) FROM public.checkout_leads WHERE email ILIKE '%andreamoraes05%')      AS primeira_intencao_compra,
  (SELECT count(*) FROM public.subscription_events WHERE email ILIKE '%andreamoraes05%')        AS eventos_assinatura,
  (SELECT count(*) FROM public.email_logs WHERE to_jsonb(email_logs)::text ILIKE '%andreamoraes05%') AS emails_recebidos
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'andreamoraes05@gmail.com';
