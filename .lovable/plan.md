# Plano Final — Limpeza e Otimização do Banco (revisado, com validação de dependências)

Nada foi executado. Abaixo está o resultado da segunda auditoria (validação real no banco e no código) e o plano para aprovação.

## Correções em relação à primeira auditoria

Três conclusões da primeira análise **mudaram** depois da validação:

1. **`net._http_response` NÃO precisa de DELETE.** O TTL nativo do pg_net está ativo e funcionando: `pg_net.ttl = 6 hours`, registro mais antigo às 09:03 e mais recente às 15:02 do mesmo dia, apenas **2.359 linhas vivas**. Os 594 MB são **bloat** (490.876 inserts × 488.905 deletes com apenas **1 autovacuum** desde sempre). Criar rotina de limpeza seria inútil.
2. **O índice a remover é outro.** `revenue_leads_user_phone_unique` é uma **constraint UNIQUE** (não pode ser dropada). O redundante é `idx_revenue_leads_user_phone`, índice único solto e idêntico.
3. **Já existe uma solução no projeto que nunca foi ligada.** A Edge Function `cleanup-old-data` faz retenção de heartbeats (3 dias), `rate_limits` (1 h) e `search_history` (7 dias), mas **não existe cron agendando ela**. É a causa raiz dos 127.402 heartbeats desde 24/03.

---

## A. O que será limpo

| Estrutura | Hoje | Retenção proposta | Estimativa removida | Método | Risco |
|---|---|---|---|---|---|
| `cron.job_run_details` | 1.231 MB / 850.565 linhas (desde 10/03) | 7 dias | ~840.000 linhas / ~1,2 GB | Função de purga **em lotes de 20.000** por execução, cron diário 04:15 UTC | 🟢 |
| `campaign_processor_heartbeats` | 24 MB / 127.402 linhas | 3 dias (regra que já existe no código) | ~125.000 linhas | Agendar `cleanup-old-data` (diário 04:30 UTC) | 🟢 |
| `rate_limits` / `search_history` | pequeno | 1 h / 7 dias | — | mesma função, já implementada | 🟢 |
| `net._http_response` | 594 MB (2.359 linhas vivas) | **nenhuma limpeza** | 0 linhas | Ajuste de autovacuum + reclaim opcional (ver D) | 🟡 |
| `frontend_errors`, `user_events`, `landing_page_events` | <2 MB | 180 dias (não 90 — `user_events` alimenta as RPCs de estatística operacional do admin) | ~0 hoje | Incluído na mesma função de purga, já preparada para o futuro | 🟢 |

**Nenhum dado de negócio é tocado.** Verificado: nada no frontend, Edge Functions, RPCs ou triggers lê `cron.job_run_details` nem `net._http_response`; os heartbeats só são lidos pela própria `cleanup-old-data`.

## B. O que NÃO será tocado

Tabelas de negócio (`profiles`, `leads`, `lead_deals`, `chat_*`, `revenue_*`, `whatsapp_*`, `partner_*`, `subscription_*`, `user_roles`, `account_members`, configurações e integrações): nenhum registro apagado, nenhuma coluna alterada.
Também permanecem intactos: todas as triggers, todas as functions de negócio, os índices de embedding (`idx_kb_embedding`, `idx_faqs_embedding` — usados por busca vetorial, "sem uso" apenas porque a busca é esporádica), todas as PKs/FKs e todas as constraints UNIQUE.

## C. Crons — inventário e decisão

25 jobs ativos. Todos **mantidos**, exceto um:

- **Remover: jobid 25 `handoff-reassign-watcher-every-minute`.** Confirmado duplicado do jobid 24 `handoff-reassign-watcher`: mesmo schedule (`* * * * *`), mesma URL, mesmo método, mesmo payload (só difere espaçamento do SQL, por isso o hash difere). Nenhum código referencia jobid. O comando/schedule serão registrados na migration antes do `unschedule`, e a reversão é uma linha de `cron.schedule`.
- **Adicionar 2 jobs novos:** `purge-operational-logs` (04:15 UTC) e `cleanup-old-data-daily` (04:30 UTC).
- **A cada minuto (mantidos):** `wa-flow-scheduler`, `sdr-followup-processor`, `handoff-reassign-watcher`, `campaign-processor`, `start-scheduled-campaigns` — todos com função operacional real.
- **Demais (mantidos):** revenue sweep 30 min; email-flow, calendar-reminders, blog-scheduler 5 min; trial 2 h; support autoclose horário; e os diários de billing/partners/meta/score.

## D. `net._http_response`

- **TTL atual:** `pg_net.ttl = 6 hours` (padrão, funcionando — comprovado pela janela de 6 h dos registros).
- **Volume real:** 2.359 linhas / 587 MB de heap + 7 MB de índice.
- **Bloat:** ~99% do espaço. Causa: alto churn (≈490 k inserts/deletes) com autovacuum praticamente inativo nessa tabela.
- **Dependências:** nenhuma no projeto.
- **Solução proposta:** (1) tornar o autovacuum agressivo nessa tabela (`autovacuum_vacuum_threshold=1000`, `scale_factor=0`) para que o espaço passe a ser **reutilizado** e pare de crescer; (2) o `VACUUM FULL` para devolver os 587 MB ao disco fica como passo **opcional e separado**, só com sua autorização e em janela de baixo tráfego, porque exige lock exclusivo (rápido aqui — poucas linhas vivas — mas bloqueia o pg_net durante a operação). Como o disco está em 28%, isso **não é urgente**. Se o ambiente não permitir alterar a tabela do pg_net (questão de ownership), o plano registra a falha e segue sem ela — nada quebra.

