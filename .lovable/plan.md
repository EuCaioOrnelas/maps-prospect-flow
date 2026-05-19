## Escopo

Implementar gating de acesso para novos usuários no plano Atendimento (start pós-2026-05-18), limites de contatos no CRM por plano, e ajustar pricing/hero para refletir "contatos" no Atendimento e atualizar o Growth.

## 1. Pricing (landing) — `src/components/landing/PricingSection.tsx`

**Card Growth IA (mensal + anual, linhas 94 e 142):**
- `opportunities: "10.000"`, `usageLabel: "Até 10.000 contatos no CRM"`
- Adicionar nas `features` do Growth: `{ text: "Até 3.000 oportunidades qualificadas / mês" }` (após "SDR IA para prospecção...")

**Card Atendimento:** já está como "Até 1.000 contatos no CRM" — sem mudança.

**Tabela comparativa (linha 276):** alterar para uma linha de contatos:
- `{ label: "Contatos totais no CRM", start: "Até 1.000", growth: "Até 10.000", scale: "Ilimitado" }`
- Manter "Volume de oportunidades captadas / mês" como `start: "Não incluso", growth: "3.000", scale: "Sob demanda"`

## 2. Helpers de plano — `src/lib/planAccess.ts`

Adicionar:
- `getContactLimit(profile)` → `1000` para start (novo), `10000` para growth, `Infinity` para scale, legados ficam com `Infinity` (sem regressão).
- `hasOpportunitiesAccess(profile)` → mesma lógica de `hasSDRAccess` (legado = sim, novo start = não).
- `hasAIAgentsAccess(profile)` → idem (novo start = não).

## 3. Feature gating de rotas (novos usuários "start")

Em `src/components/ProtectedRoute.tsx`, após o trial check, adicionar bloco que para **novos** users com plan=start redireciona rotas vetadas para `/upgrade`:

Rotas bloqueadas para novo Atendimento:
- `/prospeccao`, `/oportunidades`, `/reports/prospeccao` (Oportunidades / SDR IA)
- `/agents`, `/agents/reports` (Agentes IA)

Implementação: usar lista `BLOCKED_PATHS_FOR_NEW_START` + checar `profile.plan === 'start' && !isLegacyPlanUser(profile)`.

**Sidebar (`src/components/layout/AppSidebar.tsx`):** ocultar itens "Oportunidades" e "Agentes IA" para novo start (filtro condicional na lista de nav items, usando `hasOpportunitiesAccess` / `hasAIAgentsAccess`).

## 4. Limite de contatos no CRM

**Onde aplica:** ao criar lead manual (`src/components/crm/AddLeadDialog.tsx`) e em qualquer importação (`crm-lead-import` features). Foco inicial no fluxo manual + bloqueio na UI.

Fluxo:
1. Novo hook `useContactLimit()` que retorna `{ limit, count, isAtLimit, loading }`:
   - `limit` vem de `getContactLimit(profile)`
   - `count` = `supabase.from('crm_leads').select('id', { count: 'exact', head: true }).eq('user_id', user.id)`
2. Em `AddLeadDialog`: se `isAtLimit`, desabilitar botão "Salvar" e mostrar alerta com CTA "Fazer upgrade" → navega para `/upgrade`.
3. No header da página CRM (`src/pages/CRM.tsx`), mostrar badge "X / Y contatos" quando limite é finito, com link de upgrade ao chegar perto.

## 5. Hero do dashboard (Atendimento → "contatos")

Em `src/pages/MainDashboard.tsx` (ou componente de hero/KPI principal), quando `!hasOpportunitiesAccess(profile)`:
- Substituir o card/métrica "Oportunidades" por "Contatos no CRM" (com `count` e `limit`).
- Demais users (growth/scale/legado) seguem vendo "Oportunidades".

## Notas técnicas

- Não mexer em business logic de scoring/CRM, apenas gate de criação.
- Não há migration de banco: limites são apenas lidos do `profiles.plan` + `created_at`.
- Mantém grandfathering: usuários antigos no `start` (`isLegacyPlanUser=true`) continuam com acesso total e sem limite.
- Cutoff já existente: `NEW_PLAN_CUTOFF = "2026-05-18T00:00:00Z"`.

## Arquivos a editar

- `src/components/landing/PricingSection.tsx`
- `src/lib/planAccess.ts`
- `src/components/ProtectedRoute.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/crm/AddLeadDialog.tsx`
- `src/pages/CRM.tsx`
- `src/pages/MainDashboard.tsx`
- Novo: `src/hooks/useContactLimit.ts`

Confirma para eu seguir com a implementação?
