## Problema identificado

O checkout cartão tem uma falha crítica em cascata que explica todos os bugs:

1. **3DS ignorado** — `create-stripe-subscription` usa `payment_behavior: "default_incomplete"`. Quando o banco pede confirmação 3DS, o Stripe retorna `requires_action` e a subscription fica `incomplete`. O front (`CheckoutCard.tsx`) ignora isso e manda o usuário para `/checkout-success`.

2. **Conta criada sem vínculo com Stripe** — Em `CheckoutSuccess.tsx`, o `signUp` só envia `{ name }`. O trigger `handle_new_user` cai no ELSE de "cadastro legado sem cartão" e cria o profile como **free**, sem `payment_provider`, sem `extra_*`, sem `subscription_current_period_end`.

3. **Resultado visível ao usuário:**
   - Perfil mostra "PIX" (ou nada — `payment_provider` null cai em fallback)
   - Oportunidades em 120 (limite do free)
   - Gerenciar Assinatura vazio (não tem provider stripe, asaas customer não existe)
   - Bumps não aplicados (`extra_numbers/contacts/opportunities` = 0)
   - Acesso liberado sem pagamento confirmado

## Mudanças

### 1. `supabase/functions/create-stripe-subscription/index.ts`
- Buscar dados do cartão (last4/brand) antes de retornar
- Retornar também `cardLast4`, `cardBrand`, `trialEnd` (current_period_end da invoice/subscription)

### 2. `src/pages/CheckoutCard.tsx`
- Após receber resposta com `clientSecret` e `requiresAction`, chamar `stripe.confirmCardPayment(clientSecret)` para forçar o 3DS
- Se a confirmação falhar ou status final não for `active`/`trialing`, mostrar erro e **NÃO** navegar para success
- Salvar payload completo em `sessionStorage.checkoutPurchase` (planKey, billingPeriod, subscriptionId, customerId, bumps, cardLast4, cardBrand, trialEnd, isTrial=false)
- Só navegar para `/checkout-success` quando o pagamento estiver confirmado

### 3. `src/pages/CheckoutSuccess.tsx`
- Ler `sessionStorage.checkoutPurchase` no submit
- Passar metadata completa no `signUp`:
  ```
  trial_with_card: 'true' (reaproveita lógica existente)
  trial_plan_chosen: planKey
  trial_billing_period: 'monthly' | 'annual'
  stripe_customer_id, stripe_subscription_id
  trial_will_charge_at: trialEnd
  trial_card_last4, trial_card_brand
  extra_numbers, extra_contacts_packs, extra_opportunities_packs
  ```
- Bloquear submit se `sessionStorage.checkoutPurchase` ausente (usuário não pagou)
- Limpar sessionStorage após sucesso

### 4. Migration: atualizar `handle_new_user`
- Persistir `extra_numbers`, `extra_contacts_packs`, `extra_opportunities_packs` quando vierem em metadata
- Já existe lógica para `trial_with_card` que cobre plan/limit/subscription_end — vamos reusar

### 5. `supabase/functions/manage-subscription/index.ts` (verificação)
- Garantir que mostra subscriptions e payments do Stripe pelo `stripe_customer_id` do profile, incluindo line items dos bumps (mostrar "Plano Growth + 6 números + 10K leads" etc).

## Arquivos editados
- `supabase/functions/create-stripe-subscription/index.ts`
- `src/pages/CheckoutCard.tsx`
- `src/pages/CheckoutSuccess.tsx`
- Migration SQL para `handle_new_user`
- `supabase/functions/manage-subscription/index.ts` (revisar exibição de bumps)
