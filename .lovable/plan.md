# Plano: AI Workforce (Digital Workers)

Refatoração do módulo de Agentes de IA da Wiize, transformando-o numa plataforma de colaboradores digitais orientados a objetivos com construtor visual de comportamento.

---

## 1. Estratégia de Migração (Legado)

- O sistema atual de Agentes IA permanece **100% funcional**, apenas movido para um sub-menu.
- Novo item de menu principal: **"AI Workforce"** (novo produto).
- Item secundário: **"Versão Clássica"** dentro do menu AI Workforce, apontando para todas as páginas atuais (`AdminIAAgentes`, edição de agente, `ai_agents`, `agent_templates`, etc.).
- Banner discreto na Versão Clássica: "Esta é a versão anterior. Migre para AI Workforce para acessar os novos recursos."
- Nenhuma tabela atual é removida ou alterada. Nenhuma edge function existente é tocada.

---

## 2. Arquitetura de Banco (novas tabelas)

Todas com RLS por `account_id`/`user_id`, GRANTs corretos, timestamps.

```text
ai_workforce                 — colaboradores digitais (1 row = 1 worker)
ai_workforce_canvas          — nós e edges do construtor visual (JSONB)
ai_workforce_goals           — objetivos (principal + secundários)
ai_workforce_rules           — regras com prioridade
ai_workforce_knowledge       — fontes de conhecimento (pdf, site, faq)
ai_workforce_tools           — ferramentas habilitadas + permissões
ai_workforce_data_schema     — campos obrigatórios de coleta
ai_workforce_decisions       — árvore de decisão (JSONB)
ai_workforce_executions      — execução ativa por conversa/lead
ai_workforce_execution_logs  — log do ciclo Analisar→Avaliar
ai_workforce_outcomes        — resumo final + análise da conversa
ai_workforce_templates       — marketplace (público + privado)
```

`ai_workforce.config` em JSONB consolida nome, persona, modelo, temperatura, canal, idioma — para evitar 30 colunas.

A integração com o construtor de fluxos existente (`wa_automation_flows`) é feita via novo tipo de nó `ai_workforce` em `wa_flow_nodes.data.kind`, sem migração de schema.

---

## 3. Estrutura de Pastas Frontend

```text
src/pages/ai-workforce/
  AIWorkforceDashboard.tsx          (dashboard principal)
  AIWorkforceList.tsx               (lista de colaboradores)
  AIWorkforceBuilder.tsx            (canvas visual)
  AIWorkforceCreator.tsx            (assistente IA cria-tudo)
  AIWorkforceMarketplace.tsx        (placeholder + estrutura)
  AIWorkforceLegacy.tsx             (redirect/wrapper p/ páginas atuais)

src/components/ai-workforce/
  canvas/
    WorkforceCanvas.tsx             (ReactFlow infinito)
    nodes/
      CoreNode.tsx                  (núcleo — card central obrigatório)
      GoalNode.tsx
      MemoryNode.tsx
      KnowledgeNode.tsx
      CRMDataNode.tsx
      DataCollectionNode.tsx
      RulesNode.tsx
      DecisionNode.tsx
      ToolsNode.tsx
      ActionsNode.tsx
      EscalationNode.tsx
      AnalysisNode.tsx
    edges/RoutedEdge.tsx            (reaproveita o já existente)
    NodePalette.tsx                 (sidebar de cards arrastáveis)
    NodeConfigDrawer.tsx            (config lateral por card)
  dashboard/
    WorkforceKPIs.tsx
    GoalsCompletedChart.tsx
    PerformanceByWorker.tsx
    FunnelChart.tsx
    FiltersBar.tsx
  shared/
    WorkerCard.tsx
    WorkerStatusBadge.tsx
```

---

## 4. Núcleo de Execução por Objetivos

Edge function nova: `ai-workforce-runner`.

Ciclo (loop bounded `stepCountIs(50)`):

```text
1. Carrega contexto (lead, histórico, memória)
2. Verifica estado do objetivo (campos coletados vs schema)
3. Identifica lacunas
4. Gera estratégia (LLM com tools)
5. Executa: responder | chamar tool | escalar | concluir
6. Persiste execution_log + atualiza ai_workforce_executions
7. Avalia critérios de sucesso/falha
8. Se incompleto → próxima mensagem; se completo → outcome + evento
```

