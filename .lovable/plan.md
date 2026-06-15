## Visão geral

Adicionar ao construtor visual de fluxos do WhatsApp:

1. Um novo tipo de card chamado **Avaliação** (categoria Atendimento / Pesquisa / Feedback), com 5 modos de coleta (botões, menu, numérica, estrelas, livre), persistência de respostas, opcional pedido de sugestão, e múltiplas saídas (recebida, positiva, neutra, negativa, sugestão).
2. Uma nova configuração global por fluxo: **Reset por Inatividade**, com tempo configurável, ação (reiniciar / ir a card / encerrar / menu) e mensagem opcional antes do reset.

Mantém o padrão visual atual (cards Wiize), suporta drag-and-drop, persiste em `wa_flow_nodes.config` e roda no `wa-flow-runner` com a Meta Cloud API.

---

## 1. Banco de dados

### 1.1 Enum / novo tipo de nó
- Adicionar `rating` ao enum `wa_flow_node_type`.

### 1.2 Tabela `wa_flow_ratings` (novas avaliações coletadas)
Campos relevantes (além de id/created_at): `user_id`, `owner_user_id`, `flow_id`, `node_id`, `execution_id`, `contact_phone`, `contact_name`, `lead_id` (nullable), `rating_name`, `rating_type` (buttons/menu/numeric/stars/free), `score_numeric` (nullable), `score_max` (nullable), `score_text` (nullable), `bucket` (positive/neutral/negative/null), `suggestion_text` (nullable), `sent_at`, `responded_at`.
- RLS: dono da conta lê/edita; service_role total. GRANTs autenticado + service_role conforme padrão.
- Índices: `(user_id, created_at)`, `(flow_id)`, `(execution_id)`.

### 1.3 Reset por inatividade no fluxo
- Acrescentar colunas em `wa_automation_flows`:
  - `inactivity_reset_enabled boolean default false`
  - `inactivity_timeout_seconds integer` (nullable)
  - `inactivity_action text` (`restart` | `goto_node` | `end` | `main_menu`)
  - `inactivity_target_node_id text` (nullable)
  - `inactivity_message text` (nullable)
- Acrescentar coluna em `wa_flow_executions`:
  - `last_user_message_at timestamptz`
  - `inactivity_processed_at timestamptz` (para evitar disparo duplo)

### 1.4 Cron / agendamento
- Reaproveitar a edge function `wa-flow-runner` com um novo modo `mode=inactivity_sweep` chamado por cron a cada 1 min (similar ao pattern já usado).
- Migration adiciona um `pg_cron` job apontando para a função.

---

## 2. Backend (Edge Functions)

### 2.1 `wa-flow-runner`
- Ao receber inbound: atualizar `last_user_message_at = now()` na execução ativa.
- Novo handler de node `rating`:
  - Envia mensagem inicial usando interativo apropriado:
    - `buttons` (máx 3) → reply buttons Meta
    - `menu` → list interactive
    - `stars` → reply buttons com strings de estrelas, se ≤3; senão list
    - `numeric` → list (gerado de min..max, paginado em até 10) ou texto livre se range > 10 (peça que digite e valide)
    - `free` → mensagem de texto, aguarda input livre
  - Aguarda input (via `awaiting_input_until` + `awaiting_node_id`).
  - Ao receber resposta:
    - Calcula `score_numeric` quando aplicável e `bucket` baseado em thresholds configuráveis (`positive_min`, `negative_max`).
    - Insere em `wa_flow_ratings`.
    - Se `ask_suggestion = true` → envia pergunta SIM/NÃO. SIM: aguarda texto → salva em `suggestion_text` e envia mensagem final. NÃO: envia mensagem curta e marca saída.
  - Roteamento por handles: `received`, `positive`, `neutral`, `negative`, `suggestion`.

### 2.2 `wa-flow-inactivity` (handler embutido no runner)
- Para cada execução `active`/`waiting` cujo `last_user_message_at + inactivity_timeout_seconds < now()` e `inactivity_processed_at IS NULL` e o fluxo tem reset habilitado:
  - Envia `inactivity_message` (se houver).
  - Aplica a ação:
    - `restart`: marca execução `abandoned`, dispara nova execução do nó de entrada.
    - `goto_node`: avança para `inactivity_target_node_id`.
    - `end`: marca `abandoned` (libera novo trigger).
    - `main_menu`: procura primeiro nó de menu/botões e vai para lá; fallback `restart`.
  - Marca `inactivity_processed_at`.

