Ajuste visual da seção "Recursos da plataforma" (PlatformModulesSection) na landing page

Objetivo
--------
Transformar os cards de módulos da landing page para um layout claro e premium: cards brancos com textura sutil de grid, separação visual entre a área de texto (estilo do terceiro protótipo) e a área de mockup (estilo do primeiro protótipo), mantendo destaque sem o contraste brusco do verde sólido.

Direção escolhida
-----------------
Combinação personalizada dos protótipos v1 e v3:
- Card branco com grid sutil em baixíssima opacidade (v1).
- Divisão do card em duas zonas: texto à esquerda, mockup à direita em fundo levemente mais escuro (v1).
- Estilo tipográfico e de ícones/benefícios da área de texto inspirado no v3, adaptado aos tokens do projeto.

Escopo de alterações
--------------------
1. `src/components/sales/PlatformModulesSection.tsx`
   - Trocar o `bg-primary` dos cards por `bg-card`.
   - Adicionar uma camada de textura de grid (`linear-gradient`) com opacidade baixa (≈ 5%) usando `hsl(var(--primary))` em cada card.
   - Ajustar bordas dos cards de `border-white/20` para `border-border`.
   - Dividir internamente cada card em duas colunas: texto em `bg-card` e mockup em uma zona levemente diferenciada (ex.: `bg-muted/30` ou `bg-slate-50/50`) para dar separação visual, sem alterar o tamanho dos mockups.
   - Área de texto:
     - Adicionar um bloco de ícone grande (≈ 48px) em `rounded-2xl bg-primary/10 text-primary` acima do título.
     - Título em `font-display text-foreground text-2xl sm:text-3xl font-bold`.
     - Descrição em `text-muted-foreground`.
     - Benefícios com check em círculo preenchido `bg-primary text-primary-foreground` e texto `text-foreground`.
     - Badge de eyebrow em `bg-primary/10 text-primary rounded-full`.
   - Remover o gradiente radial de destaque branco sobre o card (não faz sentido em card claro).
   - Verificar se o `MockShell` e os mini mockups internos mantêm legibilidade sobre o novo fundo; ajustar sombras e bordas se necessário.
   - Manter sticky, alternância de layout, animações e responsividade.

2. `src/components/sales/WhyItWorksSection.tsx` (revisão)
   - Verificar a transição visual entre a seção de recursos (agora clara) e a seção seguinte.
   - Ajustar margens ou fundo se necessário para evitar que duas seções claras fiquem visualmente coladas.

3. Verificações
   - Build local (`bun run build` ou `vite build`) sem erros de TypeScript/Tailwind.
   - Screenshot da seção em desktop e mobile para validar contraste, legibilidade e tamanho preservado dos mockups.

Restrições
----------
- Manter todos os 7 módulos e a alternância de layout (texto/mockup).
- Preservar os mini mockups interativos e a animação de entrada atual.
- Não alterar o tamanho/dimensões dos mockups representativos.
- Não usar `backdrop-blur` (política do projeto: modais usam `bg-black/70`, sem blur; cards também seguem sem blur).
- Usar tokens semânticos do Tailwind (`bg-card`, `text-foreground`, `hsl(var(--primary))`, etc.) em vez de cores hardcoded.
- Manter o JSON-LD/export SEO já existente.

Critério de aceitação
---------------------
A seção "Recursos da plataforma" exibe cards claros com textura sutil de grid, separação entre zona de texto e zona de mockup, tipografia premium na área de texto e legibilidade perfeita. A animação, responsividade e tamanhos dos mockups continuam inalterados.