## E. RLS

**Hoje:** `leads`, `chat_conversations`, `chat_messages`, `lead_deals`, `revenue_leads` usam `is_account_member(<coluna_owner>)`. A função (STABLE, SECURITY DEFINER) considera: o próprio owner (`auth.uid()`), sub-usuário (`profiles.parent_owner_id`) e membro ativo (`account_members.status='active'`).

**Problema:** o argumento varia por linha, então o Postgres executa a função **uma vez por linha** e não usa índice. Resultado medido: `leads` com 1.143 linhas gera consultas de 60–1.200 ms e 4.205 seq scans.

**Nova estratégia:** função `public.accessible_owner_ids()` (sem argumento, STABLE, SECURITY DEFINER, `search_path` fixo) devolvendo o array dos owners visíveis — **exatamente as mesmas três regras** — e policies reescritas para `<coluna_owner> = ANY (public.accessible_owner_ids())`. Avaliada uma vez por query e compatível com os índices já existentes. RLS continua habilitado; políticas de admin permanecem como estão.

**Validação de equivalência (obrigatória, antes de aplicar em produção):** harness SQL que, para cada usuário real × cada owner existente, compara `is_account_member(owner)` com `owner = ANY(accessible_owner_ids())` simulando o JWT (`set_config('request.jwt.claims', ...)`). Casos cobertos: owner, sub-usuário, membro ativo, membro inativo, usuário sem vínculo (deve dar 0 nos dois) e usuário anônimo. **Qualquer divergência aborta a alteração** e as policies antigas são restauradas (a migration guarda o texto original).

## F. Índices

**Adicionar (4):**
- `revenue_events (lead_id, event_type, created_at DESC)` — cobre a query de **1.870.386 execuções**. `EXPLAIN` de baseline já coletado: hoje faz `BitmapAnd` de dois índices, 59,9 ms de execução e 79 ms de planning, 49 buffers. Comparação antes/depois será anexada ao relatório final.
- `revenue_score_logs (lead_id, event_type, created_at DESC)` — 40.850 execuções.
- `revenue_leads (last_activity_at)` — sweep global (2.925 execuções, hoje seq scan, média 42 ms).
- `blog_posts (status, scheduled_for)` — 18.756 execuções do scheduler.

**Remover (1):** `idx_revenue_leads_user_phone` — duplicata exata do índice da constraint `revenue_leads_user_phone_unique`, que permanece e garante a unicidade. Nenhum código cita o nome do índice. Reversão: uma linha de `CREATE UNIQUE INDEX`.

**Manter:** todos os demais, inclusive os "sem scans", após checagem de uso por RLS/FK/ordenação.

Complemento: `ANALYZE` em `leads`, `chat_conversations`, `revenue_leads` (estatísticas de junho).

## G. Código a alterar

- `supabase/functions/cleanup-old-data/index.ts` — corrigir o trecho que varre `search_history` inteiro em loop (N+1) e trocar por consulta agregada; sem mudar as regras de retenção.
- `src/hooks/useMainDashboard.ts` — consolidar as leituras repetidas de `leads` (hoje ~6 consultas na mesma tabela por carregamento) em uma única leitura reaproveitada. Métricas e filtros permanecem idênticos.
- `src/hooks/useChatUnreadBadge.ts` — pausar o polling de 30 s quando a aba não está visível (padrão já usado em `useMetaDashboard`).
- Paginação: aplicar `range()` nas listas de CRM/leads e histórico que hoje leem tudo, **preservando** busca, filtros, ordenação, seleção, ações em massa e contagem.
- **Não** será alterada a Edge Function `campaign-processor` (grava heartbeat todo minuto): ela é deployada mas **não existe no repositório**; reescrevê-la às cegas arriscaria locks/retry de campanhas. O desperdício dela é resolvido pela retenção de 3 dias, sem risco.

## H. Risco por alteração

🟢 Índices, `ANALYZE`, purga de `cron.job_run_details` em lotes, agendar `cleanup-old-data`, ajustes de frontend/polling.
🟡 Reescrita das policies RLS (mitigada pelo harness de equivalência), remoção do cron duplicado, ajuste de autovacuum no pg_net, paginação nas listas.
🔴 `VACUUM FULL` em `net._http_response` — **não será executado nesta rodada**; fica como decisão sua, em janela de baixo tráfego.

## I. Ordem de execução (após sua aprovação)

1. Confirmar ponto de recuperação/backup do Cloud.
2. Snapshot "antes": tamanhos, contagens, `EXPLAIN` das queries alvo, matriz de acesso RLS por usuário.
3. Índices novos + `ANALYZE` (não destrutivo, reversível).
4. `EXPLAIN` depois e comparação.
5. Harness de equivalência RLS → só então aplicar as novas policies → repetir o harness.
6. Remover o índice duplicado.
7. Correções de código (dashboard, polling, paginação, cleanup-old-data).
8. Remover cron duplicado (com registro do comando original).
9. Criar função de purga + agendar os 2 crons de retenção.
10. Purga inicial de `cron.job_run_details` em lotes.
11. Ajuste de autovacuum no pg_net.
12. Testes de regressão: login/sessão, CRM (listar/criar/editar/excluir/filtros/paginação), chat e não lidas, campanhas, revenue/scoring, dashboard, permissões owner/membro/sem acesso, execução dos crons mantidos e webhooks/integrações.
13. Relatório final com diagnóstico, arquivos editados, mudanças de banco, antes/depois e recomendação de infraestrutura.
