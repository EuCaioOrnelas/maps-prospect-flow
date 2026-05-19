
# Order Bumps Funcionais — Plano Completo

## Decisões já fechadas
- **Anual:** bumps escondidos no checkout/upgrade anual (Stripe não permite mistura `month` + `year` na mesma subscription).
- **Falha de pagamento do bump:** só remove o bump (limites voltam ao do plano base). Plano principal continua ativo.
- **Gestão pós-compra:** botão "Gerenciar add-ons" dentro da página de perfil/assinatura, com modal listando os bumps ativos e permitindo adicionar/remover.

## Catálogo (preços confirmados)

| Bump            | Mensal  | Stripe Price ID                    | Planos       |
|-----------------|---------|------------------------------------|--------------|
| +1 número WA    | R$ 96   | `price_1TYdiXK8CM0R6xMMqnhxGM1V`   | start, growth |
| +1k contatos    | R$ 48   | `price_1TYdkPK8CM0R6xMMXHTfihdw`   | start, growth |
| +1k oportunid.  | R$ 196  | `price_1TYdknK8CM0R6xMM9TXjGFf5`   | growth (only) |

Asaas: sem price ID, soma direto no `value` da assinatura mensal.

---

## 1. Banco de dados (migration)

Adicionar 3 colunas em `public.profiles` para guardar a quantidade comprada de cada bump:
```
extra_numbers              integer NOT NULL DEFAULT 0
extra_contacts_packs       integer NOT NULL DEFAULT 0   -- cada pack = 1.000 contatos
extra_opportunities_packs  integer NOT NULL DEFAULT 0   -- cada pack = 1.000 oportunidades
```

E uma tabela de auditoria leve:
```
order_bump_events (id, user_id, bump_id, delta, source, stripe_subscription_id, created_at)
```
`source` ∈ `checkout|upgrade|webhook_revoke|webhook_grant`.

---

## 2. `src/config/orderBumps.ts`
Preencher `monthlyPriceCents` (9600 / 4800 / 19600) e adicionar `stripePriceIdMonthly` em cada bump. Marcar `annual: null` para deixar explícito que não há price anual.

---

## 3. Edge functions

### 3a. `create-stripe-subscription` (existente)
- Aceita novo param `bumps: { numbers, contacts, opportunities }`.
- Se `billingPeriod === 'annual'` → ignora bumps.
- Monta `items` com plano + 1 item por bump com `quantity > 0`, usando o price ID mapeado.
- Grava as quantidades em `profiles.extra_*` após sucesso.
- Insere em `order_bump_events` (source=`checkout`).

### 3b. `create-asaas-subscription` (existente)
- Aceita mesmo param `bumps`.
- Bloqueia bumps quando anual.
- Soma `bumps.numbers*96 + bumps.contacts*48 + bumps.opportunities*196` no `value`.
- Grava `profiles.extra_*` igual ao Stripe.

### 3c. `update-subscription-bumps` (novo)
Para o fluxo "Gerenciar add-ons":
- Input: `{ bumps: { numbers, contacts, opportunities } }` (estado desejado).
- Busca a subscription Stripe ativa do user; aplica diff em `subscription.items` (cria/atualiza/remove items com proration).
- Atualiza `profiles.extra_*`.
- Para usuários Asaas: atualiza o `value` da assinatura recorrente via API e ajusta `profiles.extra_*`.
- Bloqueia se subscription for anual.

### 3d. `stripe-webhook` (existente) — adicionar handlers
- `invoice.payment_failed` / `customer.subscription.updated` (status `past_due`/`unpaid`): se a invoice tinha items de bump, remove esses items da subscription e zera `profiles.extra_*` correspondentes (e grava `order_bump_events` source=`webhook_revoke`). Plano principal intacto.
- `invoice.payment_succeeded`: reconcilia `profiles.extra_*` a partir dos items atuais da subscription (source=`webhook_grant`) — garante consistência.

---

## 4. Frontend — checkout

