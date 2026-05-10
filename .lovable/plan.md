
# Wian Inteligente: Tool-calling + Conhecimento total da plataforma

Transforma o Wian de um chatbot de FAQ em um **agente real com acesso aos dados da conta do usuário** (somente logados) e **conhecimento profundo de cada módulo da Wiize**. O fluxo de triagem (menu → categoria → subproblema) continua exatamente como está hoje — o salto acontece **depois** que o usuário cai no chat aberto com o Wian.

## Princípios

- **Triagem preservada**: usuário ainda passa pelo menu de categorias e soluções guiadas. O Wian ganha superpoderes apenas no chat livre (fase `chat`).
- **Tools só para usuários autenticados**: visitantes (guest) continuam recebendo o Wian "FAQ-only" como hoje. Logados ganham o Wian "diagnóstico real".
- **Leitura ampla, ações simples e sempre confirmadas**: Wian pode consultar quase tudo, mas qualquer ação que mude estado pede confirmação explícita do usuário no chat.
- **Conhecimento total**: cada módulo (Warming, Campanhas, CRM, Flows, IA Agents, Billing, etc.) ganha entrada na base estática `wianKnowledge.ts` com regras, limites e fluxos resumidos.
- **Nova opção em cada categoria**: "Dúvida sobre como usar" — leva direto ao Wian com contexto da categoria, sem passar pelos sub-problemas.

## Mudanças por arquivo

### 1. Nova base de conhecimento estática
**`src/components/support/wianKnowledge.ts`** (novo)
- Objeto `WIAN_KNOWLEDGE` por módulo: `warming`, `campaigns`, `crm`, `flows`, `aiAgents`, `chat`, `billing`, `opportunities`, `dashboard`, `account`.
- Cada entrada: `description`, `keyRules` (limites, DDI 55, planos), `commonFlows` (passo-a-passo de uso), `troubleshooting` (problemas frequentes), `relatedRoutes` (rotas internas).
- Função `getKnowledgeForCategory(categoryId)` retorna o subset relevante para injetar no prompt sem estourar contexto.

### 2. Nova edge function: `support-wian-tools`
**`supabase/functions/support-wian-tools/index.ts`** (novo)
- Endpoint POST único que executa uma tool por chamada.
- Valida JWT do usuário (cliente Supabase com auth header → `auth.getUser()`).
- Roteia por `tool` (campo do body) entre handlers.
- Cada handler usa **cliente com JWT do user** (RLS aplica) para leitura e ações simples.
- Logs de auditoria em `wian_tool_calls` (user_id, tool, params, success, ts).

**Tools implementadas:**

| Tool | Tipo | O que faz |
|---|---|---|
| `get_account_overview` | leitura | Plano, créditos, validade, trial status |
| `get_whatsapp_connections` | leitura | Números conectados, status, último heartbeat, tipo (Evolution/Meta) |
| `get_warming_status` | leitura | Nível de aquecimento, msgs hoje, próximo limite |
| `get_active_campaigns` | leitura | Últimas 10 campanhas, status, taxa de envio, erros |
| `get_campaign_details` | leitura | Detalhes de uma campanha específica + últimos erros |
| `get_crm_summary` | leitura | Total leads por estágio, leads sem follow-up |
| `get_recent_leads` | leitura | Últimos 10 leads (nome, score, estágio, telefone mascarado) |
| `get_active_flows` | leitura | Flows ativos, execuções recentes |
| `get_ai_agents_status` | leitura | Agentes configurados, msgs enviadas hoje, silenciamentos |
| `get_recent_errors` | leitura | Erros recentes (campanhas falhadas, tokens expirados, etc.) |
| `reconnect_whatsapp` | ação | Dispara reconexão de um número (precisa `confirmed: true`) |
| `pause_campaign` | ação | Pausa campanha (precisa `confirmed: true`) |
| `resume_campaign` | ação | Retoma campanha (precisa `confirmed: true`) |
| `silence_ai_agent` | ação | Silencia agente IA em uma conversa (precisa `confirmed: true`) |

**Padrão de ação**: primeira chamada sem `confirmed` retorna `{ requires_confirmation: true, summary: "..." }`. Wian mostra summary ao user e pede confirmação. Segunda chamada com `confirmed: true` executa.

### 3. Migração de banco
**`wian_tool_calls`** (auditoria, idempotente):
```
id uuid pk, user_id uuid, tool text, params jsonb,
success bool, error text, created_at timestamptz
```
RLS: usuário lê só os próprios; service_role escreve.