Modelo padrão `google/gemini-3-flash-preview` via Lovable AI Gateway. Tools registradas dinamicamente conforme `ai_workforce_tools` habilitadas (CRM, agenda, WhatsApp, webhooks, etc).

---

## 5. Construtor Visual

- Baseado em **ReactFlow** (já usado em `wa-flow`).
- Canvas infinito, pan/zoom, minimap.
- Card central **Core** (não removível, único).
- Cards orbitais conectáveis ao Core e entre si.
- Cada nó tem handles tipados (entrada/saída) e drawer de configuração.
- Salvamento idêntico ao padrão recém-implementado em `WhatsAppFlowEditor` (mapa de IDs, sync de UUIDs no `onSuccess`).
- Botão "Criar com IA" abre o **AIWorkforceCreator** (wizard de 4 perguntas que chama edge function `ai-workforce-generator` e devolve o grafo completo pronto para o canvas).

---

## 6. Dashboard

KPIs no topo + 4 gráficos (Recharts):
- Objetivos concluídos por período (linha)
- Performance por colaborador (barras)
- Funil de conclusão (funnel)
- Conversões/abandono (donut)

Filtros: data, canal, fluxo, equipe, colaborador. Persistidos em querystring.

---

## 7. Integração com Fluxos Existentes

Novo nó no editor de fluxos do WhatsApp (`WhatsAppFlowEditor`):
- Tipo: `ai_workforce`
- Config: seletor de colaborador, modo de espera, timeout.
- Saídas: `success`, `failure`, `transferred`, `no_response`, `partial`.
- Runtime do fluxo invoca `ai-workforce-runner` e aguarda evento.

---

## 8. Marketplace (estrutura preparada, UI mínima nesta entrega)

- Tabela `ai_workforce_templates` com `visibility` (public/private/account).
- Página placeholder com grid + filtros + botão "Instalar" (clonará para `ai_workforce` da conta).
- Seeds iniciais: SDR SaaS, SDR Imobiliário, Suporte Clínicas, Cobrança, Pós-venda.

---

## 9. Entregas em Fases

**Fase 1 — Fundação (esta entrega)**
- Migrations das tabelas novas + RLS + GRANTs.
- Menu reorganizado, página Legado funcional.
- Dashboard AI Workforce com KPIs mockados conectando às novas tabelas.
- Lista de colaboradores + criação básica.
- Canvas visual funcional com **todos os 11 cards** (UI + config drawer), salvamento.
- Edge function `ai-workforce-runner` (esqueleto com ciclo de objetivos, 1 canal: WhatsApp).
- Wizard "Criar com IA" gerando grafo base.
- Nó `ai_workforce` no editor de fluxos.

**Fase 2 — Profundidade (entregas seguintes, sob demanda)**
- Marketplace público.
- Memória vetorial + indexação de conhecimento (pgvector).
- Tools avançadas (Google Calendar, webhooks customizados).
- Métricas finas de tokens/custo por execução.
- A/B de personas.

---

## 10. Decisões Técnicas

- Modelo IA: `google/gemini-3-flash-preview` (default, conforme memory).
- Auth: Custom Supabase Auth existente (não tocar em `lovable/index.ts`).
- UI: tokens semânticos Tailwind, popups com `bg-black/70` sólido (sem blur), padrão fintech premium.
- Nenhuma alteração em tabelas existentes (`ai_agents`, `agent_templates`, etc.).
- B2B only, gating por plano: AI Workforce exige plano com SDR IA (mesma regra do agente atual).

---

## 11. Riscos e Mitigações

| Risco | Mitigação |
|---|---|
| Custo de tokens explodir | Limite de ciclos por execução + alertas no dashboard |
| Loop infinito de objetivo | `max_attempts` por goal + `stepCountIs(50)` |
| Confusão entre Legacy e novo | Banner claro + ambos no menu, sem deprecação forçada |
| Schema grande para AI SDK Output | Schemas compactos, sem enums dinâmicos |

---

## Confirmação

Esta Fase 1 é uma entrega grande (≈30 arquivos novos, 4 migrations, 2 edge functions). Posso prosseguir com tudo de uma vez, ou prefere que eu quebre em sub-entregas (ex.: primeiro Legado+menu+dashboard, depois canvas, depois runner)?
