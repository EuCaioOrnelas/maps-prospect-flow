-- =====================================================================
-- LOG DE ATIVIDADE / ACESSO — evidência para contestação Stripe
-- Usuária: andreamoraes05@gmail.com
-- Somente leitura. Trocar o e-mail abaixo para usar em outro caso.
-- =====================================================================

-- ---------------------------------------------------------------
-- BLOCO A — LOG CRONOLÓGICO COMPLETO (exportar em CSV)
-- ---------------------------------------------------------------
WITH u AS (
  SELECT id FROM public.profiles WHERE email = 'andreamoraes05@gmail.com'
)
SELECT * FROM (
  SELECT e.created_at AS data_hora,
         'Evento de produto'          AS categoria,
         e.event_name                 AS acao,
         to_jsonb(e)->>'event_data'   AS detalhe,
         NULL::text                   AS ip
  FROM public.user_events e, u WHERE e.user_id = u.id

  UNION ALL
  SELECT s.created_at, 'Autenticação / auditoria',
         s.action,
         coalesce(s.resource_type,'') || ' ' || coalesce(to_jsonb(s)->>'metadata',''),
         s.ip_address
  FROM public.security_audit_log s, u WHERE s.user_id = u.id

  UNION ALL
  SELECT h.created_at, 'Busca de oportunidades',
         'Busca executada',
         coalesce(h.keyword,'') || ' | ' || coalesce(h.location,'') ||
           ' | resultados: ' || coalesce(h.results_count,0)::text,
         NULL
  FROM public.search_history h, u WHERE h.user_id = u.id

  UNION ALL
  SELECT l.created_at, 'CRM', 'Lead criado',
         coalesce(to_jsonb(l)->>'name', to_jsonb(l)->>'company_name',''), NULL
  FROM public.leads l, u WHERE l.owner_user_id = u.id

  UNION ALL
  SELECT c.created_at, 'Configuração', 'Perfil da empresa preenchido',
         coalesce(to_jsonb(c)->>'company_name',''), NULL
  FROM public.company_profiles c, u WHERE c.user_id = u.id

  UNION ALL
  SELECT o.updated_at, 'Onboarding', 'Onboarding atualizado',
         to_jsonb(o)::text, NULL
  FROM public.user_onboarding o, u WHERE o.user_id = u.id

  UNION ALL
  SELECT m.created_at, 'Suporte', 'Mensagem no chamado (' || coalesce(to_jsonb(m)->>'sender_type','') || ')',
         left(coalesce(to_jsonb(m)->>'message',''), 300), NULL
  FROM public.support_messages m
  JOIN public.support_tickets t ON t.id = m.ticket_id, u
  WHERE t.user_id = u.id
) x
ORDER BY data_hora;

-- ---------------------------------------------------------------
-- BLOCO B — SESSÕES DE USO POR DIA (agrupa eventos com intervalo < 30 min)
-- ---------------------------------------------------------------
WITH u AS (SELECT id FROM public.profiles WHERE email = 'andreamoraes05@gmail.com'),
ev AS (
  SELECT created_at FROM public.user_events e, u WHERE e.user_id = u.id
  UNION ALL SELECT created_at FROM public.security_audit_log s, u WHERE s.user_id = u.id
  UNION ALL SELECT created_at FROM public.search_history h, u WHERE h.user_id = u.id
  UNION ALL SELECT created_at FROM public.leads l, u WHERE l.owner_user_id = u.id
),
mk AS (
  SELECT created_at,
         CASE WHEN created_at - lag(created_at) OVER (ORDER BY created_at) > interval '30 minutes'
              OR lag(created_at) OVER (ORDER BY created_at) IS NULL THEN 1 ELSE 0 END AS novo
  FROM ev
),
grp AS (SELECT created_at, sum(novo) OVER (ORDER BY created_at) AS sessao FROM mk)
SELECT sessao,
       min(created_at) AS inicio,
       max(created_at) AS fim,
       round(extract(epoch FROM (max(created_at) - min(created_at)))/60)::int AS minutos,
       count(*) AS eventos
FROM grp GROUP BY sessao ORDER BY inicio;

-- ---------------------------------------------------------------
-- BLOCO C — RESUMO EXECUTIVO
-- ---------------------------------------------------------------
WITH u AS (SELECT id FROM public.profiles WHERE email = 'andreamoraes05@gmail.com')
SELECT
  (SELECT created_at FROM public.profiles WHERE email='andreamoraes05@gmail.com') AS conta_criada_em,
  (SELECT to_jsonb(p)->>'terms_accepted_at' FROM public.profiles p WHERE p.email='andreamoraes05@gmail.com') AS aceite_termos,
  (SELECT to_jsonb(p)->>'signup_ip' FROM public.profiles p WHERE p.email='andreamoraes05@gmail.com') AS ip_cadastro,
  (SELECT count(*) FROM public.user_events e, u WHERE e.user_id=u.id)            AS total_eventos,
  (SELECT count(*) FROM public.search_history h, u WHERE h.user_id=u.id)         AS buscas_realizadas,
  (SELECT count(*) FROM public.leads l, u WHERE l.owner_user_id=u.id)            AS leads_gerados,
  (SELECT count(DISTINCT date(created_at)) FROM public.user_events e, u WHERE e.user_id=u.id) AS dias_com_acesso,
  (SELECT max(created_at) FROM public.user_events e, u WHERE e.user_id=u.id)     AS ultimo_acesso;
