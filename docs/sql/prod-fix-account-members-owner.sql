-- =====================================================================
-- WIIZE • FIX: column account_members.account_owner_id does not exist
-- Banco externo / produção — 100% idempotente, pode rodar várias vezes.
-- Causa: objetos antigos (funções/policies) referenciam "account_owner_id",
-- mas a tabela public.account_members usa "owner_user_id".
-- =====================================================================

-- 1) DIAGNÓSTICO (rode primeiro e veja quem ainda referencia o nome antigo)
SELECT 'function' AS tipo, n.nspname || '.' || p.proname AS objeto
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%account_owner_id%'
  AND pg_get_functiondef(p.oid) ILIKE '%account_members%'
UNION ALL
SELECT 'policy', schemaname || '.' || tablename || ' :: ' || policyname
FROM pg_policies
WHERE (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%account_members%'
  AND (COALESCE(qual, '') || COALESCE(with_check, '')) ILIKE '%account_owner_id%'
UNION ALL
SELECT 'view', schemaname || '.' || viewname
FROM pg_views
WHERE definition ILIKE '%account_members%' AND definition ILIKE '%account_owner_id%';

-- 2) COMPAT SHIM: cria account_owner_id espelhando owner_user_id
--    (resolve imediatamente qualquer objeto legado que ainda use o nome antigo)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'account_members'
       AND column_name = 'owner_user_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'account_members'
       AND column_name = 'account_owner_id'
  ) THEN
    ALTER TABLE public.account_members
      ADD COLUMN account_owner_id uuid
      GENERATED ALWAYS AS (owner_user_id) STORED;
  END IF;
END $$;

-- 3) RECRIA OS HELPERS COM O NOME CORRETO DA COLUNA
CREATE OR REPLACE FUNCTION public.accessible_owner_ids()
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(array_agg(DISTINCT oid), ARRAY[]::uuid[])
  FROM (
    SELECT auth.uid() AS oid WHERE auth.uid() IS NOT NULL
    UNION
    SELECT p.parent_owner_id
      FROM public.profiles p
     WHERE p.id = auth.uid() AND p.parent_owner_id IS NOT NULL
    UNION
    SELECT am.owner_user_id
      FROM public.account_members am
     WHERE am.user_id = auth.uid() AND am.status = 'active'
  ) s
  WHERE oid IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.current_account_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((SELECT account_role::text FROM public.profiles WHERE id = auth.uid()), 'owner');
$function$;

-- 4) GRANTS (Data API) — idempotentes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.account_members TO authenticated;
GRANT ALL ON public.account_members TO service_role;

-- 5) CONFERÊNCIA FINAL
SELECT column_name FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'account_members'
 ORDER BY ordinal_position;
