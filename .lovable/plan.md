
# Refatoração AI Workforce — Experiência orientada por resultado

Transformar a criação de colaboradores digitais em algo que parece "criar um colaborador", não "configurar uma IA". Manter o Canvas como modo avançado, nunca como ponto de partida.

## 1. Novo fluxo de entrada (Dashboard / Lista)

Ao clicar em **Novo Workforce** o usuário escolhe entre 3 caminhos, em um modal único:

1. **Assistente Inteligente** (padrão, destacado) — wizard guiado em 7 passos
2. **Criar com IA** (campo de prompt único, estilo ChatGPT)
3. **Templates prontos** (biblioteca por categoria)

Removeremos completamente o atalho que abre o Canvas vazio. O Canvas só abre **depois** que existe um Workforce gerado.

## 2. Assistente Inteligente (Nível 1 — fluxo principal)

Arquivo novo: `src/components/equipe-ia/wizard/WorkforceWizard.tsx` (modal full-screen, estilo Notion/Linear, 1 pergunta por tela com progresso).

Passos:

1. Função (SDR, Qualificador, Atendimento, Suporte, Cobrança, Agendamento, Pós-venda, Outro)
2. Objetivo (agendar reunião, coletar info, resolver dúvidas, abrir chamado, qualificar, recuperar)
3. Canais (WhatsApp, Instagram, Chat, Facebook, Multicanal)
4. Acesso à plataforma (CRM, histórico, pipeline, agenda, conhecimento) — multi-select
5. Coleta de dados (toggle + campos sugeridos: nome, telefone, e-mail, cidade, orçamento, custom)
6. Personalidade (consultivo, profissional, comercial, amigável, objetivo)
7. Descrição livre curta (ex.: "Qualificar leads de software para clínicas odontológicas")

Cada passo: chip-cards grandes com ícone, sem jargão técnico. Atalhos "voltar" / "pular".

Ao concluir → chama a edge function `generate-equipe-ai` (já existe) com o blueprint do wizard e gera tudo automaticamente: objetivo, memória, conhecimento, coleta de dados, regras, escalonamento, ferramentas, critérios de sucesso/falha.

## 3. Criador por prompt (Nível 2)

Arquivo novo: `src/components/equipe-ia/wizard/WorkforcePromptCreator.tsx`.

Tela única tipo composer ChatGPT: textarea grande + sugestões clicáveis ("Crie um SDR para imobiliárias…"). Envia para a mesma edge function com `mode: "prompt"`.

## 4. Biblioteca de Templates (Nível 3)

Componente novo: `src/components/equipe-ia/wizard/TemplateGallery.tsx`. Categorias: Vendas, Atendimento, Suporte, Cobrança, RH, Marketing. Cada template tem blueprint pronto → instala Workforce em 1 clique (reaproveita `generate-equipe-ai` com `mode: "template"`).

## 5. Canvas Inteligente (pós-criação)

Mudanças em `src/components/equipe-ia/canvas/EquipeCanvas.tsx`:

- Canvas **nunca abre vazio**. Se não houver nodes, dispara geração automática a partir do blueprint salvo no `ai_workforce.config`.
- Card central obrigatório **Workforce Core** (não pode ser deletado — bloquear delete quando `kind === "core"`).
- Nodes organizados em **categorias** na sidebar de drag-and-drop:
  - Objetivos · Conhecimento · Memória · Dados · Comportamento · Ferramentas · Ações · Inteligência
- Cada categoria collapsable. Layout automático em árvore radial em torno do Core.

## 6. Workforce Score

Componente novo: `src/components/equipe-ia/canvas/WorkforceScorePanel.tsx` (canto superior direito do Canvas).

- Score 0–100 calculado client-side a partir dos nodes presentes: objetivo (+15), regras (+15), conhecimento (+15), escalonamento (+15), memória (+15), ferramentas (+15), persona (+10).
- Lista de sugestões acionáveis ("Adicione memória de longo prazo…") que ao clicar inserem o node correspondente.

## 7. Dashboard refatorado

Substituir métricas técnicas em `src/pages/equipe-ia/EquipeDashboard.tsx` por:

