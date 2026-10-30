# Wiize Updates — entrega e verificações

## Reaproveitados
Avisos `announcements`, histórico legado `user_announcement_reads`, notificações `user_notifications`, AuthContext, permissões administrativas por user_roles, tema global e componentes de diálogo/menu/tabela.

## Criados
- src/lib/updates.ts
- src/lib/updates.test.ts
- src/lib/opportunityQuota.ts
- src/components/layout/AccountMenu.tsx
- src/components/layout/OpportunityUsage.tsx
- src/components/updates/UpdateModal.tsx
- src/components/updates/UpdatesPresenter.tsx

## Editados
- src/pages/AdminAnnouncements.tsx
- src/components/layout/AppHeader.tsx
- src/components/layout/AppSidebar.tsx
- src/components/layout/MobileNav.tsx
- src/pages/MainDashboard.tsx
- src/components/ProtectedRoute.tsx
- src/components/crm/WiizePayPromo.tsx
- src/hooks/useUserNotifications.ts
- src/hooks/useUnreadAnnouncements.ts
- src/components/notifications/AnnouncementsDialog.tsx
- src/components/admin/AdminSidebar.tsx
- src/pages/Profile.tsx
- src/pages/wiize-api/ApiSettings.tsx
- src/contexts/AuthContext.tsx
- src/pages/Dashboard.tsx
- src/index.css
- AGENTS.md
- roadmap.md
- src/integrations/supabase/types.ts (gerado automaticamente)

## Banco / migrations
- drizzle/migrations/0044_wiize_updates.sql
- drizzle/migrations/0045_updates_security_guards.sql
- Histórico e arquivos de migration gerados automaticamente pela ferramenta.

As duas migrations foram aplicadas ao banco compartilhado. Nenhuma Edge Function criada ou secret novo requerido. Bucket privado `wiize-updates`, 50 MB por arquivo; políticas restringem uploads a admins, imagens a 5 MB e leitura ao público elegível. Métricas reais, eventos idempotentes e limitados, histórico preservado por exclusão lógica.

## Testes executados
- 14 testes Vitest (recorrência 7/15/30 dias, uma vez, login, intervalo personalizado, destinos, arquivos, quota e promoção WiizePay): passaram.
- Admin autenticado: criou e publicou novidades temporárias, confirmadas no banco; retiradas da exibição depois. Avisos de teste removidos.
- Dashboard autenticado: menu de conta, controle de tema, painel de avisos e navegação mobile funcionaram sem erros JavaScript.
- Viewports 390×844, 768×1024 e 1419×895: sem overflow horizontal.
- Compilação automática: OK.

## Limitações e pendências
A sessão disponível para testes não possui `session_id` no token. Por segurança, o sistema de eventos exige sessão completa; não foi enfraquecida essa validação. A emissão de sessão para o solicitante falhou pois seu e-mail não corresponde a uma conta. É necessário login real na prévia para verificar popup automático, reabertura, frequência e interações completas. Upload/reprodução de mídia e isolamento entre duas contas também não foram verificados de ponta a ponta.

Agendamento usa início/fim no servidor: o aviso fica disponível na hora configurada, com notificação gerada na publicação imediata ou na próxima abertura/carregamento do usuário. Não foi criado verificador permanente para contas offline. A seleção administrativa por pessoa/empresa carrega até 1.000 perfis nesta versão. Substituição de mídia preserva referências históricas, mas limpeza automática de uploads abandonados ainda não foi implementada.

A prévia inicialmente serviu arquivos antigos mesmo após sincronização; foi recuperada e os controles novos foram conferidos. Imagens antigas da promoção WiizePay não carregaram no navegador local; essa mídia anterior não foi substituída.

A interface não foi publicada. Para disponibilizar no site, publicar somente após concluir as verificações restantes.
