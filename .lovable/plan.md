# Sistema de Usuários e Permissões — Wiize

Implementação de multiusuários por conta (Owner + Sub Usuários) com cargos, permissões granulares, proteção de rotas, primeiro login obrigatório, convite por email e auditoria.

## 1. Modelo de dados (Lovable Cloud / Supabase)

Em vez de criar uma tabela `users` paralela (que conflitaria com `auth.users`), o padrão correto é trabalhar sobre `profiles` + uma tabela de membership.

**Migração:**
- Enum `account_role`: `owner | admin | operational`
- Enum `account_member_status`: `active | inactive`
- Tabela `account_members`:
  - `id`, `owner_user_id` (UUID — id do Owner / "conta"), `user_id` (UUID, FK lógica para auth.users), `role`, `status`, `must_change_password`, `created_by`, `created_at`, `updated_at`, `last_login_at`
  - Único: (`owner_user_id`, `user_id`)
- Adicionar em `profiles`: `parent_owner_id UUID NULL` (aponta para o owner da conta — null = é o próprio owner) e `account_role account_role` (espelhado p/ leitura rápida)
- Tabela `account_audit_log`: `id, owner_user_id, actor_user_id, action, target_user_id, metadata jsonb, created_at`
- RPCs SECURITY DEFINER:
  - `get_account_owner(_user_id uuid) returns uuid` — retorna o owner da conta (próprio id se for owner, senão `parent_owner_id`)
  - `get_account_role(_user_id uuid) returns account_role`
  - `count_account_members(_owner uuid) returns int`
  - `create_account_member(...)` — valida limite por plano, cria auth user via edge function (não dá pra criar do SQL), aqui só registra membership
  - `update_account_member_role / status / reset_password_flag`
- GRANTs corretos + RLS:
  - `account_members`: SELECT permitido se `get_account_owner(auth.uid()) = owner_user_id` (todos da conta veem); INSERT/UPDATE/DELETE só Owner/Admin via has_role check
  - `account_audit_log`: SELECT só Owner/Admin da conta

## 2. Limites por plano
Centralizado em `src/lib/planAccess.ts`:
- `getUserSeatLimit(profile)`:
  - `start` (Atendimento) → 3 (1 owner + 2 sub)
  - `growth` → 6 (1 + 5)
  - `scale`/legados → Infinity
- Validação no front (UI bloqueia botão) **e** no edge function (server-side hard limit).

## 3. Edge Functions
- `account-create-member`: cria usuário em `auth.users` via service role, insere `profiles` (com `parent_owner_id` = owner), insere `account_members`, envia email via Resend (secret `RESEND_API_KEY` já existente — verificar). Valida limite, valida que caller é Owner/Admin.
- `account-reset-member-password`: gera senha temporária, atualiza via Admin API, marca `must_change_password=true`, envia email.
- `account-update-member`: editar nome/cargo/status (Owner não pode ser desativado/removido).

## 4. Frontend

**Permissões (`src/lib/accountPermissions.ts`):**
```ts
type Permission = 'dashboard_main' | 'dashboard_meta' | 'prospeccao' | 'crm' 
                | 'atendimento' | 'usuarios' | 'assinaturas' | 'faturamento' 
                | 'configuracoes' | 'integracoes';

const ROLE_PERMISSIONS: Record<AccountRole, Permission[]> = {
  owner: [/* todas */],
  admin: [/* todas exceto assinaturas/faturamento */],
  operational: ['prospeccao', 'crm', 'atendimento'],
};
```

**Hook `useAccountRole()`** — carrega role do usuário logado (cacheado).

**Proteção de rotas em `ProtectedRoute`:**
- Mapear pathname → Permission (estender o catálogo atual)
- Se sem permissão → `/acesso-negado`
- Operacional logando → redirect para `/prospeccao-ia` (substituir lógica de landing pós-login)

**Nova página `/usuarios` (`src/pages/Users.tsx`):**
- Header com contador `X / Y usuários utilizados`
- Tabela: Nome, Email, Cargo, Status, Criado em, Último login, Ações
- Botão **Adicionar Usuário** → `AddUserDialog`
- Ações por linha: Editar / Desativar / Reativar / Redefinir Senha (Owner sem ações destrutivas)

**`AddUserDialog`:**
- Form: Nome, Email, Senha, Confirmar Senha, Cargo (Admin/Operacional — Owner nunca)
- Tabela de permissões readonly que reativa conforme cargo selecionado (toggles `disabled`)
- Validação de limite antes de submit
- Sucesso → `UserCreatedSuccessDialog` com confetti, botões "Copiar Dados" e "Compartilhar" (WhatsApp/Gmail/Outlook/Copiar Link) com mensagem pré-montada

**`MustChangePasswordDialog`** — modal não-dismissível disparado no `AuthContext`/`ProtectedRoute` quando `must_change_password=true`. Atualiza via `supabase.auth.updateUser({password})` e zera o flag via RPC.

**Sidebar (`AppSidebar.tsx`):**
- Item "Usuários" entre Sino e Ajuda, visível só para Owner/Admin

**Perfil (Admin):**
- Esconder seções de assinatura/faturamento/cartão; mostrar apenas card simples "Plano + próxima renovação"

**Página `/acesso-negado`:** elegante, com ícone, mensagem e botão Voltar.

## 5. Auditoria
- Edge functions registram em `account_audit_log` (criação/edição/desativação/reativação/reset).
- (Opcional nesta fase) tela admin para visualizar log — fora do escopo desta entrega, apenas a tabela registrando.

## 6. Email (Resend)
- Verificar via `fetch_secrets` se `RESEND_API_KEY` existe; se não, pedir.
- Template HTML simples seguindo identidade Wiize com nome, email, senha temporária, URL do sistema, aviso de troca.

## 7. Ordem de execução
1. Verificar secret Resend
2. Migration (enums, account_members, audit_log, profiles columns, RPCs, GRANTs, RLS)
3. `src/lib/accountPermissions.ts` + extender `planAccess.ts` com `getUserSeatLimit`
4. Edge functions (`account-create-member`, `account-reset-member-password`, `account-update-member`)
5. Hook `useAccountRole` + `useAccountMembers`
6. Estender `ProtectedRoute` com check de permissão e redirect operacional
7. Página `/usuarios` + dialogs (Add, Edit, Success, ResetPassword)
8. `MustChangePasswordDialog` global
9. Sidebar item + ocultar para operacional
10. Página `/acesso-negado`
11. Ajustes na página Perfil para Admin
12. Smoke test: criar admin, criar operacional, login operacional → redirect, tentar acessar /dashboard → negado, primeiro login → modal senha

## Detalhes técnicos
- Toda criação/edição de membros passa por edge function (service role) — RLS impede front de inserir direto em `account_members` para outro usuário.
- `must_change_password` lido do `profiles` (joinado no AuthContext) para evitar round-trip extra.
- Limite checado em 3 camadas: UI, RPC `count_account_members`, e dentro da edge function antes de criar auth user.
- Operacional: redirect feito em `ProtectedRoute` quando `location.pathname === '/dashboard'` e role = operational → `/prospeccao-ia`. Também ajustar pós-login default.
- Confetti: usar `canvas-confetti` (já leve, sem dependências pesadas) — adicionar via `bun add canvas-confetti`.

## Fora de escopo (confirmar depois se necessário)
- UI admin para visualizar audit log
- Convite por link (em vez de senha temporária) — fluxo atual usa senha gerada pelo Owner conforme spec
- 2FA por membro
