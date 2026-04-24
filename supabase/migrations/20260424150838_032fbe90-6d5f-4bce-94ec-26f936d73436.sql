UPDATE public.profiles
SET chat_onboarding_seen = true,
    updated_at = now()
WHERE chat_onboarding_seen IS DISTINCT FROM true;

UPDATE public.user_onboarding
SET user_profile = COALESCE(NULLIF(user_profile, ''), 'skipped'),
    service_types = COALESCE(service_types, ARRAY['skipped']::text[]),
    main_objective = COALESCE(NULLIF(main_objective, ''), 'skipped'),
    team_size = COALESCE(NULLIF(team_size, ''), 'skipped'),
    previous_experience = COALESCE(NULLIF(previous_experience, ''), 'skipped'),
    previous_tool = COALESCE(NULLIF(previous_tool, ''), 'skipped'),
    skipped = true,
    role = COALESCE(NULLIF(role, ''), 'Usuário ativo'),
    sales_team_size = COALESCE(NULLIF(sales_team_size, ''), 'Não informado'),
    biggest_challenge = COALESCE(NULLIF(biggest_challenge, ''), 'Não informado'),
    sales_method = COALESCE(NULLIF(sales_method, ''), 'Não informado'),
    monthly_revenue = COALESCE(NULLIF(monthly_revenue, ''), 'Não informado'),
    goal_90d = COALESCE(NULLIF(goal_90d, ''), 'Não informado'),
    completed_at = COALESCE(completed_at, now())
WHERE user_profile IS NULL
   OR user_profile = ''
   OR service_types IS NULL
   OR main_objective IS NULL
   OR main_objective = ''
   OR team_size IS NULL
   OR team_size = ''
   OR previous_experience IS NULL
   OR previous_experience = ''
   OR previous_tool IS NULL
   OR previous_tool = ''
   OR skipped IS DISTINCT FROM true
   OR role IS NULL
   OR role = ''
   OR sales_team_size IS NULL
   OR sales_team_size = ''
   OR biggest_challenge IS NULL
   OR biggest_challenge = ''
   OR sales_method IS NULL
   OR sales_method = ''
   OR monthly_revenue IS NULL
   OR monthly_revenue = ''
   OR goal_90d IS NULL
   OR goal_90d = ''
   OR completed_at IS NULL;

INSERT INTO public.user_onboarding (
  user_id,
  user_profile,
  service_types,
  main_objective,
  team_size,
  previous_experience,
  previous_tool,
  skipped,
  role,
  sales_team_size,
  biggest_challenge,
  sales_method,
  monthly_revenue,
  goal_90d,
  completed_at
)
SELECT p.id,
       'skipped',
       ARRAY['skipped']::text[],
       'skipped',
       'skipped',
       'skipped',
       'skipped',
       true,
       'Usuário ativo',
       'Não informado',
       'Não informado',
       'Não informado',
       'Não informado',
       'Não informado',
       now()
FROM public.profiles p
LEFT JOIN public.user_onboarding u ON u.user_id = p.id
WHERE u.user_id IS NULL;

INSERT INTO public.company_profiles (
  user_id,
  company_name,
  attendant_name,
  company_niche,
  company_differential,
  company_objective,
  company_products,
  company_target_audience
)
SELECT p.id,
       'Empresa',
       'Atendente',
       'Não informado',
       'Não informado',
       'Não informado',
       'Não informado',
       'Não informado'
FROM public.profiles p
LEFT JOIN public.company_profiles cp ON cp.user_id = p.id
WHERE cp.user_id IS NULL;