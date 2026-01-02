-- 1. Garantir que apenas admins podem ver e gerenciar roles (reforçar políticas existentes)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Criar política restritiva para INSERT - NINGUÉM pode inserir roles via client
CREATE POLICY "No public insert on roles" 
ON public.user_roles 
FOR INSERT 
TO authenticated
WITH CHECK (false);

-- Apenas admins podem ver todas as roles
CREATE POLICY "Admins can view all roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Usuários podem ver apenas suas próprias roles (para verificação de permissão)
CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Apenas admins podem atualizar roles
CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Apenas admins podem deletar roles
CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Criar função segura para verificar se usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role = 'admin'::app_role
  )
$$;

-- 3. Adicionar coluna is_blocked para poder bloquear usuários suspeitos
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false;

-- 4. Criar função para verificar se usuário está bloqueado
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_blocked FROM public.profiles WHERE id = p_user_id),
    false
  )
$$;

-- 5. Atualizar política de profiles para impedir acesso de usuários bloqueados
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = id AND NOT COALESCE(is_blocked, false));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = id AND NOT COALESCE(is_blocked, false));

-- 6. Criar trigger para impedir que usuários alterem campos sensíveis
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é admin
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    -- Impedir alteração de campos sensíveis
    IF NEW.plan IS DISTINCT FROM OLD.plan THEN
      RAISE EXCEPTION 'Não é permitido alterar o plano diretamente';
    END IF;
    
    IF NEW.searches_limit IS DISTINCT FROM OLD.searches_limit THEN
      RAISE EXCEPTION 'Não é permitido alterar o limite de buscas';
    END IF;
    
    IF NEW.is_blocked IS DISTINCT FROM OLD.is_blocked THEN
      RAISE EXCEPTION 'Não é permitido alterar o status de bloqueio';
    END IF;
    
    -- Impedir alteração de campos de fraude
    IF NEW.fraud_flags IS DISTINCT FROM OLD.fraud_flags THEN
      RAISE EXCEPTION 'Não é permitido alterar flags de fraude';
    END IF;
    
    IF NEW.device_fingerprint IS DISTINCT FROM OLD.device_fingerprint THEN
      RAISE EXCEPTION 'Não é permitido alterar fingerprint do dispositivo';
    END IF;
    
    IF NEW.signup_ip IS DISTINCT FROM OLD.signup_ip THEN
      RAISE EXCEPTION 'Não é permitido alterar IP de cadastro';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remover trigger se existir e recriar
DROP TRIGGER IF EXISTS protect_profile_fields ON public.profiles;
CREATE TRIGGER protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_fields();

-- 7. Garantir que anon users não podem acessar nada
REVOKE ALL ON public.user_roles FROM anon;
REVOKE ALL ON public.profiles FROM anon;