- Conversas iniciadas / concluídas
- Objetivos concluídos
- Taxa de sucesso
- Taxa de transferência humana
- Leads qualificados
- Reuniões agendadas
- Conversões geradas

Dados puxados de `agent_conversations` + `handoff_assignments` + `leads` (queries agregadas por workforce_id quando disponível; placeholder zero quando ainda não há dados, com empty state convidando a criar o primeiro Workforce).

## 8. Linguagem e identidade visual

- Substituir "configurar IA / nodes / canvas" por "colaborador / habilidades / função" em toda a UI visível.
- Botão primário sempre: **Novo Colaborador**.
- Tom dos textos: orientado a resultado, não a engenharia.

## Detalhes técnicos

- **Blueprint do wizard** salvo em `ai_workforce.config.blueprint` (jsonb existente, sem migração).
- Edge function `supabase/functions/generate-equipe-ai/index.ts` atualizada para aceitar `{ mode: "wizard"|"prompt"|"template", blueprint }` e retornar `{ nodes, edges, summary, persona, rules, knowledge, dataFields, escalation }`. Mantém fallback de skeleton já existente.
- `useEquipeIA.ts` ganha `useGenerateWorkforce({ mode, payload })` que chama a function e popula `ai_workforce` + `ai_workforce_canvas` em uma transação client-side (insert workforce → invoke function → insert canvas).
- Roteamento:
  - `/equipe-ia` → Dashboard novo
  - `/equipe-ia/novo` → modal de entrada (wizard / prompt / template)
  - `/equipe-ia/colaboradores/:id` → Canvas (com auto-gen se vazio)
- Remover `EquipeCreator.tsx` antigo (substituído pelo wizard) e manter `EquipeLegacy.tsx` somente como rota oculta de fallback.

## Arquivos a criar

- `src/components/equipe-ia/wizard/WorkforceWizard.tsx`
- `src/components/equipe-ia/wizard/WorkforcePromptCreator.tsx`
- `src/components/equipe-ia/wizard/TemplateGallery.tsx`
- `src/components/equipe-ia/wizard/NewWorkforceModal.tsx` (tabs entre os 3 modos)
- `src/components/equipe-ia/wizard/workforceTemplates.ts` (catálogo)
- `src/components/equipe-ia/canvas/WorkforceScorePanel.tsx`
- `src/components/equipe-ia/canvas/NodeCategorySidebar.tsx`

## Arquivos a editar

- `src/pages/equipe-ia/EquipeDashboard.tsx` (KPIs de negócio)
- `src/pages/equipe-ia/EquipeList.tsx` (CTA → NewWorkforceModal)
- `src/pages/equipe-ia/EquipeBuilder.tsx` (auto-gen se canvas vazio, score panel)
- `src/components/equipe-ia/canvas/EquipeCanvas.tsx` (categorias, core obrigatório)
- `src/components/equipe-ia/EquipePageLayout.tsx` (linguagem)
- `src/hooks/useEquipeIA.ts` (`useGenerateWorkforce`)
- `supabase/functions/generate-equipe-ai/index.ts` (modos wizard/prompt/template)

## Fora de escopo desta entrega

- Execução real das novas ferramentas (Agenda, Webhooks) — só configurados visualmente.
- Métricas históricas: o dashboard mostra dados atuais; séries temporais ficam para depois.
- Edição inline de nodes complexos (segue usando o drawer atual).

## Plano de validação

1. Criar Workforce via wizard → confirmar canvas pré-montado com Core + 5 módulos conectados.
2. Criar via prompt "Crie um SDR para imobiliárias" → confirmar geração coerente.
3. Instalar template "Atendimento" → confirmar canvas populado.
4. Abrir canvas existente vazio → confirmar auto-geração.
5. Tentar deletar Core → confirmar bloqueio.
6. Score atualiza ao adicionar/remover nodes.
7. Dashboard mostra KPIs de negócio (zeros + empty state em conta nova).

Após o ok, implemento na ordem: edge function → hook → wizard/prompt/templates → modal de entrada → canvas (core + categorias + score) → dashboard → linguagem.
