# AI Workforce — Refatoração Completa + Exclusão

## 1. Exclusão de colaboradores (faltante)
- `EquipeList.tsx`: adicionar botão de menu (`MoreVertical`) em cada card com opção **Excluir** (AlertDialog de confirmação).
- `useEquipeIA.ts`: novo hook `useDeleteWorkforce` — deleta `ai_workforce_canvas` e `ai_workforce` (cascade por FK) com `confirm` + toast.
- Também disponível dentro do Builder (menu no header).

## 2. Nova arquitetura do Builder (abas)
Substituir o Builder atual por shell com abas no topo:
```
[ Overview ] [ Canvas ] [ Testes ] [ Analytics ] [ Versões ]
```
- `EquipeBuilder.tsx` vira shell com `Tabs`.
- **Overview** (`WorkforceOverview.tsx`) — resumo: objetivo, performance, módulos conectados, conhecimentos, ferramentas, score grande, status de publicação.
- **Canvas** — experiência refatorada (abaixo).
- **Testes** (`WorkforceTestPanel.tsx`) — chat lateral + painel de explicabilidade (memória usada, conhecimento usado, objetivo atual, próxima ação).
- **Analytics** (`WorkforceAnalytics.tsx`) — KPIs (conversas, taxa de sucesso, objetivos, transferências, leads, custo, uso IA).
- **Versões** — placeholder com histórico de salvamentos.

## 3. Canvas premium
### Core dominante (`CoreNode.tsx`)
- 2.5x tamanho dos cards normais (~280×280).
- Glow verde Wiize (`shadow-[0_0_80px_-10px_hsl(var(--primary)/0.4)]`).
- Conteúdo: logo Wiize grande, nome do Workforce, badge de função (ex: "SDR Qualificador"), **Score 0-100**, "8 módulos conectados", status (Ativo/Rascunho), CTA "Pronto para publicar".
- Não deletável (já implementado).
- Mini-painel inline com critérios do score (objetivo ✓, regras ✓, conhecimento ✗…) e sugestão automática.

### Background do canvas
- Grid sutil (`bg-[radial-gradient(circle,hsl(var(--border)/0.15)_1px,transparent_1px)] bg-[size:24px_24px]`).
- Glow radial no centro (verde Wiize, baixa opacidade).
- Gradiente sutil top→bottom.

### Conexões inteligentes
- Edge type custom (`PremiumEdge.tsx`): bezier suave, `strokeWidth: 2.5`, glow via `filter: drop-shadow`.
- Animação opcional de pulso (dot percorrendo) quando workforce está "ativo".

### Cards por categoria (cores semânticas)
Adicionar tokens em `index.css`:
- `--category-estrategia`: verde
- `--category-contexto`: roxo
- `--category-conhecimento`: amarelo
- `--category-dados`: azul
- `--category-inteligencia`: ciano
- `--category-acoes`: laranja
- `--category-escalonamento`: vermelho

Cada card (`ModuleNode.tsx`):
- Borda cinza, ícone com fundo quadrado arredondado na cor da categoria.
- Estrutura: ícone | nome (bold) | descrição curta (muted) | badge status (✓ Configurado / ⚠ Pendente) | dot de obrigatoriedade (Obrigatório/Recomendado/Opcional).
- Hover: leve lift + glow da categoria.

### Sidebar = Biblioteca de Módulos
`NodeCategorySidebar.tsx`:
- Campo de busca no topo (`Pesquisar módulo…`).
- Accordion por categoria: Estratégia, Contexto, Dados, Interação, Ações.
- Cada módulo: ícone categoria + nome + dot obrigatoriedade.
- Layout compacto (h-9 por item).

### Painel de configuração (canto direito)
`WorkforceStatusPanel.tsx`:
- "8 de 10 módulos configurados" com barra.
- Lista de checks (Objetivo ✓, Memória ✓, Escalonamento ✓, Conhecimento ⚠, CRM ✓).
- Sugestões IA contextuais.

## 4. Arquivos
**Criar:**
- `src/components/equipe-ia/canvas/CoreNode.tsx`
- `src/components/equipe-ia/canvas/ModuleNode.tsx`
- `src/components/equipe-ia/canvas/PremiumEdge.tsx`
- `src/components/equipe-ia/canvas/categoryConfig.ts` (mapping categoria→cor/icone/obrigatoriedade)
- `src/components/equipe-ia/builder/WorkforceOverview.tsx`
- `src/components/equipe-ia/builder/WorkforceTestPanel.tsx`
- `src/components/equipe-ia/builder/WorkforceAnalytics.tsx`
- `src/components/equipe-ia/builder/WorkforceVersions.tsx`
- `src/components/equipe-ia/builder/DeleteWorkforceDialog.tsx`

**Editar:**
- `src/pages/equipe-ia/EquipeBuilder.tsx` (shell com tabs)
- `src/pages/equipe-ia/EquipeList.tsx` (botão excluir + ações)
- `src/components/equipe-ia/canvas/EquipeCanvas.tsx` (grid, glow, novos nodes/edges)
- `src/components/equipe-ia/canvas/EquipeNode.tsx` (refatorar p/ usar categoryConfig)
- `src/components/equipe-ia/canvas/WorkforceScorePanel.tsx` (mover lógica de score p/ Core, deixar painel de sugestões)
- `src/hooks/useEquipeIA.ts` (hook delete + tipos de categoria)
- `src/index.css` (tokens de categorias)

## 5. Ordem de execução
1. Hook + UI de exclusão (rápido, libera limpeza).
2. Tokens de categoria + categoryConfig.
3. Refator do canvas (background, edges, ModuleNode, CoreNode dominante).
4. Sidebar busca + agrupamento.
5. Shell de abas no Builder + Overview/Testes/Analytics.
6. Polimento de microinterações.

## 6. Fora de escopo
- Não criar versionamento real agora (aba Versões = placeholder).
- Analytics usa dados reais existentes (`agent_conversations`, `handoff_assignments`) ou empty state.
- Modo teste integra com edge function `chat-with-equipe` já existente; sem novas tabelas.

Aprovar para implementar nessa ordem?
