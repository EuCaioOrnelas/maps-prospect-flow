-- Recria o trigger que faltava para criar o perfil automaticamente quando um novo usuário se cadastra
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Cria perfis retroativos para usuários existentes em auth.users que não têm registro em public.profiles
INSERT INTO public.profiles (id, email, name, plan, searches_limit, searches_used, trial_start_at, trial_end_at)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', u.email),
  'free',
  120,
  0,
  COALESCE(u.created_at, now()),
  COALESCE(u.created_at, now()) + interval '7 days'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;