# Plano — Hardening completo da Integration Layer (Wiize ↔ Wian)

Objetivo: fechar o Developer Portal, blindar a API contra ataque, e alinhar arquitetura ao padrão Stripe/GitHub/Slack. Antes de codar, valida os 10 pontos abaixo.

---

## Parte A · Bloqueio do Developer Portal

- **Remover rota pública `/integration/*`** do `src/App.tsx`. Sobra só `/admin/integration/*`.
- **Duplo gate**:
  1. `ProtectedRoute` (sessão válida).
  2. Novo `AdminOnlyRoute` usando `useAdminCheck` → redireciona para `/access-denied` se `is_current_user_admin` = false.
- **PIN extra**: overlay no `IntegrationLayout` pedindo PIN admin (secret `INTEGRATION_PORTAL_PIN`), validado por edge function `integration-portal-pin` que confere admin+PIN e emite token de sessão 30 min em `sessionStorage`.
- **Playground sem secrets no browser** (ponto 2): remover completamente inputs de `client_id` e `client_secret`. O Playground chama `integration-portal-proxy` (edge admin-only), que injeta credenciais do backend e repassa para `integration-v1-*`. Fluxo: `Browser → portal-proxy (admin JWT) → integration-v1-* (client_secret backend) → Provider`.

---

## Parte B · Hardening da API

### 1. Rate limiting em camadas
Reusa `check_rate_limit`. Camadas independentes:
- IP: 30 req/min (antes de auth, freia scan).
- client_id: 120 req/min · 5.000 req/h.
- user (JWT sub): 60 req/min.
- provider pesado (ex.: `cockpit`): 30 req/min.
Resposta 429 com `Retry-After` e `{error, retry_after_seconds}`.

### 2. Sem secret no browser (ponto 2 da sua lista)
Zero manipulação de `client_secret` no frontend. Toda chamada admin vai por proxy backend.

### 3. Rotação com janela de graça (ponto 3)
Modelo dual-secret em vez de secret único:
- `INTEGRATION_WIAN_CLIENT_SECRET_CURRENT`
- `INTEGRATION_WIAN_CLIENT_SECRET_PREVIOUS`
- `INTEGRATION_WIAN_CLIENT_SECRET_PREVIOUS_EXPIRES_AT`

Auth aceita current OU previous (se dentro da janela). Rotação:
```
new value → CURRENT
old CURRENT → PREVIOUS
PREVIOUS_EXPIRES_AT = now + 24h
job diário limpa PREVIOUS quando expira
```
Endpoint admin no portal: "Rotacionar secret" (chama edge `integration-secret-rotate`).

### 4. Assinatura HMAC de requisição (ponto 4 — padrão Stripe/GitHub/Slack)
Headers obrigatórios (além de client_id/secret + JWT):
- `x-integration-timestamp` (unix seconds; rejeitar se |now - ts| > 300s → evita replay).
- `x-integration-nonce` (uuid; deduplicado 10 min via tabela `integration_request_nonces`).
- `x-integration-signature` = `HMAC_SHA256(secret, method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + sha256(body))`.

Auth valida assinatura constant-time. Ataque com body roubado não replaya (nonce único + timestamp expirado).

Wian atualiza cliente para assinar. Rollout: aceitar por 7 dias sem assinatura com warning em log; depois enforce.

### 5. Timeout por provider (ponto 5)
`Promise.race([provider.execute(ctx), timeout(5000)])`. Timeout retorna `PROVIDER_TIMEOUT` para aquele provider, os outros continuam. Nunca trava a request inteira.

### 6. Circuit breaker por provider (ponto 6)
Estado em memória por instância + fallback via tabela `integration_provider_health`:
- 5 erros consecutivos em 60s → circuito ABERTO por 30s → retorna 503 `PROVIDER_CIRCUIT_OPEN` sem executar.
- Após 30s → HALF_OPEN, 1 request de prova. Sucesso fecha, falha reabre por 60s (backoff).
- Dashboard `/admin/integration/security` mostra estado ao vivo.

### 7. Cache por provider com TTL (ponto 7)
Já existe `_integration-core/cache.ts`. Confirmar TTLs default:
- `dashboard`/`cockpit`: 15s
- `crm`/`pipeline`/`opportunities`: 5s
- `finance`: 30s
- `meta`/`campaigns`: 30s
Chave: `provider:<name>:<company_id>:sha256(filters+pagination+sort)`. Header `x-integration-cache-bypass` continua funcionando (só admin).

### 8. Idempotência (ponto 8)
Tabela `integration_idempotency` (`request_id` PK, `client_id`, `response_hash`, `response_body`, `created_at`, `expires_at`). Fluxo:
- Se header `x-integration-request-id` presente e já existe → retorna resposta cacheada (mesmo status/body).
- Se novo → executa e persiste por 24h.
Aplica a todos POSTs. Cleanup diário.

### 9. Correlação (ponto 9)
`x-correlation-id` obrigatório (se ausente, gera uuid). Propagado para:
- `integration_audit_log.correlation_id`
- Todos `console.log` da request (`[cid=...] ...`).
- Resposta ecoa no header.
Permite rastrear uma request Wian ponta a ponta.

### 10. Versionamento por path (ponto 10)
Em vez de `integration-v1-context` como nome de função, expor `/api/v1/context` e `/api/v1/providers/:name` via **uma única edge function `integration-api`** que roteia por path interno. Vantagem: adicionar `/api/v2/context` amanhã sem renomear função nem quebrar deploys. Compat: mantém redirect das URLs antigas por 90 dias.

