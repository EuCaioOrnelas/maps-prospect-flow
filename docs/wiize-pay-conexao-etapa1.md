# Integração Wiize ↔ Wiize Pay — Etapa 1: Conexão de contas

Status: lado Wiize pronto. Lado Wiize Pay **READY_FOR_WIIZE_PAY** (ainda não existe no Wiize Pay).

## Fluxo (OAuth 2.0 Authorization Code + PKCE S256)
1. Usuário (dono/admin) clica em "Conectar Wiize Pay" em Configurações → Integrações.
2. Função `wiize-pay-connect` (action `start`) gera `state` e `code_verifier` (guardados só no backend, verifier criptografado AES-GCM, state como hash, 10 min, uso único) e devolve a URL de autorização.
3. Usuário faz login (e 2FA) no próprio Wiize Pay e autoriza.
4. Wiize Pay redireciona para `https://<domínio Wiize>/configuracoes/integracoes/wiize-pay/callback?code=...&state=...`.
5. Backend do Wiize troca o `code` por tokens (action `callback`); tokens ficam criptografados na tabela `integration_connection_secrets` (sem acesso pelo navegador).
6. "Desconectar" revoga os tokens no Wiize Pay (se `WIIZE_PAY_REVOKE_URL` existir), apaga tokens locais e mantém o histórico.

## O que o Wiize Pay precisa implementar (pedir no projeto Wiize Pay)
- Cadastro de um "cliente de integração" para o Wiize: `client_id`, `client_secret`, lista de redirect URIs permitidas (exatas):
  - `https://wiize.com.br/configuracoes/integracoes/wiize-pay/callback`
  - `https://www.wiize.com.br/configuracoes/integracoes/wiize-pay/callback`
  - `https://wiize-lb2.lovable.app/configuracoes/integracoes/wiize-pay/callback`
- Página de autorização (GET) aceitando `response_type=code, client_id, redirect_uri, scope, state, code_challenge, code_challenge_method=S256`; exige login + 2FA do Wiize Pay; mostra os escopos e botão Autorizar/Negar.
- Endpoint de token (POST `application/x-www-form-urlencoded`): `grant_type=authorization_code, code, redirect_uri, client_id, client_secret, code_verifier` → `{ access_token, refresh_token, expires_in, scope, account_name }`. Code de uso único, expira em ≤ 60 s, valida PKCE e redirect_uri.
- Endpoint de revogação (RFC 7009) — opcional, mas recomendado.
- Suporte a `grant_type=refresh_token` (usado na Etapa 2).

## Secrets a configurar no Wiize (quando o Wiize Pay entregar)
`WIIZE_PAY_AUTHORIZE_URL`, `WIIZE_PAY_TOKEN_URL`, `WIIZE_PAY_REVOKE_URL` (opcional), `WIIZE_PAY_CLIENT_ID`, `WIIZE_PAY_CLIENT_SECRET`. `WIIZE_PAY_TOKEN_ENC_KEY` já foi gerado. Sem esses valores o botão fica desabilitado e o selo READY_FOR_WIIZE_PAY aparece.

## Segurança aplicada
PKCE S256, state de uso único com expiração, origem de retorno por lista fixa (sem open redirect), tokens nunca no navegador/logs/respostas, AES-GCM em repouso, rate limit por usuário e ação, apenas dono/admin conecta/desconecta, isolamento por conta (owner), auditoria em `integration_export_audit_logs` sem tokens.

## Próximas etapas
- Etapa 2: venda no CRM → contrato e cobrança no Wiize Pay (popup seguro).
- Etapa 3: avisos de pagamento do Wiize Pay (webhook assinado HMAC + timestamp + nonce) aparecendo no card do lead.
