# Estrutura de Arquivos do Projeto

## /src

### /components
Componentes React reutilizáveis organizados por feature.

#### /admin
- `AgentsMonitorPanel.tsx` - Monitor de agentes de IA
- `CreateUserDialog.tsx` - Modal para criar usuário (admin)
- `PhoneCleanupTool.tsx` - Ferramenta de limpeza de telefones
- `SubscriptionEventsLog.tsx` - Log de eventos de assinatura
- `TermsAcceptanceLog.tsx` - Log de aceite de termos
- `UserActionsMenu.tsx` - Menu de ações do usuário

#### /agents
- `AgentDetailsDialog.tsx` - Detalhes do agente de IA
- `AgentMetricsDashboard.tsx` - Métricas de conversas
- `AgentPromptBuilder.tsx` - Builder de prompts
- `AgentWarningDialog.tsx` - Avisos/alertas
- `CreateAgentWizard.tsx` - Wizard de criação
- `ManageTemplatesDialog.tsx` - Gerenciar templates

#### /crm
- `AddLeadDialog.tsx` - Adicionar lead
- `BulkActionsBar.tsx` - Ações em lote
- `CRMFilters.tsx` - Filtros do CRM
- `CRMMetrics.tsx` - Métricas/cards
- `CountryCodeSelect.tsx` - Seletor de DDI
- `ExportLeadsButton.tsx` - Exportar leads
- `KanbanBoardWithScroll.tsx` - Board Kanban
- `KanbanColumn.tsx` - Coluna do Kanban
- `LeadCard.tsx` - Card de lead
- `LeadDetailDialog.tsx` - Detalhes do lead
- `LeadDetailPanel.tsx` - Painel lateral
- `ManageStagesDialog.tsx` - Gerenciar etapas
- `MobileBlockOverlay.tsx` - Bloqueio mobile

#### /landing
- `AIAgentsSection.tsx` - Seção de agentes IA
- `CTASection.tsx` - Call to action
- `EmailCaptureModal.tsx` - Modal de captura email
- `FAQSection.tsx` - Perguntas frequentes
- `FeaturesSection.tsx` - Features do produto
- `Footer.tsx` - Rodapé
- `HeroSection.tsx` - Hero banner
- `HowItWorksSection.tsx` - Como funciona
- `LandingPageSkeleton.tsx` - Loading skeleton
- `Navbar.tsx` - Navegação
- `PricingSection.tsx` - Preços
- `TestimonialsSection.tsx` - Depoimentos
- `WarmingSection.tsx` - Seção de aquecimento

#### /layout
- `AppHeader.tsx` - Header do app logado
- `AppSidebar.tsx` - Sidebar de navegação
- `BackgroundGlow.tsx` - Efeito de fundo
- `MobileNav.tsx` - Navegação mobile
- `SidebarNavItem.tsx` - Item da sidebar

#### /ui
Componentes base do shadcn/ui customizados.

#### /warming
- `SelectWarmingSearchDialog.tsx` - Selecionar busca
- `WarmingDetailsDialog.tsx` - Detalhes do aquecimento
- `WarmingInteractionsLog.tsx` - Log de interações
- `WarmingNumberCard.tsx` - Card de número
- `WarmingStatsPanel.tsx` - Painel de estatísticas

#### /whatsapp
- `ActiveCampaigns.tsx` - Campanhas ativas
- `BalanceIndicator.tsx` - Indicador de saldo
- `CampaignDrafts.tsx` - Rascunhos
- `CampaignHistory.tsx` - Histórico
- `CampaignProgress.tsx` - Progresso
- `CampaignScheduler.tsx` - Agendamento
- `CampaignSettings.tsx` - Configurações
- `CampaignSummary.tsx` - Resumo
- `DailyLimitIndicator.tsx` - Limite diário
- `DisclaimerModal.tsx` - Aviso legal
- `FirstMessageTemplate.tsx` - Template 1ª mensagem
- `FreeTrialLimitModal.tsx` - Modal limite trial
- `LeadSelector.tsx` - Seletor de leads
- `MessageVariations.tsx` - Variações de mensagem
- `NoConnectedNumbers.tsx` - Sem números
- `NumberSelector.tsx` - Seletor de número
- `NumbersManager.tsx` - Gerenciar números
- `QRCodeConnection.tsx` - QR Code WhatsApp
- `RealtimeMonitor.tsx` - Monitor realtime
- `ReconnectDialog.tsx` - Reconectar
- `UpgradeModal.tsx` - Modal de upgrade
- `WarmingWarningModal.tsx` - Aviso aquecimento
- `WindowProgressIndicator.tsx` - Progresso da janela
- `WindowSystemModal.tsx` - Sistema de janelas

### /contexts
- `AuthContext.tsx` - Estado de autenticação
- `AudioPlayerContext.tsx` - Player de áudio

### /hooks
Custom hooks reutilizáveis.

### /integrations
- `/supabase/client.ts` - Cliente Supabase
- `/supabase/types.ts` - Tipos TypeScript

### /lib
- `fingerprint.ts` - Fingerprint de dispositivo
- `phoneUtils.ts` - Utilitários de telefone
- `secureHash.ts` - Hashing seguro
- `security.ts` - Funções de segurança
- `supabaseWithRetry.ts` - Retry de requests
- `utils.ts` - Utilitários gerais

### /pages
Páginas/rotas da aplicação.

## /supabase

### /functions
Edge functions serverless.

#### Stripe
- `create-checkout/` - Criar sessão checkout
- `stripe-webhook/` - Processar webhooks
- `check-subscription/` - Verificar assinatura
- `get-stripe-mrr/` - Calcular MRR
- `customer-portal/` - Portal do cliente

#### Evolution (WhatsApp)
- `evolution-create-instance/` - Criar instância
- `evolution-get-qrcode/` - Obter QR Code
- `evolution-check-status/` - Verificar status
- `evolution-send-message/` - Enviar mensagem
- `evolution-webhook/` - Webhooks Evolution
- `evolution-run-campaign/` - Executar campanha
- `evolution-disconnect/` - Desconectar
- `evolution-reconnect/` - Reconectar

#### Campanhas
- `campaign-processor/` - Processar campanhas
- `warming-processor/` - Processar aquecimento
- `start-scheduled-campaigns/` - Iniciar agendadas
- `resume-campaigns/` - Retomar campanhas

#### Buscas
- `search-leads/` - Buscar leads (SerpAPI)
- `check-serp-keys/` - Verificar chaves SERP

#### Outros
- `admin-create-user/` - Criar usuário (admin)
- `agent-webhook/` - Webhook de agentes
- `agent-buffer-processor/` - Processar buffer
- `cleanup-*` - Jobs de limpeza
- `reset-daily-counts/` - Reset diário
- `hash-report-password/` - Hash de senha
- `verify-shared-report/` - Verificar relatório

### /migrations
Arquivos SQL de migração do banco.