---

## 3. Frontend

### 3.1 Toolbar / catálogo de cards
- `src/components/wa-flow/WANodeToolbar.tsx`: adicionar entrada **Avaliação** (ícone Star da lucide) na categoria Atendimento.

### 3.2 Novo nó visual
- `src/components/wa-flow/nodes/WARatingNode.tsx`: segue o padrão dos outros nodes (cabeçalho com ícone, resumo do tipo selecionado, handles de saída `received`/`positive`/`neutral`/`negative`/`suggestion`).
- Registrar em `WhatsAppFlowEditor.tsx` (nodeTypes + mapping de criação) e nos helpers de paleta.

### 3.3 Configuração do nó
- `WANodeConfigDrawer.tsx`: nova seção quando `node_type === 'rating'`:
  - Nome da avaliação (input)
  - Mensagem (textarea)
  - Tipo de avaliação (select: botões, menu, numérica, estrelas, livre)
  - Campos condicionais:
    - Botões: até 3 opções (label + valor + bucket positive/neutral/negative)
    - Menu: até 10 opções (mesma estrutura)
    - Numérica: nota mínima / máxima, limiares positive_min / negative_max
    - Estrelas: máximo 3/5/10
    - Livre: nada extra
  - Toggle "Solicitar sugestão após avaliação" + textos personalizáveis
  - Preview da mensagem que será enviada

### 3.4 Configurações gerais do fluxo
- `WhatsAppFlowEditor.tsx` → painel de Configurações (já existente para test mode):
  - Adicionar seção **Reset por inatividade** com toggle, select de tempo (presets + Personalizado), select de ação, seletor de nó alvo (quando `goto_node`), textarea de mensagem opcional.
- Persistir nas novas colunas de `wa_automation_flows`.

### 3.5 Dashboard de resultados (estrutura inicial)
- Em `FlowResultsDialog.tsx`, adicionar aba **Avaliações** com:
  - Total de avaliações, média, NPS, contagens positiva/neutra/negativa, total de sugestões.
  - Lista paginada das últimas avaliações (contato, nota, sugestão, data).
- Dados via query a `wa_flow_ratings` filtrando pelo `flow_id`.

---

## 4. Estrutura de `config` do nó rating

```json
{
  "name": "Pesquisa de Satisfação",
  "message": "Como você avalia nosso atendimento?",
  "type": "numeric",          // buttons | menu | numeric | stars | free
  "options": [                 // buttons/menu
    { "label": "Ruim", "value": "1", "bucket": "negative" }
  ],
  "numeric": { "min": 0, "max": 10, "positive_min": 9, "negative_max": 6 },
  "stars":   { "max": 5, "positive_min": 4, "negative_max": 2 },
  "ask_suggestion": true,
  "suggestion_prompt": "Você possui alguma sugestão...",
  "suggestion_thanks": "Obrigado pela sua contribuição..."
}
```

---

## 5. Arquivos previstos

- Migration nova (enum + tabela + colunas + cron).
- `supabase/functions/wa-flow-runner/index.ts` — handler `rating` + sweep de inatividade + update de `last_user_message_at`.
- `src/components/wa-flow/WANodeToolbar.tsx`
- `src/components/wa-flow/WANodeConfigDrawer.tsx`
- `src/components/wa-flow/nodes/WARatingNode.tsx` (novo)
- `src/pages/WhatsAppFlowEditor.tsx` (registrar tipo + painel de configurações de inatividade)
- `src/components/wa-flow/FlowResultsDialog.tsx` (aba avaliações)
- `src/integrations/supabase/types.ts` (regenerado após migration)

---

## 6. Pontos de confirmação

1. **Buckets default** (numeric): positivo ≥ 80% da nota máxima, neutro entre 50–79%, negativo < 50%? Posso usar isso como padrão e deixar editável.
2. **Reset por inatividade — granularidade do timer**: cron rodando a cada 1 min é suficiente (margem ±60s)?
3. **Dashboard de avaliações**: incluir já nesta entrega como aba dentro do `FlowResultsDialog`, ou apenas deixar a tabela pronta e construir dashboard depois?

Posso seguir com os defaults acima se preferir não bloquear.