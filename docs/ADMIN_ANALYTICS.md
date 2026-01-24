# Sistema de Admin e Analytics

## Visão Geral

O painel administrativo (`/admin`) fornece métricas e gerenciamento de usuários.

## Arquivos

- `src/pages/Admin.tsx` - Dashboard principal
- `src/components/admin/` - Componentes do admin
- `supabase/functions/get-stripe-mrr/` - Calcula MRR real do Stripe

## Métricas

### Financeiras (Stripe)
- **MRR Líquido**: Receita mensal recorrente real do Stripe
- **Assinantes Ativos**: Quantidade de assinaturas ativas
- **Total Reembolsado**: Soma de reembolsos
- **Taxa de Cancelamento**: % de churn

### Usuários
- **Ativos 7 dias**: Usuários que acessaram na última semana
- **Ativos 30 dias**: Usuários que acessaram no último mês
- **Distribuição de Planos**: Pie chart por plano

## Gráficos

### Evolução do MRR (Stripe)
- Dados vêm de `get-stripe-mrr` edge function
- Agrupa por mês de pagamento (invoice.paid_at)
- Exclui admins e reembolsos

### Vendas, Upgrades e Cancelamentos
- Dados vêm da tabela `subscription_events`
- Registrado pelo `stripe-webhook`
- **IMPORTANTE**: Só mostra dados a partir da configuração

## Tabela subscription_events

Esta tabela armazena histórico de eventos de assinatura:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| event_type | text | checkout_completed, subscription_upgrade, etc |
| email | text | Email do usuário |
| previous_plan | text | Plano anterior |
| new_plan | text | Novo plano |
| new_searches_limit | int | Novo limite de buscas |
| carry_over | int | Buscas transferidas (upgrade) |
| metadata | jsonb | Dados extras (amount_paid, etc) |

## Troubleshooting

### Gráficos vazios
**Causa**: Poucos eventos em `subscription_events`
**Verificar**: `SELECT COUNT(*) FROM subscription_events`
**Solução**: Dados históricos não migrados. MRR real vem do Stripe.

### MRR não carrega
**Causa**: Erro na edge function ou STRIPE_SECRET_KEY
**Verificar**: Logs da função `get-stripe-mrr`
**Solução**: Verificar secret key configurada

### Usuários não aparecem
**Causa**: RLS ou filtros
**Verificar**: Verificar se é admin via `is_current_user_admin()`
