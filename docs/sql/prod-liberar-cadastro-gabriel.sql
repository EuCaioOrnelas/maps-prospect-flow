-- =====================================================================
-- Liberar cadastro de gabrielmrcolaco12@gmail.com (rodar no banco de PRODUÇÃO)
-- Rode o bloco 1, veja o resultado; depois rode o bloco 2.
-- =====================================================================

-- BLOCO 1 — DIAGNÓSTICO (só leitura)
SELECT 'login (auth.users)' AS onde, u.id::text, u.email, u.created_at::text AS criado,
       (u.banned_until IS NOT NULL)::text AS bloqueado
FROM auth.users u WHERE lower(u.email) = 'gabrielmrcolaco12@gmail.com'
UNION ALL
SELECT 'perfil (profiles)', p.id::text, p.email, p.created_at::text, p.plan
FROM public.profiles p WHERE lower(p.email) = 'gabrielmrcolaco12@gmail.com'
UNION ALL
SELECT 'contrato (custom_subscriptions)', c.id::text, c.user_id::text, c.created_at::text, c.status
FROM public.custom_subscriptions c
JOIN auth.users u ON u.id = c.user_id
WHERE lower(u.email) = 'gabrielmrcolaco12@gmail.com';

-- BLOCO 2 — LIMPEZA TOTAL (apaga o login "pela metade" e restos ligados a ele)
DO $$
DECLARE v_id uuid;
BEGIN
  FOR v_id IN SELECT id FROM auth.users WHERE lower(email) = 'gabrielmrcolaco12@gmail.com' LOOP
    DELETE FROM public.custom_subscription_payments WHERE user_id = v_id;
    DELETE FROM public.custom_subscriptions        WHERE user_id = v_id;
    DELETE FROM public.profiles                    WHERE id = v_id;
    DELETE FROM auth.identities                    WHERE user_id = v_id;
    DELETE FROM auth.sessions                      WHERE user_id = v_id;
    DELETE FROM auth.users                         WHERE id = v_id;
  END LOOP;
  -- perfil solto sem login
  DELETE FROM public.profiles WHERE lower(email) = 'gabrielmrcolaco12@gmail.com'
    AND id NOT IN (SELECT id FROM auth.users);
END $$;

-- BLOCO 3 — TESTE: o cadastro de login funciona? (cria e apaga na hora, sem deixar nada)
-- Se der erro aqui, copie a mensagem e me envie: ela mostra exatamente a regra que trava.
DO $$
DECLARE v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                          email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
  VALUES (v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
          'teste-cadastro-' || substr(v_id::text,1,8) || '@wiize.test', '', now(),
          '{"name":"Teste","created_by_admin":true}'::jsonb, '{"provider":"email","providers":["email"]}'::jsonb, now(), now());
  DELETE FROM public.profiles WHERE id = v_id;
  DELETE FROM auth.users WHERE id = v_id;
  RAISE NOTICE 'OK: cadastro de login funciona normalmente';
END $$;