### 4. Atualização da `support-chat`
**`supabase/functions/support-chat/index.ts`** (editar):
- Adicionar bloco `TOOLS:` no system prompt listando tools disponíveis (apenas se `userId` presente).
- Trocar OpenAI Chat Completions cru por `tools` nativo (function calling) com `parallel_tool_calls: true`.
- Loop de tool-calling até `finish_reason !== "tool_calls"` (limite 5 iterações de segurança).
- Cada tool chamada → `fetch` interno para `support-wian-tools` passando JWT do user.
- Injetar conteúdo de `wianKnowledge.ts` (módulo da `triageContext.category`) no system prompt.
- Manter modelo `gpt-4o-mini` (memória core) e marcadores `[INVESTIGANDO]/[SOLUCAO]/[ESCALAR_HUMANO]`.

### 5. UI: opção "Dúvida sobre uso" em cada categoria
**`src/components/support/triageTree.ts`** (editar):
- Adicionar campo opcional `usageHelp?: { aiHint: string }` em `Category`.
- Adicionar `usageHelp` para cada categoria (ex.: "User quer entender como usar campanhas").

**`src/components/support/WianChat.tsx`** (editar):
- Na Camada 2 (submenu de problemas), adicionar **primeiro item destacado**: "🤔 Tenho uma dúvida de uso" (visual diferente, com ícone HelpCircle).
- Ao clicar, pula direto para `phase === "chat"` com mensagem inicial do Wian já contextualizada na categoria + `triedSolution: "[Dúvida de uso]"`.

### 6. Renderização de tool calls no chat
**`src/components/support/WianChat.tsx`** (editar):
- Novo tipo de mensagem `Msg.toolCall?: { name, status, summary }`.
- Renderiza inline na bolha do Wian: pequeno chip com ícone (Search/Wrench), nome humanizado da tool ("Consultando suas conexões..."), e estado (`running`/`done`/`error`).
- Resultados de leitura ficam invisíveis (só Wian usa); ações pendentes mostram botões "Confirmar" / "Cancelar" inline.

### 7. Memória do projeto
Adicionar `mem://features/support/wian-agent-tools` documentando: tools disponíveis, padrão de confirmação, gating por user logado, relação com `wianKnowledge.ts`.

## Detalhes técnicos

```text
┌─ User chat (logado) ─┐
│  WianChat.tsx        │ POST /functions/v1/support-chat
└────────┬─────────────┘    {message, history, triageContext, userId}
         │
         ▼
┌─ support-chat ────────────────────────────┐
│  1. Carrega knowledge por categoria       │
│  2. Monta prompt + tools (se userId)      │
│  3. OpenAI gpt-4o-mini com function call  │
│  4. Loop: chama tools até resposta final  │
└────────┬──────────────────────────────────┘
         │ fetch interno (JWT do user)
         ▼
┌─ support-wian-tools ──────────────────────┐
│  Roteia tool → handler                    │
│  Lê com cliente RLS-scoped                │
│  Audita em wian_tool_calls                │
└───────────────────────────────────────────┘
```

**Confirmação de ações** (exemplo `pause_campaign`):
1. Wian → `pause_campaign({ campaignId: "abc" })`
2. Tool retorna `{ requires_confirmation: true, summary: "Pausar campanha 'Black Friday' (1247 contatos pendentes)?" }`
3. Wian mostra ao user: card com summary + botões.
4. User clica "Confirmar" → frontend manda nova mensagem com flag `confirmedAction: { tool, params }` → support-chat injeta isso → Wian re-chama `pause_campaign({ campaignId: "abc", confirmed: true })`.
5. Tool executa, retorna resultado, Wian confirma na conversa.

**Custo estimado**: cada conversa de 5 trocas com 2 tool calls deve gerar ~3-5k tokens extras (gpt-4o-mini ≈ R$ 0,002 por conversa). Aceitável para suporte.

**Segurança**:
- Visitante (guest) → bloqueado de qualquer tool, prompt nem menciona tools.
- RLS aplicada via JWT do user na cliente Supabase dentro da edge function.
- Auditoria de toda tool call (incluindo falhas).
- Telefones de leads mascarados na resposta (`+55 11 ****-1234`).
- Ações destrutivas (delete, etc.) **não entram** nessa fase — só `pause/resume/reconnect/silence`.

## Fora de escopo (intencional)
- Não migra para Vercel AI SDK / Lovable AI Gateway agora (manteria mudança mínima na infra existente que usa OpenAI direto + memória core). Pode ser feito depois.
- Não adiciona ações destrutivas (deletar lead, cancelar plano, etc.) — exigiria 2FA/captcha.
- Não toca em flows de IA Agents do WhatsApp do usuário (sistema diferente).
- Não muda fluxo do guest.

## Ordem de execução
1. Migration `wian_tool_calls` (aprovação prévia).
2. `wianKnowledge.ts` (estático).
3. Edge function `support-wian-tools` + deploy.
4. Atualizar `support-chat` para function calling + carregar knowledge.
5. Atualizar `triageTree.ts` + `WianChat.tsx` (opção "dúvida de uso" + render de tool calls + UI de confirmação).
6. Salvar memória.
