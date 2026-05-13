# Plano: Módulo Meta Platforms

Criar nova categoria **Meta Platforms** no sidebar principal da plataforma (não admin) com módulo enterprise completo de operação WhatsApp Cloud API integrado ao CRM existente.

## Escopo

### 1. Sidebar
- Adicionar categoria "Meta Platforms" em `src/components/layout/AppSidebar.tsx` com ícone `MessageSquareCode` (Lucide — moderno, mensagens+API)
- Submenu com 8 itens linkando para `/meta/*`

### 2. Rotas (em `src/App.tsx`)
```
/meta                    → MetaDashboard
/meta/campanhas          → MetaCampanhas
/meta/templates          → MetaTemplates
/meta/numeros            → MetaNumeros
/meta/reabertura         → MetaReabertura
/meta/custos             → MetaCustos
/meta/qualidade          → MetaQualidade
/meta/configuracoes      → MetaConfiguracoes
```
Todas dentro do layout autenticado existente.

### 3. Páginas (`src/pages/meta/`)

**MetaDashboard.tsx** — Cockpit
- Header: seletor período (DateRange) + filtros (campanha, número, usuário, status, pipeline, origem) + botões "Nova Campanha" / "Novo Template"
- Grid de 13 KPI cards com sparkline (recharts) e delta % vs período anterior
- Gráficos: linha custo/dia, barras mensagens vs respostas, funil CRM 7 etapas, heatmap horários, pizza categorias templates, barras custo por campanha
- Tabela performance campanhas (sortable, paginada, busca)
- Painel "Insights de IA" — cards com bullets

**MetaCampanhas.tsx**
- Lista de campanhas (cards/tabela) com ações: criar, pausar, duplicar, arquivar, agendar
- Drawer de criação/edição com todos os campos (nome, WABA, template, pipeline, etapa, horário, limite, delay, prioridade, estratégia)
- Visualização do fluxo (template → resposta → janela 24h → IA → handoff humano) em diagrama horizontal
- Aba IA: prompt, tom, CTA, limite chars, diagnóstico, nicho
- Aba Métricas: custo, taxa resposta, CPL, CPO, tempo médio, leads ativos

**MetaTemplates.tsx**
- Grid de templates com filtros por categoria interna (abertura fria, follow-up, reabertura, confirmação, reunião, proposta, recuperação, nurture)
- Botões: criar, editar, sincronizar Meta, duplicar, arquivar
- Editor (drawer/dialog): preview WhatsApp em tempo real, variáveis, contador chars, categoria Meta, idioma, CTA buttons, quick replies
- Status: aprovado/rejeitado, motivo, score qualidade

**MetaNumeros.tsx**
- Cards por número: nome, número, status, quality rating (badge), tier, msgs disponíveis, limite diário, verificado
- Ações: conectar (Embedded Signup), reconectar, remover, sincronizar templates, ver webhook

**MetaReabertura.tsx**
- Lista de automações de reabertura (>24h)
- Criação com: template de reabertura, tempo reengajamento, follow-up, lembrete reunião, confirmação proposta
- 4 cards de exemplo: Confirmar reunião, Retomar contato, Enviar proposta, Lembrete comercial

**MetaCustos.tsx**
- KPIs: custo total, por campanha, número, template, categoria, lead respondido, oportunidade
- Gráficos: evolução custos (linha), comparação campanhas (barras), custo×conversão (scatter), ROI por campanha
- Simulador interativo: inputs (qtd leads, tipo template, taxa resposta) → outputs calculados

**MetaQualidade.tsx**
- KPIs/badges: quality rating, templates reprovados, bloqueios, taxa denúncias, taxa bloqueio, health score, status WABA
- Lista de alertas com severidade: risco limitação, queda qualidade, spam, campanha problemática

**MetaConfiguracoes.tsx**
- Tabs: Webhooks, API Tokens, Limites, Timezone, Delays, Automações, Regras IA, Fallback humano, Janela 24h, Regras reabertura, Notificações

### 4. Componentes compartilhados (`src/components/meta/`)
- `MetaPageHeader.tsx` — header padrão (título, descrição, ações)
- `MetaKpiCard.tsx` — card KPI com sparkline + delta
- `MetaInsightCard.tsx` — card de insight IA
- `MetaFilterBar.tsx` — barra de filtros reutilizável
- `MetaEmptyState.tsx` — estados vazios consistentes

### 5. Dados
**Mock-only nesta entrega.** Sem migrations/edge functions. Estrutura preparada para integração futura com APIs Meta Cloud já existentes no projeto. Comentários `// TODO: integrar com tabela X` onde aplicável.

## Design
- Tokens semânticos Tailwind (`bg-card`, `border-border`, `text-foreground`, etc.) — sem cores hardcoded
- Cards `rounded-[var(--radius-card)]`, sombras leves, bordas discretas
- Recharts para gráficos (já no projeto)
- Skeletons para loading
- Totalmente responsivo, dark mode nativo
- Tipografia e espaçamento alinhados ao restante (Hubspot/Linear/Vercel-like)

## Fora de escopo
- Integrações reais com Meta Cloud API (já existem edge functions; não serão tocadas)
- Mudanças no CRM/banco
- Embedded Signup funcional (apenas UI)

## Entrega
~15-18 arquivos novos + 2 edições (AppSidebar, App.tsx). Sem mudanças de DB/backend.
