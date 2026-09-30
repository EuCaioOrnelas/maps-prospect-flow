# Guia de implementação — Wiize dentro do Wiize Pay

Este guia é para o projeto **Wiize Pay**. Ele descreve tudo o que o Wiize Pay precisa ter para se conectar ao Wiize (CRM) com segurança. O lado Wiize já está pronto (Etapas 1, 2 e 3) e aguarda apenas estes itens.

Princípio: **o Wiize Pay nunca recebe senhas do Wiize, nunca acessa o banco do Wiize, e o Wiize nunca vê dados de cartão.** Toda troca é entre servidores, com tokens de curta duração, assinatura e registro de auditoria.

---

## Visão geral

```text
 Usuário            Wiize (CRM)                    Wiize Pay
   |  Conectar  -->  gera state+PKCE  ---------->  /oauth/authorize (login+2FA, Autorizar)
   |                 <------ redirect ?code&state --
   |                 troca code por tokens ------->  /oauth/token
   |  Cobrar venda-> POST /v1/charges (Bearer) --->  cria cobrança, devolve checkout_url
   |  popup ------------------------------------->   checkout (PIX/boleto/cartão)
   |                 <------ webhook assinado -----  charge.paid / overdue / ...
```

---

## Parte 1 — Cliente OAuth para o Wiize

### 1.1 Tabelas (no Wiize Pay)
- `oauth_clients`: id, client_id (público), client_secret_hash (argon2/bcrypt/PBKDF2 — nunca texto puro), name, redirect_uris text[] (lista exata), allowed_scopes text[], active.
- `oauth_authorization_codes`: code_hash, client_id, user_id, account_id, redirect_uri, scopes, code_challenge, expires_at (≤ 60 s), used_at.
- `oauth_tokens`: access_token_hash, refresh_token_hash, client_id, user_id, account_id, scopes, access_expires_at (≤ 1 h), refresh_expires_at (≤ 30 dias), revoked_at, rotated_from.
- Todas com RLS ligado e **sem acesso pelo navegador** (só a função do servidor lê/grava). Guardar apenas o hash SHA-256 dos codes/tokens.

### 1.2 Cadastrar o Wiize como cliente
- Gerar `client_id` e `client_secret` fortes (48+ caracteres aleatórios). O secret é mostrado **uma única vez** e deve ser colado no Wiize como `WIIZE_PAY_CLIENT_SECRET`.
- Redirect URIs permitidas (comparação **exata**, sem curinga):
  - `https://wiize.com.br/configuracoes/integracoes/wiize-pay/callback`
  - `https://www.wiize.com.br/configuracoes/integracoes/wiize-pay/callback`
  - `https://wiize-lb2.lovable.app/configuracoes/integracoes/wiize-pay/callback`
- Escopos: `crm.read contacts.read companies.read deals.read sales.read products.read charges.write`.

### 1.3 Página de autorização — `GET /oauth/authorize`
Parâmetros: `response_type=code`, `client_id`, `redirect_uri`, `scope`, `state`, `code_challenge`, `code_challenge_method=S256`.
1. Rejeitar se client inativo, redirect_uri fora da lista, escopo não permitido, ou método ≠ S256 (mostrar erro na tela, **não** redirecionar para URI inválida).
2. Exigir login no Wiize Pay e 2FA (se ativado). Só dono/admin da conta pode autorizar.
3. Tela clara: "O Wiize quer acessar sua conta Wiize Pay para: criar cobranças a partir de vendas…", lista de escopos, botões **Autorizar** e **Negar**.
4. Autorizar → gerar code aleatório (32+ bytes), gravar o hash + code_challenge, redirecionar para `redirect_uri?code=...&state=...` (devolver o `state` sem alterar).
5. Negar → `redirect_uri?error=access_denied&state=...`.

### 1.4 Troca de tokens — `POST /oauth/token` (form-urlencoded, servidor↔servidor)
- `grant_type=authorization_code`: validar client_id + client_secret (comparação em tempo constante), code não usado, não expirado, mesmo redirect_uri, e `BASE64URL(SHA256(code_verifier)) == code_challenge`. Marcar code como usado **antes** de emitir. Se o code for reutilizado, revogar todos os tokens emitidos com ele.
- `grant_type=refresh_token`: validar client e refresh token; **rotacionar** (emitir novo refresh e revogar o antigo). Reuso de refresh antigo = revogar a família inteira.
- Resposta: `{ "access_token", "refresh_token", "token_type": "Bearer", "expires_in": 3600, "scope", "account_name" }`.
- Headers: `Cache-Control: no-store`. Nunca registrar tokens em log.

