# Integração Wiize ↔ Wiize Pay — Etapa 2: Venda do CRM → contrato e cobrança

Status: lado Wiize pronto. Lado Wiize Pay **READY_FOR_WIIZE_PAY**.

## Fluxo
1. Na venda do lead, dono/admin clica em "Cobrar com Wiize Pay" (só aparece com conta conectada na Etapa 1).
2. Janela de revisão (cliente, valor, tipo, meses, formas de pagamento, vencimento). Confirmação obrigatória.
3. Função `wiize-pay-charge` (action `create`) grava `wiize_pay_charge_requests` com cópia fixa da venda + checksum SHA-256 + chave de idempotência (clique duplo não duplica).
4. Sem `WIIZE_PAY_API_BASE_URL`/`WIIZE_PAY_CHECKOUT_ORIGIN`: status `awaiting_wiize_pay`, nada é chamado.
5. Com secrets: servidor usa o access token da Etapa 1 (renova via refresh_token) e chama o Wiize Pay; recebe link de checkout de uso único, validado contra `WIIZE_PAY_CHECKOUT_ORIGIN`, devolvido uma vez ao navegador e nunca gravado.
6. Popup do Wiize Pay; ao fechar, o Wiize consulta o status (`status`). Status em tempo real: Etapa 3 (webhook).

## Contrato esperado do Wiize Pay (a implementar lá)
- `POST {BASE}/v1/charges` — headers `Authorization: Bearer <access_token>`, `Idempotency-Key`, `X-Wiize-Checksum`. Corpo: `external_reference`, `schema_version`, `deal {title, type one_time|recurring, amount_cents, currency BRL, installments_or_months, total_cents, start_date, end_date}`, `customer {company_name, contact_name, email, phone, city}`, `payment {methods[pix|boleto|credit_card], due_date}`. Resposta: `{ id, status, checkout_url, checkout_expires_at }`.
- `GET {BASE}/v1/charges/{id}` → `{ id, status }` (pending/paid/cancelled/failed…).
- `POST {BASE}/v1/charges/{id}/cancel`.
- Escopo novo sugerido: `charges.write` (pedir no próximo reconsentimento).
- Checkout: exige login/2FA do Wiize Pay quando necessário; coleta cartão direto no Wiize Pay (PCI fica lá).

## Secrets novos
`WIIZE_PAY_API_BASE_URL` (https), `WIIZE_PAY_CHECKOUT_ORIGIN` (https, ex.: `https://pay.exemplo.com`).

## Segurança
JWT validado, apenas dono/admin cria/cancela, vendedores só visualizam, zod, rate limit por ação, isolamento por conta (owner), RLS só leitura para membros (escrita só pela função), tokens nunca no navegador, auditoria em `integration_export_audit_logs` sem tokens/dados sensíveis.

## Checklist de produção
1. Wiize Pay implementa os 3 endpoints e o checkout. 2. Configurar os 2 secrets. 3. Testar em conta de teste: criar, clique duplo, popup, fechar, status, cancelar. 4. Testar vendedor (403) e conta de outro tenant (404). 5. Conferir auditoria.
