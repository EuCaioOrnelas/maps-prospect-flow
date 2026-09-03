# Wiize API V1 — Prospecting Intelligence (implementação real)

Transformar a área Wiize API (hoje 100% mock) em produto funcional, reaproveitando a infraestrutura existente (`search-leads`, `score-opportunity`, `approach-lead`, Asaas/Stripe, rate limit, logs de IA). Nada da Wiize principal é alterado.

## Decisões que valem para tudo

- 1 Wiize Token = R$ 0,01. Preços: prospecção 9, análise+diagnóstico 5, abordagem 4 tokens.
- Pricing, limites de rate e tamanhos máximos ficam em tabela de configuração no banco (nada hardcoded).
- Fonte de verdade financeira é o ledger; saldo é cache consistente atualizado dentro da mesma transação.
- Conta API = `wiize_api_profiles.user_id` (já existe). Isolada da conta principal e do Partners.
- Chaves nunca são armazenadas em texto puro (prefixo + hash SHA-256), exibidas uma única vez.

## Fase 1 — Fundação financeira e de identidade (banco)

Novas tabelas, todas com RLS dono-apenas e GRANTs explícitos:

- `wiize_api_wallets` — saldo em BRL e tokens por conta API.
- `wiize_api_wallet_transactions` — ledger imutável (tipo, tokens, before/after, reference, idempotency_key).
- `wiize_api_keys` — prefixo, hash, ambiente (test/live), permissões, status, last_used_at, revoked_at.
- `wiize_api_requests` — log de cada chamada (endpoint, status, tokens cobrados, latência, request_id, IP).
- `wiize_api_pricing` e `wiize_api_limits` — configuração central editável.
- `wiize_api_reservations` — reservas de tokens com expiração.

Funções SQL `SECURITY DEFINER` para operação atômica: `wiize_api_reserve_tokens`, `wiize_api_commit_reservation`, `wiize_api_release_reservation`, `wiize_api_credit_wallet` (com `idempotency_key` único). O débito usa lock de linha, impedindo race condition de requisições simultâneas.

## Fase 2 — Gateway público da API

Uma Edge Function `wiize-api-v1` (roteador `/v1/...`, sem verificação de JWT) concentrando:

1. autenticação por `Authorization: Bearer wk_live_...` (nunca query string);
2. validação de conta, chave, permissão e ambiente;
3. rate limit por chave e por conta com headers `X-RateLimit-*` e 429 + `Retry-After`;
4. idempotência via `Idempotency-Key`;
5. validação/sanitização de payload e limite de tamanho;
6. reserva → execução → commit ou release;
7. envelope de resposta e erros padronizados (`code`, `message`, `request_id`);
8. log completo em `wiize_api_requests`.

Endpoints V1:

- `POST /v1/prospecting/search` (9 tokens) → reutiliza `search-leads`.
- `POST /v1/prospecting/analyze` (5 tokens) → reutiliza `score-opportunity`.
- `POST /v1/prospecting/approach` (4 tokens) → reutiliza `approach-lead`.

As respostas passam por um sanitizador que remove prompts, chaves e internals antes de sair.

## Fase 3 — Recarga de saldo

- `wiize-api-topup` cria cobrança PIX/cartão reaproveitando a integração Asaas atual (e Stripe como alternativa), com camada de abstração de provedor.
- Crédito da carteira acontece somente no webhook confirmado, idempotente por `payment_id`.
- Recarga automática opcional (limite mínimo + valor de recarga) e aviso de saldo baixo usando a função de notificação `wiize-api-notify` já existente.

## Fase 4 — Interface real (substituir mocks)

- Dashboard, Créditos, Uso, Faturamento, Chaves e Docs passam a ler dados reais via React Query.
- Tela de chaves com criação (segredo exibido uma vez), revogação e rotação.
- Uso com filtros por período, endpoint e chave; exportação CSV.
- Documentação com exemplos reais (cURL/JS/Python) e tabela de preços vinda da configuração.
- `src/data/wiizeApiMocks.ts` é removido ao final.

## Fase 5 — Admin, auditoria e testes

- Painel admin: contas API, saldos, consumo, ajustes manuais, reembolsos e bloqueio de conta.
- Detecção de abuso (picos, falhas repetidas, tentativas de chave inválida) e proteção de gasto.
- Testes de contrato em `supabase/tests/` cobrindo auth, 401/403/429, saldo insuficiente, idempotência e concorrência.

## Observação técnica

O preço do token no mock atual (R$ 0,15) diverge do especificado (R$ 0,01); a implementação seguirá R$ 0,01 e a UI será ajustada.

## Entrega

Sugiro executar por fases, validando cada uma antes de seguir. Fases 1 e 2 entregam a API funcionando de ponta a ponta; 3 a 5 completam o produto.
