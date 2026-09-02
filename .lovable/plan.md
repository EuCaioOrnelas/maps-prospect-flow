# Novo padrão de planos (somente para NOVOS clientes)

Confirme se o entendimento abaixo está correto antes de eu implementar.

## 1. O que muda (a partir da data de corte)

| Item | Atendimento (start) | Growth IA (growth) |
|---|---|---|
| Preço mensal | R$ 196 (sem mudança) | **R$ 396** (era R$ 696) |
| Oportunidades / mês | não incluso | **1.000** (era 3.000) |
| Números WhatsApp | **1** (era 2) | **2** (era 5) |
| Usuários extras (além do dono) | **1** → 2 assentos totais | **2** → 3 assentos totais |
| Contatos no CRM | 1.000 (sem mudança) | 10.000 (sem mudança) |

Price ID Stripe do novo Growth mensal: `price_1UBNs5K8CM0R6xMMJAnZEQdm`

## 2. Clientes antigos (grandfathering)

- Nada muda para quem já é cliente: continuam com R$ 696 / 3.000 oportunidades / 5 números / 5 usuários.
- O corte é por `profiles.created_at` (mesmo mecanismo já usado no rebrand de 2026-05-18). Data de corte proposta: **hoje**.
- Os price IDs antigos continuam mapeados nos webhooks (Stripe/Asaas) e no MRR — nenhuma assinatura ativa quebra.
- Renovação de cliente antigo mantém o limite antigo (o webhook lê o plano + a data de criação do perfil).

## 3. Add-ons (continuam disponíveis e ficam como padrão de expansão)

| Add-on | Incremento | Preço/mês | Disponível em |
|---|---|---|---|
| +1 número WhatsApp | 1 | R$ 96 | Atendimento e Growth |
| +1.000 contatos CRM | 1.000 | R$ 48 | Atendimento e Growth |
| +1.000 oportunidades | 1.000 | R$ 196 | Growth |
| **+1 usuário (novo)** | 1 | **a definir** | Atendimento e Growth |

Hoje **não existe** add-on de usuário: os assentos são fixos pelo plano. Para permitir comprar usuários preciso de:
- o preço mensal por usuário extra;
- o price ID do Stripe desse add-on;
- e criar a coluna `extra_seats` em `profiles` (mesmo padrão de `extra_numbers` / `extra_contacts_packs` / `extra_opportunities_packs`).

O limite passa a ser calculado como: **limite do plano + add-ons comprados**, em números, usuários, contatos e oportunidades.

## 4. Perguntas antes de implementar

1. O Growth anual muda também? Hoje é R$ 596/mês (R$ 7.152/ano) com price ID próprio. Qual o novo valor anual e o price ID?
2. Preço e price ID do add-on de usuário extra.
3. O Atendimento continua em R$ 196 com o mesmo price ID? (só reduz para 1 número e 1 usuário extra)
4. Data de corte = hoje, certo? Quem entrar em trial antes de hoje entra no padrão antigo.

## 5. Onde vou mexer (resumo técnico)

- Regras centrais: `src/lib/planAccess.ts` (nova data de corte + limites de oportunidades/números/assentos por geração), `src/lib/accountPermissions.ts` (assentos + add-on), `src/config/orderBumps.ts` (add-on de usuário).
- Páginas de venda/checkout/trial: `PricingSection.tsx`, `PlanComparisonTable.tsx`, `SignupChoosePlan.tsx`, `SignupWithCard.tsx`, `CheckoutCard.tsx`, `CheckoutPix.tsx`, `Upgrade.tsx`, `UpgradePromo.tsx`, `TrialExpired.tsx`, `HelpCenterFAQ.tsx`.
- Backend (edge functions): `create-stripe-subscription`, `create-stripe-trial`, `create-trial-with-card`, `create-asaas-subscription`, `upgrade-subscription`, `stripe-webhook`, `asaas-webhook`, `check-subscription`, `get-stripe-mrr`, `update-subscription-bumps`, `account-create-member`.
- Migração: coluna `extra_seats` em `profiles` (se o add-on de usuário for aprovado).
