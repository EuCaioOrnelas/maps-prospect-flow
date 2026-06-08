---
name: Sub-user account inheritance
description: Sub-usuários (profiles.parent_owner_id) compartilham 100% dos dados, plano e cobrança do owner
type: feature
---

Quando `profiles.parent_owner_id IS NOT NULL`, o usuário é um sub-usuário da conta do owner. Comportamento esperado:

**Cobrança/plano (AuthContext.fetchProfile)**: o profile do sub-user herda do owner: `plan`, `is_blocked`, `trial_*`, `subscription_*`, `features`, `plan_features`, `custom_features`, `billing_cycle`, `stripe_customer_id`, `asaas_customer_id`. Resultado: sub-user nunca cai em "trial expired" se o owner está em dia.

**Dados compartilhados**: queries de CRM, Oportunidades, Chat, Números, Agentes filtram por `owner_user_id = accountOwnerId` (não por `user_id`). `accountOwnerId = profile.parent_owner_id ?? user.id` exposto via `useAuth()`.

**RLS**: tabelas com `owner_user_id` usam `is_account_member(owner_user_id)` que internamente compara `get_account_owner(auth.uid())`. Triggers `set_owner_user_id_from_user` derivam owner_user_id automaticamente no INSERT.

**Sidebar**: gateado por `roleHasPermission(accountRole, perm)` — operacional não vê Dashboard, Meta, Upgrade, Usuários.

**Onboarding/guia**: pulados para sub-users (useOnboardingModals + useGuidedTour).

**CRM responsible filter**: sempre visível, default "all" para sub-users também conseguirem filtrar leads de outros membros.
