## Objetivo

1. **Scoring** — revisar TODAS as 25 regras de score para garantir comportamento minucioso (não só a de 24h), com detecção contextual real, limites por período, decay progressivo e penalidades coerentes.
2. **Fluxos (WA Automation)** — bloquear execução em números Evolution; aceitar somente conexões Meta Oficial **com webhook verificado**; garantir que TODOS os nodes funcionem via Meta Cloud API; permitir template HSM para reabrir conversa fora da janela de 24h.

---

## Parte 1 — Auditoria do Scoring (`revenue-processor`)

Revisão regra a regra, com lógica detalhada:

| Regra | Refinamento que será implementado |
|---|---|
| `BACK_AND_FORTH_5_TURNS` | Contar turnos reais (alternância inbound↔outbound), ignorar mensagens sociais/duplicadas, janela móvel de 24h |
| `CONVERSATION_ACTIVE_3D`/`5D`/`7D` | Verificar dias **distintos** com mensagem inbound real (não social), não dias corridos |
| `INTENT_BUY_NOW`, `INTENT_PRICE`, `INTENT_DEMO` | Classificador léxico + regex PT-BR ampliado (preço, valor, quanto custa, fechar, contratar, comprar, demonstração, agendar, etc.) com dedupe por conversa/dia |
| `OBJECTION_PRICE`, `OBJECTION_TIMING` | Detecção de padrões ("caro", "depois", "agora não", "sem tempo") com peso negativo controlado |
| `SLA_FIRST_RESPONSE_UNDER_5MIN` / `UNDER_1H` | Mede tempo entre 1ª inbound do lead e 1ª outbound do operador, ignorando se a inbound foi social-only |
| `LEAD_REPLIED_FAST` | Tempo do lead respondendo o operador < X min |
| `MEDIA_SENT_BY_LEAD` (áudio/imagem/doc) | Conta por tipo, com cap diário; áudio longo (>15s) ganha bônus |
| `LEAD_GHOSTED_2H` (decay 1) | -40 uma vez quando passam 2h sem resposta após msg do operador |
| `LEAD_GHOSTED_24H_BLOCK` | -140 a cada bloco de 24h adicional, **reset** ao primeiro reply real do lead |
| `CONVERSATION_REOPENED` | Detecta retorno após >7 dias de silêncio (+bônus) |
| `BUSINESS_HOURS_REPLY` | Bônus se o lead responde em horário comercial (sinal de seriedade) |
| `OUT_OF_HOURS_NOISE` | Penalidade leve para flood fora de horário |
| `GREETING_ONLY` / `FAREWELL_ONLY` | Marca `is_social=true` e **não dispara** SLA nem decay |
| `EMOJI_REACTION_POSITIVE/NEGATIVE` | Lê reações Meta (👍/❤️ vs 👎) |
| `FORM_DATA_SUBMITTED` | Dados extraídos pelo Data Collect node → +pontos |
| `CRM_STAGE_ADVANCED` / `REGRESSED` | Já existe, validar idempotência |
| `OPT_OUT` / `BLOCK_REPORTED` | Hard-stop: zera score, marca `do_not_contact` |

Implementação:
- Função util `classifyMessage(content)` → `{intents[], objections[], isSocial, isGreeting, isFarewell, emojis[]}` usada por todas as regras.
- Contadores e cooldowns persistidos em `revenue_score_logs` (idempotência por `dedupe_key`).
- Cron `sweep_unreplied` já existente passa a aplicar TODAS as regras de decay temporais, não só ghost.
- Guarda global: ignorar tudo que vier de `source != 'meta'`.

**Arquivos:** `supabase/functions/revenue-processor/index.ts` (refactor grande), `supabase/functions/_shared/messageClassifier.ts` (novo módulo compartilhado), migration adicionando colunas em `revenue_score_rules` se faltar (`cooldown_minutes`, `requires_non_social`).

---

## Parte 2 — Fluxos (WA Automation) Meta-Only

### 2.1 Gate de execução
- `wa-flow-runner`: ao iniciar execução, validar que o número alvo é uma `user_waba_connections` com `webhook_verified_at IS NOT NULL` e `status='connected'`. Se não, marcar execução `failed` com motivo `"requires_meta_official_with_verified_webhook"`.
- Bloquear na UI (`CreateFlowDialog`, `WAEntryNode`, configuração de gatilho): listar apenas números Meta com webhook OK; mostrar aviso quando o usuário tem só números Evolution/Meta sem webhook.