### 1.5 Revogação — `POST /oauth/revoke` (RFC 7009)
- Parâmetros: `token`, `token_type_hint`, `client_id`, `client_secret`. Sempre responder 200. Revogar access + refresh da mesma conexão.
- No Wiize Pay, ter também um botão "Desconectar Wiize" nas configurações, que revoga tudo e registra auditoria.

---

## Parte 2 — API de cobranças (usada pelo Wiize)

Autenticação: `Authorization: Bearer <access_token>`. Em toda chamada: validar hash do token, não expirado, não revogado, escopo `charges.write`, e usar **somente** o `account_id` do token (nunca aceitar account_id no corpo).

### 2.1 `POST /v1/charges`
Headers: `Idempotency-Key` (id do pedido no Wiize), `X-Wiize-Checksum` (SHA-256 do conteúdo).
Corpo:
```json
{
  "external_reference": "uuid-do-pedido-no-wiize",
  "schema_version": "1.0",
  "source": "wiize_crm",
  "deal": { "id": "...", "title": "Bless 1GB", "type": "recurring", "amount_cents": 12990,
            "currency": "BRL", "installments_or_months": 12, "total_cents": 155880,
            "start_date": "2026-10-01", "end_date": "2027-10-01" },
  "customer": { "lead_id": "...", "company_name": "...", "contact_name": "...",
                "email": "...", "phone": "...", "city": "..." },
  "payment": { "methods": ["pix", "boleto", "credit_card"], "due_date": "2026-10-03" }
}
```
Regras:
- Mesma `Idempotency-Key` na mesma conta → devolver a cobrança já criada (nunca duplicar).
- Validar tudo no servidor (valores > 0, moeda BRL, datas, métodos permitidos, tamanhos máximos).
- Resposta 201: `{ "id": "chg_...", "status": "pending", "checkout_url": "https://<CHECKOUT_ORIGIN>/c/<token>", "checkout_expires_at": "..." }`.
- `checkout_url` deve ser de **uso único**, expirar em ≤ 15 min e estar no domínio informado ao Wiize como `WIIZE_PAY_CHECKOUT_ORIGIN` (o Wiize recusa qualquer outro domínio).

### 2.2 `GET /v1/charges/{id}` → `{ "id", "status" }`
Status: `pending`, `paid`, `overdue`, `cancelled`, `failed`. Só retorna cobranças da conta do token (senão 404).

### 2.3 `POST /v1/charges/{id}/cancel`
Cancela se ainda não paga. Idempotente.

### 2.4 Checkout (popup)
- Página própria do Wiize Pay; o cartão é digitado **só** ali (Stripe/Asaas Elements — PCI fica no Wiize Pay).
- Enviar `Content-Security-Policy` com `frame-ancestors 'none'` (é popup, não iframe) e `X-Frame-Options: DENY`.
- Não usar `window.opener` para enviar dados. Ao terminar, mostrar "Pagamento concluído, pode fechar esta janela". O Wiize consulta o status sozinho ao fechar.

---

## Parte 3 — Avisos de pagamento (webhook para o Wiize)

Endereço do Wiize: `POST https://wgokhkawjdxsmvfuhazb.supabase.co/functions/v1/wiize-pay-webhook`

### 3.1 Assinatura
- Segredo compartilhado `WIIZE_PAY_WEBHOOK_SECRET` (64 caracteres hex, gerado com `openssl rand -hex 32`), configurado igual nos dois lados.
- Headers:
  - `X-Wiize-Pay-Timestamp`: segundos Unix
  - `X-Wiize-Pay-Nonce`: aleatório, 16–128 caracteres `[A-Za-z0-9_-]`, único por envio
  - `X-Wiize-Pay-Signature`: `sha256=` + HMAC-SHA256 em hex de `${timestamp}.${nonce}.${corpo_bruto}`
- Assinar exatamente os bytes enviados (não reserializar o JSON depois de assinar).

### 3.2 Corpo
```json
{ "event_id": "evt_...", "type": "charge.paid",
  "data": { "charge_id": "chg_...", "external_reference": "uuid-do-pedido-no-wiize",
            "amount_cents": 12990, "paid_at": "2026-10-01T12:00:00Z" } }
```
Tipos: `charge.paid`, `charge.pending`, `charge.overdue`, `charge.cancelled`, `charge.failed`, `charge.refunded`.

