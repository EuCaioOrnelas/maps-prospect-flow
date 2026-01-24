# Wiize - Documentação do Sistema

## Visão Geral
Wiize é uma plataforma SaaS de prospecção B2B com WhatsApp integrado, construída com React + TypeScript + Supabase.

## Arquitetura

### Frontend
- **React 18** + **TypeScript** - Framework principal
- **Vite** - Build tool
- **TailwindCSS** + **shadcn/ui** - Estilização
- **React Router** - Roteamento
- **React Query** - Gerenciamento de estado do servidor
- **Framer Motion** - Animações

### Backend
- **Supabase** - Database (PostgreSQL), Auth, Edge Functions, Storage
- **Stripe** - Pagamentos e assinaturas
- **Evolution API** - Integração WhatsApp

## Estrutura de Pastas

```
src/
├── components/         # Componentes React reutilizáveis
│   ├── admin/          # Componentes do painel admin
│   ├── agents/         # Componentes de agentes de IA
│   ├── crm/            # Componentes do CRM
│   ├── landing/        # Componentes da landing page
│   ├── layout/         # Layout (sidebar, header, etc)
│   ├── notifications/  # Sistema de notificações
│   ├── onboarding/     # Fluxo de onboarding
│   ├── ui/             # Componentes base (shadcn)
│   ├── warming/        # Aquecimento de números
│   └── whatsapp/       # Campanhas WhatsApp
├── contexts/           # React Contexts (Auth, Audio, etc)
├── hooks/              # Custom hooks
├── integrations/       # Integrações externas (Supabase client)
├── lib/                # Utilitários
└── pages/              # Páginas/rotas

supabase/
├── functions/          # Edge Functions (backend serverless)
├── migrations/         # Migrações do banco de dados
└── config.toml         # Configuração do Supabase
```

## Fluxos Principais

### Autenticação
1. Signup: `src/pages/Signup.tsx` → `AuthContext.signUp()` → Supabase Auth
2. Login: `src/pages/Login.tsx` → `AuthContext.signIn()` → Supabase Auth
3. Checkout Success: `src/pages/CheckoutSuccess.tsx` → Signup com `skipFraudCheck=true`

### Assinaturas (Stripe)
1. Checkout: `Upgrade.tsx` → `create-checkout` edge function → Stripe Checkout
2. Webhook: Stripe → `stripe-webhook` edge function → Atualiza `profiles.plan`
3. Verificação: `check-subscription` edge function → Valida assinatura

### Campanhas WhatsApp
1. Criação: `WhatsAppCampaign.tsx` → Tabela `whatsapp_campaigns`
2. Processamento: `campaign-processor` edge function → Evolution API
3. Monitoramento: Realtime via Supabase channels

## Componentes Principais

### AuthContext (`src/contexts/AuthContext.tsx`)
- Gerencia estado de autenticação
- Fornece `signUp`, `signIn`, `signOut`
- Verifica trial expirado e bloqueio de usuário
- `skipFraudCheck` param para signups pós-checkout

### Admin Dashboard (`src/pages/Admin.tsx`)
- Métricas de usuários e receita
- Gráficos de vendas e churn
- Gerenciamento de usuários
- Status de APIs (SerpAPI, Evolution)

## Edge Functions

| Função | Descrição |
|--------|-----------|
| `create-checkout` | Cria sessão de checkout Stripe |
| `stripe-webhook` | Processa eventos do Stripe |
| `check-subscription` | Verifica status da assinatura |
| `get-stripe-mrr` | Calcula MRR real do Stripe |
| `campaign-processor` | Processa campanhas WhatsApp |
| `evolution-*` | Funções da Evolution API |
| `search-leads` | Busca leads via SerpAPI |

## Segurança

### RLS (Row Level Security)
- Todas as tabelas têm RLS habilitado
- Políticas baseadas em `auth.uid()`
- Admins verificados via `is_current_user_admin()`

### Prevenção de Fraude
- `check_signup_fraud()` - Limita contas free por dispositivo/IP
- `skipFraudCheck` para signups pós-pagamento
- Fingerprint + IP coletados no signup

### Proteção de Campos
- Trigger `protect_sensitive_profile_fields` impede alteração de `plan`, `searches_limit` por usuários

## Variáveis de Ambiente

```env
VITE_SUPABASE_URL=         # URL do projeto Supabase
VITE_SUPABASE_PUBLISHABLE_KEY=  # Chave pública
VITE_SUPABASE_PROJECT_ID=  # ID do projeto
```

## Secrets (Edge Functions)

| Secret | Uso |
|--------|-----|
| `STRIPE_SECRET_KEY` | API do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Validação de webhooks |
| `EVOLUTION_API_KEY` | API WhatsApp |
| `EVOLUTION_API_URL` | URL da Evolution |
| `SERP_API_KEY_*` | Chaves SerpAPI (1-6) |
| `OPENAI_API_KEY` | API OpenAI para agentes |

## Troubleshooting

### Gráficos vazios no Admin
- Causa: Tabela `subscription_events` sem dados históricos
- Solução: MRR real vem do Stripe (`get-stripe-mrr`), gráficos de vendas dependem de eventos

### Erro no signup pós-checkout
- Causa: Verificação de fraude bloqueando
- Solução: Usar `signUp(email, password, name, true)` com `skipFraudCheck=true`

### "Auth session missing"
- Causa: Token expirado
- Solução: Retry automático implementado em `AuthContext`
