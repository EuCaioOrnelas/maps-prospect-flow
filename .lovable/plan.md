
# Correção completa: sub-usuário = segundo login da conta do owner

Hoje o sub-usuário entra com a própria `auth.uid()` mas todas as queries/RLS filtram por `user_id = auth.uid()`. Resultado: ele não enxerga oportunidades, contatos, números, agentes, CRM, etc. do owner. A correção precisa atuar em **3 camadas** ao mesmo tempo.

## 1. Banco — owner efetivo + RLS compartilhada

Criar função SQL central:

```text
public.account_owner_id(_uid) := COALESCE(profiles.parent_owner_id, _uid)
```

Adicionar policies (`USING` e `WITH CHECK`) em todas as tabelas "donas de dado" para que **qualquer usuário cujo owner efetivo bata com o owner efetivo da linha** veja/edite os dados:

- `leads`, `lead_notes`, `lead_files`, `lead_activities`, `lead_deals`, `lead_deal_attachments`
- `pipeline_stages`, `crm_tags`, `lead_origins`, `ignored_contacts`
- `chat_conversations`, `chat_messages`
- `whatsapp_numbers`, `user_waba_connections`, `whatsapp_campaigns`, `meta_campaigns`
- `ai_agents`, `agent_conversations`, `agent_templates`, `user_ai_agents`, `user_ai_credentials`
- `revenue_leads`, `revenue_settings`, `revenue_score_*`, `company_profiles`, `company_services`
- `warming_sessions`, `warming_interactions`, `warming_search_assignments`
- `wa_automation_flows`, `wa_flow_*`, `email_flow*`
- `user_google_tokens`, `user_drive_connections`, `meta_user_settings`
- `search_history`, `user_onboarding` (não compartilha), `knowledge_base`

INSERTs do sub-usuário continuam gravando `user_id = auth.uid()` (para auditoria de quem criou), mas a leitura é compartilhada via owner efetivo.

## 2. Frontend — `effectiveUserId` em todas as queries

- Expor `accountOwnerId` no `AuthContext` (já calculado: `profile.parent_owner_id ?? user.id`).
- Criar helper `useAccountOwnerId()` e substituir **todos** `.eq('user_id', user.id)` em queries de dados compartilhados (leads, oportunidades, números, agentes, fluxos, campanhas, chat, CRM) por `.eq('user_id', accountOwnerId)` **OU** remover o filtro quando RLS já garante (preferido — menos código).
- Listas (oportunidades, CRM, chat, números) passam a mostrar dados do owner automaticamente.

## 3. Sidebar + filtros + UX

**Sidebar** (`AppSidebar.tsx`): gatear cada item via `roleHasPermission(accountRole, ...)` — operacional só vê Prospecção, CRM, Atendimento, Fluxos, Agentes, Aquecimento, Integrações. Esconder Dashboard, Meta, Faturamento, Assinaturas, Usuários, Configurações para operacional.

**CRM — filtro "Responsável"**: adicionar select no topo do Kanban/lista listando todos os membros da conta (owner + sub-usuários via `account_members` / `profiles` com mesmo `account_owner_id`). Filtro aplica `.eq('assigned_to', selectedUserId)` ou "todos".
- Cards do CRM passam a exibir avatar + nome do responsável.
- Adicionar coluna `assigned_to uuid` em `leads` se ainda não existir (default = `user_id`).

## Ordem de execução

```text
1. Migration: account_owner_id() + assigned_to em leads + RLS nova em todas as tabelas
2. AuthContext: expor accountOwnerId
3. Refactor de queries (~30-40 arquivos)
4. Sidebar: gating por role
5. CRM: filtro Responsável + avatar nos cards
6. Smoke test: logar como sub-usuário e validar paridade com owner
```

## Riscos / decisões abertas

- **Operacional consegue editar dados do owner?** Pela sua descrição ("é o mesmo perfil"), sim — sem distinção de escrita. Confirme se quer alguma restrição (ex.: operacional não deleta números/campanhas).
- **Faturamento**: operacional não vê nem o link de assinatura no sidebar (já bloqueado por permissão).
- **Onboarding/guia**: já está pulado para sub-usuários (feito antes).

## Confirmação

Esse plano toca ~40 arquivos + 1 migration grande de RLS. Confirma que posso prosseguir com **todas** as 3 camadas de uma vez, ou prefere começar só por **(1) banco + (2) frontend de Oportunidades/CRM/Números** e depois fazer o resto?
