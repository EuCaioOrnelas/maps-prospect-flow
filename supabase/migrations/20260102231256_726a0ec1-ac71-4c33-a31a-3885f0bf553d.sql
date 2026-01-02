-- 1. Remover a política pública problemática da tabela shared_reports
DROP POLICY IF EXISTS "Public can view shared reports for password check" ON public.shared_reports;

-- 2. Criar política para que a edge function com service role possa acessar os relatórios
-- (Não é necessário criar política pública, pois a edge function usa service role key)

-- 3. Adicionar política explícita que nega acesso público à tabela profiles
-- As políticas existentes já são RESTRICTIVE (Permissive: No), então apenas usuários
-- autenticados com as condições certas podem acessar. Mas vamos garantir que não há acesso anônimo.

-- Verificar e garantir que RLS está habilitado (já deve estar)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_reports ENABLE ROW LEVEL SECURITY;