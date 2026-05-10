# Evolução do Wian — 10 melhorias em 4 fases

São muitas mudanças (banco, edge functions, painel admin, frontend). Para entregar com qualidade e você validar a cada etapa, proponho dividir em **4 fases sequenciais**. Cada fase é independente e já entrega valor.

---

## Fase 1 — Fundação (state machine + frustração + memória + custo)
*Base para tudo o que vem depois. Sem mexer em UI nova de admin.*

**Melhoria 1 — State Machine formal**
- Novo enum `support_phase` em `support_tickets`:
  `triage → faq_resolution → ai_investigating → ai_solution → waiting_user_confirmation → escalated → human_assigned → resolved → closed → rated`
- Tabela `support_ticket_events` (audit log de transições, com timestamp e quem disparou)
- `support-chat` e `support-escalate` passam a gravar transição em vez de apenas mexer em `status`
- Frontend (`WianChat.tsx`) lê `phase` em vez de inferir estado por marcadores

**Melhoria 2 — Frustration Score**
- Nova função TS `computeFrustration(message, history)` no edge: detecta CAPS LOCK (>60% maiúsculas), palavrões (lista PT-BR), repetição (mesma palavra-chave em 3+ msgs), gatilhos ("já tentei", "não funciona", "péssimo", "ridículo", "horrível", "cancelar")
- Coluna `frustration_score` (0–100) em `support_tickets`, atualizada a cada msg do usuário
- Regra: score ≥ 60 → escala automática com prioridade `high` mesmo se for `trial_user`
- Marcador `[ALTA_FRUSTRACAO]` aparece pro admin no card do ticket

**Melhoria 5 — Memory Summary progressivo**
- Coluna `conversation_summary` em `support_tickets`
- A cada 6 mensagens novas: chamada paralela ao gpt-4o-mini ("resuma em 3 bullets o que já foi tentado e descoberto")
- `support-chat` envia: `summary` + **últimas 4** mensagens (em vez de 10 cruas) → economia de ~60% de token em conversas longas

**Melhoria 7 — Cost Tracking (backend)**
- Já temos `tokens_in/out` em `ai_logs`. Adicionar:
  - Coluna `cost_usd` calculada (input $0.15/1M, output $0.60/1M para gpt-4o-mini)
  - View `support_cost_by_ticket`, `support_cost_by_user`, `support_cost_by_category`
- Dashboard fica para Fase 4

---

## Fase 2 — Inteligência (clustering + confiança semântica + tool mode básico)

**Melhoria 3 — Bug Clustering / Detecção de incidentes**
- Cron `support-incident-detector` (roda a cada 15 min)
- Pega tickets das últimas 2h, agrupa por similaridade de embedding (threshold 0.75)
- Se um cluster atinge ≥ 5 tickets distintos em janela curta → cria registro em `system_alerts` (`type: 'incident_suspected'`, `cluster_summary`, `affected_users`)
- Badge vermelho na sidebar admin + banner no `/admin/suporte/tickets`

**Melhoria 9 — Confiança semântica ponderada**
- Adicionar `success_rate` em `knowledge_base` (atualizada quando ticket resolvido cita aquele KB)
- Score final = `similarity × 0.6 + category_match × 0.2 + historical_success × 0.2`
- Threshold dinâmico por categoria (ex: cobrança exige 0.7, dúvida geral aceita 0.4)

**Melhoria 6 — Tool Mode (versão controlada)**
- Adicionar function calling no `support-chat` com 3 tools seguras (read-only):
  - `check_whatsapp_connection(user_id)` → status do número Evolution/Meta
  - `check_subscription_status(user_id)` → plano, expiração, falhas de cobrança
  - `get_recent_campaign_status(user_id)` → última campanha + erros
- Resposta vira: "Verifiquei aqui — sua sessão WhatsApp X está desconectada desde ontem às 18h. Vou te ajudar a reconectar 👇"
- Tools são **opt-in** no prompt (modelo decide quando chamar)

---

## Fase 3 — Autolearning + Humanização

**Melhoria 4 — Autolearning (humano vira KB)**
- No painel admin de tickets: botão **"Transformar em conhecimento"** quando ticket resolvido por humano
- Modal: gpt-4o-mini lê transcrição → sugere `title`, `category`, `pains`, `solution`, `tags`
- Admin revisa, ajusta e salva → `support-embed` gera embedding automaticamente
- Métrica de "% tickets virando KB" no dashboard

**Melhoria 8 — Humanização controlada (refino do prompt)**
- Adicionar regras explícitas no system prompt:
  - "Máximo 3 emojis na conversa inteira"
  - "Nunca repita a mesma frase de transição 2x seguidas"
  - "Se já cumprimentou, não cumprimente de novo"
- Avaliação automática: a cada 50 tickets, rodar análise de "tom" (gpt-4o-mini classifica: muito_formal / equilibrado / muito_informal / prolixo) → ajuste fino do prompt

---

## Fase 4 — Dashboard Executivo (Melhoria 10 + 7 visual)

Nova rota `/admin/suporte/inteligencia` com:

**Painéis:**
- KPIs topo: tickets/dia, % resolução IA, NPS médio, custo IA total mês, custo médio/ticket
- **Módulo mais problemático** (categoria com mais tickets nos 30d)
- **Bugs recorrentes** (clusters detectados)
- **Onboarding mais difícil** (categoria com maior frustration_score médio)
- **Categoria com pior NPS**
- **Top 10 usuários com mais tickets** (sinal de churn)
- **Risco de churn** (usuários com NPS ≤ 6 + frustration alto + ticket aberto)
- **Custo IA vs humano** (gráfico comparativo)
- **Resolução por token** (eficiência da IA por categoria)

**Tech:** React Query + Recharts, paginação 20/página, lazy load.

---

## Detalhes técnicos

- Modelo continua `gpt-4o-mini` (memória do projeto). Tools usam function calling nativo OpenAI.
- Migrações idempotentes (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`).
- RLS: tabelas novas (`support_ticket_events`, `system_alerts` se ainda não existir) → admin vê tudo via `is_current_user_admin()`, usuário vê só do próprio ticket.
- Edge functions afetadas: `support-chat` (todas as fases), `support-escalate` (Fase 1), nova `support-incident-detector` (Fase 2), nova `support-kb-from-ticket` (Fase 3).
- Sem breaking changes no frontend público — Wian continua funcionando durante migrações.

---

## Como prosseguir

Me responde com **uma das opções**:
- **"toca Fase 1"** → começo agora pela fundação
- **"faz tudo"** → executo as 4 fases em sequência (vai gerar muitos arquivos)
- **"só X e Y"** → escolhe melhorias específicas (ex: "só 2, 3 e 10")
- Ou peça ajustes no plano antes de começar
