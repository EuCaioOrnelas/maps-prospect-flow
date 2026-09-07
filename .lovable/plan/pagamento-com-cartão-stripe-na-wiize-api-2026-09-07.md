# Pagamento com cartão (Stripe) na Wiize API

## Respondendo sua dúvida sobre como cobrar

Não crie "produto/preço fixo" nem assinatura recorrente na Stripe para os créditos.
A recarga é **avulsa, com valor livre**, exatamente como já funciona no PIX:

- O usuário escolhe um valor em reais (mínimo R$ 30, máximo R$ 5.000).
- A cobrança é criada na hora com esse valor (em centavos), sem catálogo de produtos.
- Os tokens são calculados no servidor: R$ 1,00 = 100 tokens (1 token = R$ 0,01).
- Não é preciso "vender de 100 em 100": qualquer valor vira tokens proporcionais.
  Para simplificar, o campo aceita apenas valores inteiros em reais (R$ 30, R$ 31, R$ 50...),
  então nunca sobra fração de token.

Recorrência entra só depois, na recarga automática (já existe a tela): quando o saldo
cai abaixo do limite, cobramos o cartão salvo automaticamente — mas continua sendo
uma cobrança avulsa disparada por nós, não uma assinatura da Stripe.

## Como fica para o usuário

1. Abre "Comprar créditos", escolhe o valor e a forma: PIX (atual) ou Cartão (novo).
2. Primeira compra no cartão: preenche os dados, aceita os termos e passa pela
   confirmação do banco (3D Secure), com o aviso explicando o que vai acontecer.
3. Se marcar "salvar cartão para compras futuras", nas próximas vezes ele vê o cartão
   salvo (bandeira + final) e compra em 1 clique, sem digitar nada.
4. Crédito cai na carteira assim que o pagamento é confirmado — mesmo se ele fechar a aba.
5. Em "Formas de pagamento" ele lista, define o padrão e remove cartões.

## Detalhes técnicos

**Banco**
- `wiize_api_payment_methods`: user_id, stripe_payment_method_id, brand, last4, exp,
  is_default, created_at. RLS por dono + GRANTs; escrita apenas por service role.
- `wiize_api_topups`: novas colunas `provider` ('pix' | 'card'),
  `stripe_payment_intent_id`, `stripe_customer_id`; índice único no payment intent.
- Guardar `stripe_customer_id` no perfil da conta API (`wiize_api_profiles`).

**Edge functions** (padrão do projeto: só `index.ts`, `verify_jwt = false`, auth validada em código)
- `wiize-api-card` (nova): ações
  - `setup`: cria/reusa Customer, devolve `client_secret` de PaymentIntent com
    `amount` calculado no servidor a partir do valor pedido (nunca confiar no cliente),
    `setup_future_usage: 'off_session'` quando o usuário optar por salvar,
    `automatic_payment_methods` habilitado (3DS entra quando o banco exigir; a Stripe
    aplica o desafio automaticamente e no Brasil ele é obrigatório na primeira compra).
  - `charge_saved`: cobrança 1-clique com `payment_method` salvo + `off_session: true`;
    se a Stripe pedir autenticação, devolve o `client_secret` para o front concluir o 3DS.
  - `list` / `set_default` / `remove`: gestão dos cartões salvos.
  - Reaproveita os mesmos limites, antifraude e rate limit já usados no topup PIX.
- `stripe-webhook` (existente): tratar `payment_intent.succeeded` e
  `payment_intent.payment_failed` com `externalReference` de topup — crédito idempotente
  via `wiize_api_credit_wallet` (chave `topup_<id>`), igual ao fluxo Asaas. Também
  `charge.refunded` → estorno de tokens.
- `wiize-api-cron`: reconciliar também intents de cartão pendentes (mesma janela de 15 min).

**Frontend**
- `BuyCreditsDialog.tsx`: seletor PIX / Cartão; no cartão, reaproveitar
  `StripeCardForm.tsx` e `CardVerificationNoticeDialog.tsx` que já existem no projeto,
  com `stripe.confirmCardPayment` para o 3DS e checkbox "salvar cartão".
- `ApiBilling.tsx`: aba "Formas de pagamento" real (lista, padrão, remover, adicionar).
- `AutoReloadDialog.tsx`: só habilita recarga automática se houver cartão padrão salvo.
- `useWiizeApi.ts`: hooks para os cartões e para a compra com cartão.

**Segurança**
- Valor e tokens sempre recalculados no servidor; front só sugere.
- Nenhum dado de cartão passa pelo nosso backend (Stripe Elements + PaymentMethod id).
- Crédito só pelo webhook/reconciliação, nunca por retorno do navegador.
