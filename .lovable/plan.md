# Distribuição Inteligente de Atendimentos

Vou evoluir o card **Transferir para Humano** do construtor de fluxos para um sistema completo de distribuição, com disponibilidade por colaborador, fila justa (round-robin), contingência e auditoria.

## 1. Banco de Dados (Lovable Cloud)

### Nova tabela `member_availability`
Disponibilidade por colaborador da conta:
- member_id (FK account_members)
- account_owner_id
- status: `online` | `away` | `offline`
- work_days: array de dias (0–6)
- work_start, work_end (time)
- timezone
- updated_at

### Nova tabela `handoff_assignments`
Histórico/estado de cada transferência executada por um card de handoff:
- execution_id (FK wa_flow_executions)
- flow_id, node_id, account_owner_id
- assigned_member_id (nullable enquanto em fila)
- team_member_ids (array dos elegíveis configurados no card)
- distribution_type: `specific` | `round_robin`
- status: `assigned` | `queued` | `reassigned` | `closed` | `failed`
- queued_at, assigned_at, first_response_at, closed_at
- attempts (jsonb com tentativas e falhas)
- contingency_action (quando entra em fila)

### Nova tabela `handoff_audit_log`
Eventos detalhados (transferência, falhas, reatribuições, períodos sem operadores, tempo em fila).

### Ajuste em `wa_flow_nodes`
Os campos novos vão no `config` JSONB do nó handoff (sem migração de coluna):
- distribution_type, member_ids[], specific_member_id
- pre_message, post_message
- max_wait_seconds
- no_agents_actions[] (lista ordenada: send_message, keep_in_queue, auto_reassign_when_online, redirect_flow, end, create_crm_task, notify_managers)
- no_agents_message, redirect_flow_id
- notify_manager_ids[]

Todas as tabelas terão GRANTs + RLS (owner + service_role).

## 2. UI — Configuração de Disponibilidade

Nova aba em **/usuarios** (ou no perfil do colaborador) chamada **Disponibilidade**:
- Toggle status: Online / Ausente / Offline
- Seletor de dias da semana
- Horário início/fim
- Cada colaborador edita o próprio; o dono da conta pode editar de todos

Hook `useMemberAvailability` para leitura/escrita.

## 3. UI — Card "Transferir para Humano"

Reformular `WAHandoffNode` (node visual) e a seção handoff em `WANodeConfigDrawer`:

**Painel lateral (Drawer):**
- Tipo de distribuição: `Colaborador específico` | `Distribuição automática (round-robin)`
- Se específico → Select 1 colaborador
- Se automática → Multi-select de colaboradores + indicador "online agora"
- Mensagem antes da transferência (textarea + suporte a variáveis)
- Mensagem após a transferência
- Tempo máximo de espera (min)
- **Seção "Quando ninguém estiver disponível":**
  - Mensagem personalizada
  - Checkboxes de ações: encerrar, manter em fila, reencaminhar ao ficar online, direcionar para outro fluxo (select), criar tarefa no CRM, notificar gestores (multi-select)

## 4. Runner (Edge Function `wa-flow-runner`)

No node `handoff`:
1. Carregar `member_availability` para os membros configurados.
2. Filtrar elegíveis: status `online` + dentro do horário/dia configurado.
3. Se nenhum elegível → executar **contingência** (mensagem, fila, redirect, CRM task, notify).
4. Se distribuição específica → atribuir direto se elegível, senão contingência.
5. Se round-robin → escolher quem recebeu menos atendimentos recentemente (consulta `handoff_assignments` por `account_owner_id` ordenando por `MAX(assigned_at)` asc). Empates → ordem alfabética.
6. Enviar pre_message → atribuir conversa (gravar `assigned_member_id` em `chat_conversations` + criar `handoff_assignments`) → enviar post_message.
7. Silenciar o agente IA da conversa (já existe esse comportamento no handoff atual; preservar).
8. Logar tudo em `handoff_audit_log`.

### Reencaminhamento automático
Novo cron job (`pg_cron`) a cada 1 min chamando edge function `handoff-reassign-watcher`:
- Busca `handoff_assignments` com `status=queued` e `auto_reassign_when_online=true`
- Se algum membro elegível ficou online → atribui e envia post_message
- Respeita `max_wait_seconds` (expira → executa próxima ação de contingência)

## 5. Detalhes técnicos

- Round-robin "justo": query `SELECT member_id, MAX(assigned_at) FROM handoff_assignments WHERE node_id=? AND account_owner_id=? GROUP BY member_id` — quem nunca recebeu (NULL) ganha prioridade, depois o mais antigo.
- Disponibilidade considera `timezone` do owner para comparar `now()` com `work_start/end`.
- Auditoria com `event_type`: `transfer`, `assignment`, `no_agents`, `requeued`, `expired`, `reassigned`, `closed`.
- RLS: somente owner da conta (via `account_owner_id`) lê handoff_assignments/audit; cada membro vê a própria availability + owner vê todas da conta.
- Compatível com o builder visual atual (sem mudar formato dos nodes/edges).

## 6. Arquivos a criar/editar

**Criar:**
- migration: tabelas + cron
- `src/hooks/useMemberAvailability.ts`
- `src/components/users/MemberAvailabilityCard.tsx`
- `supabase/functions/handoff-reassign-watcher/index.ts`

**Editar:**
- `src/components/wa-flow/nodes/WAHandoffNode.tsx` — exibir tipo de distribuição
- `src/components/wa-flow/WANodeConfigDrawer.tsx` — nova UI completa do handoff
- `supabase/functions/wa-flow-runner/index.ts` — lógica de distribuição + contingência + auditoria
- `src/pages/Users.tsx` ou `src/components/users/MemberDetailDialog.tsx` — incluir aba de disponibilidade

## 7. Fora do escopo desta entrega

- Dashboard analítico próprio de handoff (os dados ficam prontos para futuras telas; uma tela simples de auditoria pode vir em iteração seguinte).
- Integração com IA para sugerir o melhor operador (a estrutura fica preparada).

Confirme para eu executar — ou diga o que ajustar.