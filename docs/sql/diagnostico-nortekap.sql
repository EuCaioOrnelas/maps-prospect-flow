-- Diagnóstico do cliente Nortekap (somente leitura, não altera nada)
-- Rode cada bloco separadamente no editor SQL da produção.

-- BLOCO 1: Login existe?
SELECT id, email, created_at, email_confirmed_at, last_sign_in_at
FROM auth.users
WHERE lower(email) = 'nortetapetespersonalizados@gmail.com';

-- BLOCO 2: Perfil completo (todos os campos, inclusive trial e pagamento)
SELECT to_jsonb(p) AS perfil
FROM public.profiles p
WHERE lower(p.email) = 'nortetapetespersonalizados@gmail.com'
   OR p.id IN (SELECT id FROM auth.users WHERE lower(email) = 'nortetapetespersonalizados@gmail.com');

-- BLOCO 3: Cobranças PIX geradas (se pagou ou não)
SELECT to_jsonb(i) AS cobranca_pix
FROM public.pix_invoices i
WHERE i.user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'nortetapetespersonalizados@gmail.com')
ORDER BY i.created_at DESC;

-- BLOCO 4: Histórico de eventos da assinatura
SELECT to_jsonb(e) AS evento
FROM public.subscription_events e
WHERE e.user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'nortetapetespersonalizados@gmail.com')
ORDER BY e.created_at DESC;

-- BLOCO 5: Contrato customizado (manual pelo admin)?
SELECT to_jsonb(c) AS contrato
FROM public.custom_subscriptions c
WHERE c.user_id IN (SELECT id FROM auth.users WHERE lower(email) = 'nortetapetespersonalizados@gmail.com');