### 4a. `CheckoutCard.tsx` e `CheckoutPix.tsx`
- Esconder `OrderBumpsCard` quando `billingPeriod === 'annual'` (mostrar um aviso curto: "Add-ons disponíveis apenas no plano mensal por enquanto").
- Mostrar valor real (R$96/48/196) — virá do config atualizado.
- Enviar `bumps` no payload para a edge function.

### 4b. `OrderBumpsCard.tsx`
- Já existe. Só consumir os novos preços do config.

---

## 5. Frontend — gestão pós-compra

### 5a. `src/pages/Profile.tsx` (ou tela atual de assinatura)
- Novo card "Add-ons / Expansões" mostrando os bumps ativos (`profiles.extra_*`) com valor total mensal extra.
- Botão "Gerenciar add-ons" abre `ManageAddonsDialog`.

### 5b. `src/components/billing/ManageAddonsDialog.tsx` (novo)
- Mesma UI do `OrderBumpsCard` (checkboxes + steppers), pré-preenchida com o que o user já tem.
- Botão "Atualizar assinatura" chama `update-subscription-bumps`.
- Bloqueia/avisa se plano for anual.
- Bloqueia bump `opportunities` se plano ≠ growth.

---

## 6. Limites do app — aplicar `extra_*`

Atualizar os hooks/funções que leem limites para somar a expansão:

| Recurso        | Onde hoje                              | Como passa a ler                                   |
|----------------|----------------------------------------|----------------------------------------------------|
| Contatos CRM   | `useContactLimit.ts`                   | `limiteBase + extra_contacts_packs * 1000`         |
| Números WA     | `useWhatsAppNumbers.ts` / Meta números | `whatsapp_numbers_limit + extra_numbers`           |
| Oportunidades  | `profiles.searches_limit` (gasto mensal) | `searches_limit + extra_opportunities_packs * 1000` em tempo de leitura nos hooks `useDashboardKPIs`, `useCockpitForecast`, e onde for comparado |

UI: mostrar "X / Y (+N add-on)" onde aplicável.

---

## 7. Memória do projeto
Salvar um `mem://features/billing/order-bumps` com:
- Quais bumps existem, preços, price IDs
- Regra "só monthly por enquanto"
- Como o webhook revoga os bumps em falha de pagamento
- Tabelas e colunas adicionadas

---

## Arquivos que serão editados/criados

**Criados**
- `supabase/functions/update-subscription-bumps/index.ts`
- `src/components/billing/ManageAddonsDialog.tsx`
- migration: colunas em `profiles` + tabela `order_bump_events`
- `mem://features/billing/order-bumps`

**Editados**
- `src/config/orderBumps.ts` (preços + price IDs)
- `src/pages/CheckoutCard.tsx` (bloqueio anual + envio de bumps)
- `src/pages/CheckoutPix.tsx` (idem)
- `src/components/checkout/OrderBumpsCard.tsx` (label de bloqueio anual)
- `supabase/functions/create-stripe-subscription/index.ts` (items múltiplos + persistência)
- `supabase/functions/create-asaas-subscription/index.ts` (soma value + persistência)
- `supabase/functions/stripe-webhook/index.ts` (revogar bumps em falha)
- `src/pages/Profile.tsx` (card add-ons + abre dialog)
- `src/hooks/useContactLimit.ts` (soma `extra_contacts_packs * 1000`)
- `src/hooks/useWhatsAppNumbers.ts` (soma `extra_numbers`)
- `src/hooks/useDashboardKPIs.ts` + `useCockpitForecast.ts` (soma `extra_opportunities_packs * 1000` no limite)
- `src/integrations/supabase/types.ts` (auto, após migration)

---

## Ordem de execução
1. Migration (colunas + tabela auditoria)
2. Config + edge functions de criação (Stripe + Asaas)
3. UI checkout (bloqueio anual + envio do payload)
4. Edge `update-subscription-bumps` + Dialog `ManageAddonsDialog` no Profile
5. Webhook de revogação
6. Hooks de limite somando `extra_*`
7. Memória do projeto
8. Teste manual (curl edge function) com um user de teste
