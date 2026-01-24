# Fluxo de Compra e Criação de Conta

## Visão Geral

Este documento descreve o fluxo completo de compra e criação de conta no Wiize.

## Cenários

### 1. Signup Normal (Gratuito)
```
Usuário → /signup → AuthContext.signUp() → Fraud Check → Supabase Auth → Profile criado
```

### 2. Compra como Guest (Sem Conta)
```
Usuário → /upgrade → EmailCaptureModal → create-checkout (guestEmail) → Stripe Checkout
→ Pagamento → stripe-webhook (atualiza profile se existir, ou aguarda) 
→ /checkout-success → Signup com skipFraudCheck=true → Profile vinculado ao plano
```

### 3. Compra Logado
```
Usuário logado → /upgrade → create-checkout (com auth) → Stripe Checkout
→ Pagamento → stripe-webhook → Atualiza profile automaticamente → /checkout-success
```

## Arquivos Envolvidos

### Frontend
- `src/pages/Upgrade.tsx` - Página de planos e checkout
- `src/pages/CheckoutSuccess.tsx` - Página pós-pagamento com signup
- `src/pages/CheckoutFailed.tsx` - Página de erro de pagamento
- `src/pages/Signup.tsx` - Signup normal (gratuito)
- `src/contexts/AuthContext.tsx` - Lógica de autenticação

### Edge Functions
- `supabase/functions/create-checkout/` - Cria sessão Stripe
- `supabase/functions/stripe-webhook/` - Processa eventos do Stripe
- `supabase/functions/check-subscription/` - Verifica assinatura

### Banco de Dados
- `profiles` - Dados do usuário (plano, limites, etc)
- `subscription_events` - Log de eventos de assinatura

## Fluxo Detalhado: Guest → Checkout → Signup

### 1. Usuário clica em "Assinar" sem estar logado
```typescript
// src/pages/Upgrade.tsx
const handleUpgrade = (planKey: string) => {
  if (user) {
    handleCheckout(planKey);
  } else {
    setSelectedPlanKey(planKey);
    setEmailModalOpen(true); // Abre modal para capturar email
  }
};
```

### 2. Email capturado, checkout iniciado
```typescript
// create-checkout edge function
// Recebe guestEmail e cria sessão Stripe com esse email
const sessionOptions = {
  customer_email: guestEmail,
  // ...
  success_url: `${origin}/checkout-success`,
};
```

### 3. Stripe Webhook processa pagamento
```typescript
// stripe-webhook edge function
// Se profile existe com esse email → atualiza plano
// Se não existe → pagamento fica pendente (será vinculado no signup)
```

### 4. Usuário chega em /checkout-success
```typescript
// src/pages/CheckoutSuccess.tsx
// Formulário de signup que chama AuthContext.signUp com skipFraudCheck=true
const { error } = await signUp(email, password, name, true);
```

### 5. AuthContext.signUp com skipFraudCheck
```typescript
// src/contexts/AuthContext.tsx
const signUp = async (email, password, name, skipFraudCheck = false) => {
  // Se skipFraudCheck=true, pula verificação de fraude (usuario já pagou)
  if (!skipFraudCheck) {
    // Coleta fingerprint/IP
    // Chama check_signup_fraud()
  }
  // Cria usuário no Supabase Auth
  // Profile é criado automaticamente via trigger
  // Stripe webhook já atualizou o plano (ou vai atualizar)
};
```

## Proteção contra Fraude

### Para contas gratuitas:
- Limite de 1 conta free por fingerprint (dispositivo)
- Limite de 2 contas free por IP
- Verificação de trial já utilizado

### Para contas pagas (pós-checkout):
- `skipFraudCheck=true` - Não verifica fraude
- Justificativa: Usuário já pagou, não faz sentido bloquear

## Logs e Debug

### Frontend (CheckoutSuccess)
- Progress steps visuais
- Debug panel com logs copiáveis
- Exibe exatamente onde o processo falhou

### AuthContext
- Logs detalhados no console com timestamps
- `[SIGNUP Xms] STEP_NAME` format

## Troubleshooting

### "Usuário comprou mas não consegue criar conta"
1. Verificar se email usado no checkout == email do signup
2. Verificar se skipFraudCheck está sendo passado
3. Verificar logs no debug panel

### "Plano não foi vinculado"
1. Verificar se stripe-webhook processou o evento
2. Verificar subscription_events no banco
3. Forçar refresh com check-subscription
