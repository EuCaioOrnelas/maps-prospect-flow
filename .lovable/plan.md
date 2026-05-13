## Plano: Migração Relacionamento → Meta Platform

Vou reutilizar os componentes que já funcionam em `src/pages/WhatsAppCampaign.tsx` e `src/components/whatsapp/*` dentro das páginas Meta, ao invés de reescrevê-los. Isso preserva toda a lógica de backend (Supabase, edge functions, drafts, balance, realtime, opt-in, disclaimers) que já está validada em produção.

### 1. Templates (`/meta/templates`)
- Substituir o conteúdo mockado atual de `MetaTemplates.tsx` por uma versão funcional baseada na **etapa "messages" do WhatsAppCampaign** (componente `FirstMessageTemplate` + `MessageVariations`), exibida como **biblioteca de templates** (lista persistida).
- Criar tabela nova `meta_template_categories` (id, user_id, name, color) para **categorias personalizadas Wiize**.
- Adicionar coluna `category_id` (nullable) em `meta_templates` (ou criar tabela `meta_user_templates` se ainda não existir — vou checar antes).
- UI:
  - Header com botão "Nova categoria" (dialog simples) e "Novo template".
  - **Filtro de categoria** em chips no topo (Todos + categorias do usuário).
  - Cards de template mantêm o visual atual da `MetaTemplates`, com badge da categoria interna Wiize (cor personalizada).
- Mantém o sync com Meta e o badge de status (approved / pending / rejected).

### 2. Criação de Campanha (`/meta/campanhas` → "+ Nova campanha")
- Trocar o `Sheet` atual `CampaignEditor` (mock) por um wizard completo idêntico ao do WhatsAppCampaign, em um `Sheet` em tela cheia:
  1. **Seleção do Template** (consome a biblioteca do passo 1, com filtro por categoria).
  2. **Seleção de Leads** — reutiliza `<LeadSelector />`.
  3. **Configurações** — reutiliza `<CampaignSettings />` (delays, pausa inteligente, agendamento).
  4. **Resumo** — reutiliza `<CampaignSummary />`.
  5. **Execução** — reutiliza `<CampaignProgress />` + `<RealtimeMonitor />`.
- Reaproveitar hooks: `useWhatsAppNumbers`, `useCampaignBalance`, `useCampaignDrafts`, `useCampaignRealtime`, `useAutoScoreTracking`.
- Reaproveitar modais: `DisclaimerModal`, `WarmingWarningModal`, `UpgradeModal`, `FreeTrialLimitModal`, opt-in alerts.
- A listagem de campanhas no topo continua a mesma UI (cards), mas alimentada pela tabela `whatsapp_campaigns` real (mesmo backend que Relacionamento).

### 3. Números (`/meta/numeros`)
- Manter o **visual atual** da página Meta Números (grid de cards minimalista).
- Cada card mostra: **Nome**, **Número**, **Tier**, **Uso/Limite (puxado da Meta API via hook existente)**.
- **Remover**: badge "Quality rating".
- **Botões**:
  - "Reconectar" → só aparece quando o número está **desconectado**.
  - "Sincronizar" → só aparece quando desconectado, dispara o sync do período offline (reutiliza a função do `NumbersManager`).
  - "Excluir" → mantém `AlertDialog` de confirmação (com lista de campanhas afetadas, igual ao Relacionamento).
- **Clique no card** → abre o painel/dialog de configuração do número idêntico ao de Relacionamento (`NumbersManager` em modo `forceOpen`), reaproveitando popups, warnings e o aviso de **opt-in**.
- O botão "Conectar via Embedded Signup" passa a abrir o fluxo de adicionar número do `NumbersManager`.

### Migração de banco
- Apenas adicionar suporte a categorias internas (1 tabela + 1 coluna). Sem mexer em estrutura existente.

### Arquivos
**Editar**
- `src/pages/meta/MetaTemplates.tsx` (refazer com dados reais + categorias)
- `src/pages/meta/MetaCampanhas.tsx` (substituir editor mockado pelo wizard real)
- `src/pages/meta/MetaNumeros.tsx` (refazer com dados reais + reuso do NumbersManager)

**Criar**
- `src/components/meta/MetaTemplateCategoryDialog.tsx`
- `src/components/meta/MetaCampaignWizard.tsx` (orquestrador que reusa os componentes whatsapp/*)
- `src/components/meta/MetaNumberCard.tsx` (card limpo + handlers)

**Reusar sem alterar**
- `src/components/whatsapp/LeadSelector.tsx`
- `src/components/whatsapp/CampaignSettings.tsx`
- `src/components/whatsapp/CampaignSummary.tsx`
- `src/components/whatsapp/CampaignProgress.tsx`
- `src/components/whatsapp/NumbersManager.tsx`
- `src/components/whatsapp/RealtimeMonitor.tsx`
- Modais: `DisclaimerModal`, `WarmingWarningModal`, `UpgradeModal`, `FreeTrialLimitModal`

### Fora de escopo (não vou tocar)
- A página `WhatsAppCampaign` original — segue funcionando para compatibilidade durante a transição. Se quiser depois eu removo do sidebar.
- Lógica de envio / Edge Functions / RLS já existentes (sem mudanças).

### Próximo passo
Começo pela migração de Templates (banco + UI), depois Números, depois o wizard de Campanhas.