### 11. Scopes/Permissions por client (sua camada extra — ponto essencial)
Nova tabela `integration_clients`:
```
id (uuid)
client_id (text unique)
client_secret_hash (text)  -- bcrypt/argon2, não plaintext
scopes (text[])            -- ex.: ["crm.read","dashboard.read"]
allowed_ips (cidr[])       -- opcional
allowed_origins (text[])   -- CORS
status (active|suspended)
rotation fields (current/previous/expires_at)
created_at, last_used_at
```

Cada provider declara `requiredScope` na metadata (`crm` → `crm.read`, `finance` → `finance.read`, etc). Middleware:
```
auth → carrega client → checa scopes contra provider.requiredScope
  ok → executa
  not → 403 SCOPE_INSUFFICIENT
```
Isso migra secrets fixos hoje em env vars para tabela — permite múltiplos clients (Wian prod, Wian staging, futuras integrações) com scopes distintos.

### 12. Payload guards
- Body max 32 KB → 413.
- Zod schema estrito por provider (unknown field → 400).
- Headers de segurança: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store`.
- CORS restrito a `integration_clients.allowed_origins` (não mais `*`).

### 13. Detecção de abuso + ban
Tabela `integration_ip_bans` + `integration_abuse_events`:
- 5 falhas de auth em 10 min pelo mesmo IP → ban 1h.
- 3 client_ids diferentes falhando no mesmo IP → ban 24h.
- Padrão scan (>10 endpoints diferentes em 1 min) → ban 1h + alerta.
Middleware confere ban antes de tudo. Alerta por email para admin em bans 24h.

### 14. Auditoria expandida
`integration_audit_log` ganha: `correlation_id`, `blocked_reason`, `rate_limited`, `ban_applied`, `circuit_state`, `cache_hit`, `signature_verified`, `scopes_matched`.
View `admin_integration_security_dashboard` (últimas 24h) exposta em `/admin/integration/security` com: bans ativos, circuit breakers abertos, top clients por erro, top IPs suspeitos.

---

## Parte C · Testes
Expandir `integration-v1-selftest`:
- Sem creds → 401.
- Creds erradas → 401 + incrementa abuso.
- Assinatura inválida → 401.
- Nonce repetido → 409.
- Timestamp velho → 401.
- Scope insuficiente → 403.
- Burst 200 req/s → 429 com Retry-After.
- Provider forçado a timeout → 504 só naquele, outros ok.
- 5 erros seguidos → circuit open 503.
- Same request_id → resposta idêntica cacheada.
- CORS de origem não listada → bloqueia.

---

## Detalhes técnicos

**Arquivos frontend**
- `src/App.tsx` — remover rota pública, envolver admin em `ProtectedRoute + AdminOnlyRoute`.
- `src/components/AdminOnlyRoute.tsx` (novo).
- `src/pages/admin/integration/IntegrationLayout.tsx` — overlay PIN.
- `src/pages/admin/integration/pages/Playground.tsx` — remover inputs de client_id/secret, chamar portal-proxy.
- `src/pages/admin/integration/pages/Security.tsx` — dashboard ao vivo (bans, breakers, health).
- Nova aba "Clients & Scopes" no portal para gerenciar `integration_clients`.

**Edge Functions**
- `_integration-core/` — middleware pipeline: `banCheck → rateLimit → signature → auth → scopes → cache → circuit → provider (timeout) → idempotency store → audit`.
- `integration-api` (novo, unificado, roteia `/api/v1/*`).
- `integration-portal-pin` (novo).
- `integration-portal-proxy` (novo, admin-only).
- `integration-secret-rotate` (novo).
- Manter `integration-v1-context`/`integration-v1-provider` como shims → chamam `integration-api` (compat 90 dias).

**Migrations**
- `integration_clients` (+ seed do client Wian atual migrado das env vars).
- `integration_ip_bans`, `integration_abuse_events`.
- `integration_request_nonces` (dedupe 10 min).
- `integration_idempotency` (dedupe 24h).
- `integration_provider_health` (circuit persistente).
- Coluna nova em `integration_audit_log`: `correlation_id`, `circuit_state`, `cache_hit`, `signature_verified`, `scopes_matched`, `blocked_reason`, `rate_limited`, `ban_applied`.
- RPCs: `check_integration_ban`, `record_abuse_event`, `consume_nonce`, `check_idempotency`.
- Cleanup jobs diários.

**Secrets**
- `INTEGRATION_PORTAL_PIN` (novo).
- Migrar `INTEGRATION_WIAN_CLIENT_ID/SECRET` para tabela `integration_clients` (não vive mais em env após migração).

---

## Ordem sugerida de rollout

1. **P0 — Fecha portal + Playground sem secret**: A completo + ponto 2. Sem esse, secret admin exposto.
2. **P1 — Auth robusta**: pontos 3 (rotação dupla), 11 (scopes/clients table), 12 (payload guards).
3. **P2 — Anti-replay**: ponto 4 (HMAC + nonce + timestamp) com janela soft de 7d.
4. **P3 — Resiliência**: pontos 5 (timeout), 6 (circuit), 7 (cache TTLs revisados), 8 (idempotência).
5. **P4 — Observabilidade + Anti-abuso**: pontos 9 (correlation), 13 (bans), 14 (dashboard).
6. **P5 — Versionamento**: ponto 10 (`/api/v1/*` unificado, shims de compat).
7. **Testes** rodando ao fim de cada fase.

---

Confirma se quer que eu execute **tudo** ou só o P0 primeiro para destravar já a parte crítica (portal fechado + secret fora do browser)?