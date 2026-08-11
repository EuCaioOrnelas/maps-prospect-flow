# Auditoria de Performance e Escalabilidade — Wiize

## Diagnóstico (o que os números realmente dizem)

**RAM 63–69%: não é problema.** A instância é uma t4g.nano (≈0,5 GB). O Postgres reserva shared_buffers + cache de páginas e mantém isso ocupado por design — memória "usada" aqui é majoritariamente cache de leitura, não vazamento. Não há OOM kills e zero restarts desde o boot.

**Conexões 23/60: não é problema.** No momento da auditoria: 13/60 conexões e apenas 1/200 clientes no PgBouncer. Não existe nenhum `createClient` extra no app (só o client oficial + o client do blog, que é outro projeto), **zero canais Realtime** abertos e nenhuma conexão persistente vazando. As conexões vêm de: PostgREST (pool interno fixo), pg_cron/pg_net workers, Realtime/Storage/Auth internos e as Edge Functions. É o baseline normal da plataforma.

**O problema real é outro: crescimento descontrolado de tabelas de log e trabalho ocioso de cron.**

Banco = 1,85 GB, e a aplicação inteira ocupa menos de 60 MB. O resto:

| Tabela | Tamanho | Linhas |
|---|---|---|
| `cron.job_run_details` | **1.231 MB** | 850.565 (desde 10/03) |
| `net._http_response` | **594 MB** | 2.357 (tabela inchada/bloat) |
| `public.campaign_processor_heartbeats` | 24 MB | 127.402 (desde 24/03) |
| `public.leads` | 3 MB | 1.143 |

Ou seja: **~98% do disco é histórico de cron/HTTP que nunca é limpo.** Isso também é o que mais pressiona cache e autovacuum.

Além disso:
- **6 crons rodando a cada minuto**, incluindo **`handoff-reassign-watcher` duplicado (jobid 24 e 25)** — trabalho e chamadas HTTP dobradas de graça.
- `campaign-processor` faz INSERT + UPDATE de heartbeat todo minuto mesmo sem campanha ativa (31.555 inserts + 31.555 updates registrados).
- `revenue_events` recebeu **1.870.386 consultas** (N+1 do motor de score) sem índice perfeito para o filtro usado.
- **RLS caro:** as policies usam `is_account_member(owner_user_id)` — função com argumento que varia por linha, então o Postgres a executa **uma vez por linha** e não consegue usar o índice. É por isso que `leads` (1.143 linhas!) tem consultas de 60–1.200 ms e 4.205 seq scans.
- Índice duplicado: `revenue_leads_user_phone_unique` e `idx_revenue_leads_user_phone` são idênticos.
- Dashboard dispara ~13 consultas separadas por carregamento (várias na mesma tabela `leads`).

---

## Plano de correção

### 🔴 CRÍTICO — parar o crescimento infinito
1. **Retenção de `cron.job_run_details`** (manter 7 dias) via job diário. Sozinho libera ~1,2 GB.
2. **Retenção de `net._http_response`** (manter 2 dias) + reclaim do bloat de 594 MB.
3. **Retenção de `campaign_processor_heartbeats`** (manter 7 dias) no mesmo job de limpeza.

### 🔴 CRÍTICO — RLS por linha
4. Criar `public.accessible_owner_ids()` (STABLE, SECURITY DEFINER) devolvendo o array de owners que o usuário logado pode ver, e reescrever as policies de `leads`, `chat_conversations`, `chat_messages`, `lead_deals`, `revenue_leads` para `owner_user_id = ANY (public.accessible_owner_ids())`.
   *Semântica idêntica* (mesmas regras de dono/sub-usuário/membro de conta), mas avaliada **uma vez por query** e compatível com índice. Nada é afrouxado; RLS continua ligado.

### 🟠 ALTO — cron ocioso
5. Remover o cron **duplicado** `handoff-reassign-watcher` (jobid 25).
6. `campaign-processor` só grava heartbeat quando existe campanha em execução (evita 43k linhas/mês inúteis).

### 🟠 ALTO — índices
7. Adicionar `revenue_events (lead_id, event_type, created_at DESC)` — cobre a query de 1,87 M chamadas.
8. Adicionar `revenue_score_logs (lead_id, event_type, created_at DESC)` — 40 k chamadas.
9. Adicionar `revenue_leads (last_activity_at)` — sweep global de 2.925 chamadas, hoje seq scan.
10. Adicionar `blog_posts (status, scheduled_for)` — 18 k chamadas do scheduler.
11. Remover **apenas** o índice comprovadamente duplicado `revenue_leads_user_phone_unique` (idêntico a `idx_revenue_leads_user_phone`, que permanece garantindo a unicidade).
12. `ANALYZE` nas tabelas quentes (estatísticas de `leads`/`chat_conversations` estão de junho).

*Não serão removidos* os índices "sem uso" de embeddings (`idx_kb_embedding`, `idx_faqs_embedding`) nem PKs — são necessários.

### 🟡 MÉDIO — frontend/consultas
13. Consolidar o dashboard principal: as consultas repetidas em `leads` viram uma única leitura reaproveitada, eliminando 5–7 round-trips por carregamento.
14. Reduzir o polling desnecessário: o badge de não lidas do chat (30 s) e demais intervalos passam a pausar quando a aba não está visível (padrão que já existe em outros módulos).
15. Paginação: aplicar `range()` nas listas que hoje leem tudo (leads/CRM, mensagens, histórico) onde ainda não há limite.

### 🟢 BAIXO
16. `frontend_errors`, `user_events`, `landing_page_events` ganham retenção (90 dias) para não repetirem o mesmo padrão daqui a um ano.

---

## Detalhes técnicos
- Tudo em migrations aditivas e idempotentes (`CREATE INDEX IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` + recriação equivalente). Nenhum `DROP TABLE`, nenhuma coluna removida, nenhum dado de negócio apagado.
- As policies serão recriadas com a **mesma** lógica de acesso — validarei antes/depois com consultas de comparação.
- A limpeza de logs de cron/HTTP não afeta nenhuma funcionalidade: são tabelas de telemetria interna do Postgres.
- Validação final: linter de segurança, `EXPLAIN` nas queries alvo antes/depois, checagem de TypeScript e verificação de que as telas de CRM, Chat e Dashboard continuam carregando.

## Infraestrutura
Depois da limpeza o banco cai de 1,85 GB para ~60 MB. A t4g.nano continua adequada nesse cenário; o próximo upgrade só se justifica quando houver **>40 conexões sustentadas**, uso de disco crescendo de novo ou queries acima de 200 ms com índice correto — detalho isso no relatório final.