### 3.3 Envio confiável
- Fila de saída (`outbound_webhooks`) com retentativas exponenciais (1 min, 5 min, 30 min, 2 h, 12 h). Cada retentativa usa **novo nonce e novo timestamp**, mas o **mesmo `event_id`**.
- Considerar entregue com resposta 2xx. 401 = segredo errado (alertar). O Wiize responde 200 para eventos repetidos.
- Nunca enviar dados de cartão, CPF completo ou tokens no webhook.

---

## Parte 4 — Segurança obrigatória no Wiize Pay

1. Todos os secrets só no servidor (nunca em código do navegador ou no Git).
2. RLS em todas as tabelas novas; tokens/codes guardados apenas como hash.
3. Rate limit: `/oauth/token` 10/min por client, `/v1/charges` 60/min por conta, tela de autorização 20/min por usuário.
4. Isolamento: toda consulta filtrada pelo `account_id` do token.
5. Auditoria (`integration_audit_logs`): conexão, autorização, negação, troca de token, refresh, revogação, criação/cancelamento de cobrança, webhooks enviados. Sem tokens ou dados sensíveis no log.
6. HTTPS obrigatório; HSTS; `Cache-Control: no-store` nas respostas OAuth.
7. Rotação: permitir gerar novo `client_secret` e novo `WIIZE_PAY_WEBHOOK_SECRET` sem parar o serviço (aceitar o antigo por 24 h).
8. Alerta para: muitos 401, reuso de refresh token, reuso de code.

---

## Parte 5 — Valores que o Wiize Pay entrega para configurar no Wiize

| Secret no Wiize | Valor |
|---|---|
| `WIIZE_PAY_AUTHORIZE_URL` | `https://<dominio-wiize-pay>/oauth/authorize` |
| `WIIZE_PAY_TOKEN_URL` | `https://<dominio-wiize-pay>/oauth/token` (ou URL da função) |
| `WIIZE_PAY_REVOKE_URL` | `https://<dominio-wiize-pay>/oauth/revoke` |
| `WIIZE_PAY_CLIENT_ID` | client_id gerado |
| `WIIZE_PAY_CLIENT_SECRET` | client_secret gerado (mostrado uma vez) |
| `WIIZE_PAY_API_BASE_URL` | base da API, ex.: `https://<dominio-wiize-pay>/api` |
| `WIIZE_PAY_CHECKOUT_ORIGIN` | domínio do checkout, ex.: `https://pay.wiize.com.br` |
| `WIIZE_PAY_WEBHOOK_SECRET` | segredo compartilhado (igual nos dois lados) |

---

## Parte 6 — Roteiro de testes (antes de liberar para clientes)

1. Conectar com conta de teste → Autorizar → cartão "Conectado" no Wiize.
2. Negar autorização → Wiize mostra "conexão cancelada".
3. Adulterar `state`, `redirect_uri` ou `code_verifier` → deve falhar.
4. Reusar o mesmo code → falha e revoga tokens.
5. Esperar o access token vencer → Wiize renova sozinho (refresh com rotação).
6. Criar cobrança, clicar duas vezes → uma só cobrança.
7. Pagar no popup → webhook `charge.paid` → venda mostra "Paga" e histórico do lead registra.
8. Reenviar o mesmo webhook → ignorado. Assinatura errada → 401.
9. Conta A tentando consultar cobrança da conta B → 404.
10. Desconectar em qualquer lado → tokens revogados, novas cobranças bloqueadas.

---

## Prompt pronto para colar no projeto Wiize Pay

> Implemente um servidor OAuth 2.0 (Authorization Code + PKCE S256) para o cliente "Wiize", a API de cobranças `/v1/charges` (criar, consultar, cancelar, com Idempotency-Key e escopo `charges.write`), um checkout em popup de uso único e o envio de webhooks assinados (HMAC-SHA256 com timestamp e nonce) para o Wiize, exatamente conforme o documento "Guia de implementação — Wiize dentro do Wiize Pay" que vou colar a seguir. Regras: tokens e codes guardados só como hash, RLS em tudo, nenhum secret no navegador, isolamento por account_id do token, auditoria sem dados sensíveis, rate limit, e fila de webhooks com retentativas. No final, me diga os 8 valores da Parte 5 para eu configurar no Wiize.
