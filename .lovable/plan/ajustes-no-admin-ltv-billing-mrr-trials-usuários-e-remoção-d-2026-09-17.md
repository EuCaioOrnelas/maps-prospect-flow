# Ajustes no Admin: LTV, Billing, MRR, Trials, Usuários e remoção de Landing Pages

## 1. LTV com cálculo real

Hoje o LTV usa uma projeção travada (máximo 12 meses, dobro do tempo médio, fórmula ticket ÷ churn) e o tempo de cliente é estimado por "criação da conta + 7 dias". Resultado: média de meses e valor por cliente errados.

Novo cálculo:
- Tempo de cliente por pessoa a partir do **primeiro pagamento real** (`first_paid_at`; se faltar, a primeira fatura/venda encontrada; só então o fallback pela data de cobrança do trial).
- Valor ganho por pessoa = soma real do que ela já pagou (faturas PIX pagas, pagamentos de contratos, vendas de parceiro, cobranças Stripe), não o ticket médio multiplicado.
- LTV exibido = média do valor real já recebido por cliente; o card mostra também a média de meses reais pagos.
- Quem ainda está em teste (sem nenhum pagamento) fica fora da conta.

## 2. Billing (PIX/Renovação) sempre zerado

- **Funil de Renovação**: a tabela lê `pix_tracking_events`, que só é gravada pelos e-mails de renovação. Quando não há nenhum evento, a seção inteira passa a ficar oculta com um aviso claro ("nenhum e-mail de renovação enviado ainda") em vez de uma tabela de zeros. Quando houver dados, a tabela aparece com as taxas reais.
- **Faturas**: hoje só aparecem se a consulta em tempo real ao Asaas responder; qualquer falha deixa a lista vazia e silenciosa. Passa a ter fallback para as faturas gravadas no banco (`pix_invoices`), com aviso quando a consulta externa falhar e botão de recarregar.

## 3. Auditoria de MRR mais completa, sem trial

- Linhas em teste deixam de somar em qualquer total de MRR (somem do "MRR ativo" e ficam separadas como "Em teste").
- Resumo ganha: MRR por provedor (Stripe, Asaas cartão, PIX, manual), MRR por plano, ticket médio, assinaturas canceladas com fim de período futuro e total excluído com o motivo.
- Filtro extra "sem trial" e coluna de motivo mais explícita.

## 4. Página de Trials zerada

Hoje ela só lista quem tem campos de trial preenchidos e não mostra uso. Passa a:
- Considerar também contas recentes sem esses campos (trial implícito pela data de criação e plano).
- Mostrar por pessoa: vencimento, tempo restante (dias/horas), contatos no CRM, leads prospectados, mensagens enviadas, se conectou WhatsApp, plano escolhido e cartão.
- Cartões de resumo no topo: em teste agora, vencendo em 3 dias, vencidos sem conversão, convertidos e taxa de conversão.

## 5. Remover Landing Pages do Admin

- Apagar a área de Landing Pages do admin, o item do menu, a rota e a página pública dinâmica correspondente.
- Arquivos removidos: `src/pages/AdminLandingPages.tsx`, `src/pages/LandingPage.tsx`, `src/components/landing/LandingPageSkeleton.tsx`.
- O rastreamento de conversão do site principal (home, prospecção) continua funcionando — ele não faz parte dessa área.

## 6. Detalhe do usuário completo

Na tela de um usuário, além do que já existe:
- **Dados cadastrais**: e-mail, telefone, CPF/CNPJ, endereço completo, empresa, data de cadastro, tempo de casa, plano, provedor de pagamento e próxima renovação.
- **Uso**: prospecções usadas/limite, contatos no CRM, mensagens enviadas, números conectados, leads, vendas.
- **Satisfação**: média das avaliações de tickets de suporte e quantidade de tickets.
- **Ações administrativas**:
  - Enviar e-mail de redefinição de senha.
  - Ajustar limites da fatura atual (prospecções e contatos): aumentar ou reduzir com registro de quem alterou.

## Detalhes técnicos

- Nova função de backend `admin-user-360` (um único `index.ts`) para consolidar dados cadastrais, uso, satisfação, reset de senha e ajuste de limite — o reset de senha e a escrita de limites exigem privilégio de serviço e validação de admin no código.
- Ajuste de limite grava em `profiles.custom_searches_limit` / `bonus_searches` mais um registro em `account_audit_log`.
- LTV: novo helper em `src/lib/adminMetrics.ts` (`fetchRevenuePerUser`) reaproveitado pelo cockpit.
- Arquivos editados: `src/hooks/useAdminDashboard.ts`, `src/lib/adminMetrics.ts`, `src/components/admin/pix-billing/PixDashboardTab.tsx`, `src/components/admin/pix-billing/PixInvoicesTab.tsx`, `src/pages/admin/AdminMrrAudit.tsx`, `supabase/functions/audit-mrr/index.ts`, `src/pages/admin/AdminTrials.tsx`, `src/pages/admin/AdminUserDetail.tsx`, `src/components/admin/AdminSidebar.tsx`, `src/App.tsx`.
