Ajuste visual da seção "Recursos da plataforma" (PlatformModulesSection) na landing page

Objetivo
--------
Transformar os cards de módulos da landing page de cards verdes sólidos (bg-primary) para cards claros com uma textura sutil de grid/fundo para dar destaque sem o contraste brusco ou a sensação de "verde morto".

Direção escolhida
-----------------
"Grid sutil em cada card" (v1): cards brancos com background de linhas/grid em baixíssima opacidade, mantendo a estrutura sticky, mockups e alternância de layout.

Escopo de alterações
--------------------
1. `src/components/sales/PlatformModulesSection.tsx`
   - Trocar o `bg-primary` dos cards por `bg-card`.
   - Adicionar uma camada de textura de grid (`linear-gradient`) com opacidade baixa (≈ 5%) usando `hsl(var(--primary))` em cada card.
   - Ajustar bordas dos cards de `border-white/20` para `border-border`.
   - Atualizar tipografia dos cards de branco/white-85 para tokens de foreground (`text-foreground`, `text-muted-foreground`).
   - Alterar o badge de eyebrow (label de módulo) de glass/branco para `bg-primary/10` com texto `text-primary`.
   - Alterar os itens de benefícios de `bg-white/15` + `border-white/30` para variações claras com `bg-primary/5` ou `bg-muted` + `border-primary/15` e texto `text-foreground`.
   - Ajustar o ícone de check dentro dos benefícios de branco para `text-primary`.
   - Revisar o gradiente de destaque no card (`radial-gradient` de primary-foreground) para uma versão sutil que não fique pesada em cards claros.
   - Verificar se o `MockShell` (fundo do mockup interno) mantém legibilidade sobre o novo card claro; ajustar se necessário.

2. `src/components/sales/WhyItWorksSection.tsx` (revisão)
   - Verificar se a transição visual entre "Recursos da plataforma" (agora clara) e a seção seguinte continua coesa.
   - Ajustar margens ou fundo se necessário para evitar que as duas seções claras fiquem "grudadas".

3. Verificações
   - Build local (`bun run build` ou `vite build`) sem erros de TypeScript/Tailwind.
   - Screenshot da seção em desktop e mobile para validar contraste e legibilidade.

Restrições
----------
- Manter todos os 7 módulos e a alternância de layout (texto/mockup).
- Preservar os mini mockups interativos e a animação de entrada atual.
- Não usar `backdrop-blur` (política do projeto: modais usam `bg-black/70`, sem blur; cards também seguem sem blur).
- Usar tokens semânticos do Tailwind (`bg-card`, `text-foreground`, `hsl(var(--primary))`, etc.) em vez de cores hardcoded.
- Manter o JSON-LD/export SEO já existente.

Critério de aceitação
---------------------
A seção "Recursos da plataforma" exibe cards claros com textura sutil de grid, tipografia legível, e gera destaque visual sem parecer um bloco de cor verde sólido. A animação e responsividade continuam funcionando.
