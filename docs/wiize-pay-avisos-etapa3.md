# Integração Wiize ↔ Wiize Pay — Etapa 3: Avisos de pagamento

Status: lado Wiize pronto. Lado Wiize Pay **READY_FOR_WIIZE_PAY**.

## Endereço que o Wiize Pay deve chamar
`POST https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-pay-webhook`

## Assinatura (obrigatória)
Headers:
- `X-Wiize-Pay-Timestamp`: segundos Unix (tolerância ±5 min)
- `X-Wiize-Pay-Nonce`: 16–128 caracteres `[A-Za-z0-9_-]`, único por envio
- `X-Wiize-Pay-Signature`: `sha256=<hex>` = HMAC-SHA256(`WIIZE_PAY_WEBHOOK_SECRET`, `${timestamp}.${nonce}.${corpo_bruto}`)

## Corpo
```json
{ "event_id": "evt_...", "type": "charge.paid",
  "data": { "charge_id": "<id do Wiize Pay>", "external_reference": "<id do pedido no Wiize>", "amount_cents": 12990, "paid_at": "2026-10-01T12:00:00Z" } }
```
Tipos: `charge.paid`, `charge.pending`, `charge.overdue`, `charge.cancelled`, `charge.failed`, `charge.refunded`.

## Regras aplicadas no Wiize
- Assinatura errada, horário fora da janela ou nonce inválido → 401.
- `event_id` e `nonce` de uso único: repetição responde 200 sem reprocessar (o Wiize Pay pode reenviar com segurança).
- Cobrança precisa existir, bater `external_reference` + `charge_id` e a conta precisa estar conectada.
- Cobrança paga não muda de estado, exceto estorno.
- Atualiza o status da cobrança e grava no histórico do lead ("Pagamento confirmado no Wiize Pay…").
- Nenhum dado de cartão é aceito ou guardado.

## Para ativar
1. Gerar um secret aleatório de 32+ caracteres e configurar `WIIZE_PAY_WEBHOOK_SECRET` no Wiize e no Wiize Pay.
2. Wiize Pay envia um evento de teste assinado; conferir o status no card da venda e no histórico do lead.
3. Testar reenvio (deve ser ignorado) e assinatura errada (401).
