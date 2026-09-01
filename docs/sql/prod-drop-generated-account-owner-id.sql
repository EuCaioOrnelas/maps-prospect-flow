-- =====================================================================
-- WIIZE • FIX: remove coluna gerada account_owner_id do banco externo
-- =====================================================================
-- Problema: a tabela public.account_members ainda possui a coluna
-- account_owner_id como GENERATED ALWAYS, mas o schema atual do projeto
-- usa apenas owner_user_id. Essa coluna gerada conflita com funções e
-- policies que esperam owner_user_id.
--
-- 100% idempotente — pode rodar várias vezes sem erro.
-- =====================================================================

DO $$
BEGIN
  -- Só remove se a coluna existir E for gerada. Colunas normais com dados
  -- reais NÃO são tocadas por segurança.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'account_members'
      AND column_name = 'account_owner_id'
      AND is_generated = 'ALWAYS'
  ) THEN
    ALTER TABLE public.account_members
      DROP COLUMN IF EXISTS account_owner_id;
  END IF;
END $$;

-- Garante que as funções auxiliares apontam para a coluna correta.
CREATE OR REPLACE FUNCTION public.current_account_owner()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT owner_user_id
  FROM public.account_members
  WHERE user_id = auth.uid()
    AND status = 'active'
  LIMIT 1;
$function$;

CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT COALESCE(
    (SELECT role::text
     FROM public.account_members
     WHERE user_id = auth.uid()
       AND status = 'active'
     LIMIT 1),
    'owner'
  );
$function$;

GRANT EXECUTE ON FUNCTION public.current_account_owner() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_account_role() TO authenticated, service_role;

-- Conferência final.
SELECT
  column_name,
  data_type,
  is_generated
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'account_members'
ORDER BY ordinal_position;