### 2.2 Nodes — compatibilidade Meta Cloud
Auditoria e correção por node:
- **WAMessageNode**: enviar via `/messages` (text); suportar variáveis `{{lead.nome}}` etc.
- **WAButtonsNode**: migrar payload para `interactive.type=button` (até 3 botões, 20 chars cada) — validação na UI.
- **WAAgentNode**: usar `gpt-4o-mini` via Lovable AI; persistir contexto em `wa_flow_executions.context`.
- **WAGmailNode / WAGoogleSheetsNode / WAGoogleCalendarNode**: usar `user_google_tokens` com refresh; retornar erro amigável se não conectado.
- **WADataCollectNode**: extrair via IA, validar tipo, salvar no contexto + `leads`.
- **WAWaitNode**: respeitar horário comercial e timezone do usuário.
- **WAHandoffNode / WAActionNode / WAEndNode**: já ok, garantir flush do buffer e silenciar agente.
- **WAConditionNode / WAABTestNode / WARandomSplitNode**: validar saídas múltiplas.

### 2.3 Janela de 24h e Template HSM
- Em **todo node que envia mensagem** (Message, Buttons, Media), checar `last_inbound_at` do lead:
  - dentro de 24h → envia mensagem livre normal.
  - fora de 24h → **obrigatoriamente** usar template aprovado.
- No editor (`WANodeConfigDrawer` + cada node config): adicionar seção "Fora da janela de 24h":
  - selector de template HSM (lista vinda de `meta-templates-list`),
  - mapeamento de variáveis `{{1}}`, `{{2}}`,
  - opção "pular node se não houver template".
- Novo node opcional **WAReopenTemplateNode** (ou flag em Message) para reabertura intencional de conversa fria.

### 2.4 Webhook obrigatório
- Componente reutilizável `RequireMetaWebhookGuard` (usa `useWebhookGate`) envolvendo a página de fluxos; mostra dialog para configurar webhook.
- `generate-wa-flow` (IA) passa a gerar somente nodes compatíveis Meta.

---

## Arquivos previstos para edição/criação

**Backend (edge functions / migrations):**
- `supabase/functions/revenue-processor/index.ts` (refactor)
- `supabase/functions/_shared/messageClassifier.ts` (novo)
- `supabase/functions/wa-flow-runner/index.ts` (gate Meta+webhook, suporte template fora 24h, fix nodes)
- `supabase/functions/generate-wa-flow/index.ts` (apenas nodes Meta-compatíveis)
- nova migration: colunas `cooldown_minutes`, `requires_non_social`, `is_social` em `revenue_score_rules`/`revenue_score_logs` se faltarem; seed/upsert das 25 regras finais.

**Frontend (fluxos):**
- `src/components/wa-flow/CreateFlowDialog.tsx` — filtrar números Meta+webhook
- `src/components/wa-flow/WANodeConfigDrawer.tsx` — seção template fora 24h
- `src/components/wa-flow/nodes/WAMessageNode.tsx`, `WAButtonsNode.tsx` — UI template HSM
- `src/components/wa-flow/nodes/WAGmailNode.tsx`, `WAGoogleSheetsNode.tsx`, `WAGoogleCalendarNode.tsx` — checagem Google conectado
- `src/pages/WhatsAppAutomations.tsx` — RequireMetaWebhookGuard
- `src/components/wa-flow/RequireMetaWebhookGuard.tsx` (novo)

---

## Detalhes técnicos

- Classifier compartilhado: léxicos PT-BR mantidos em constantes versionadas (`INTENT_LEXICON`, `OBJECTION_LEXICON`, `SOCIAL_LEXICON`) para facilitar tuning.
- Idempotência: cada evento usa `dedupe_key = hash(user_id, lead_id, rule, bucket_window)`.
- Decay temporal único loop (`sweep_temporal_rules`) iterando regras `kind='temporal'` no banco — extensível sem editar código.
- Templates HSM: cache em `meta_template_cache` (1h TTL) para o editor.
- Logs estruturados (`[scoring]`, `[wa-runner]`) com lead_id, rule, points, reason.

---

## Riscos / fora de escopo

- Não vou tocar no editor visual do React Flow além dos drawers de config dos nodes.
- Templates HSM precisam estar pré-aprovados na Meta — não vamos criar templates novos no fluxo.
- Se um node Google node falhar por falta de conexão, a execução pausa o ramo com mensagem clara — não tenta auth automaticamente.

Confirma para eu seguir com a implementação completa nessa ordem (scoring → guards de fluxo → nodes → templates HSM)?
