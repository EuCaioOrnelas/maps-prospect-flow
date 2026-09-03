# Roadmap

## Novo padrão de planos (v3 — vigente a partir de 2026-09-03)
- [x] Growth IA: R$ 396/mês, 1.000 oportunidades, 2 números, 3 assentos (dono + 2)
- [x] Atendimento: R$ 196/mês, 1 número, 2 assentos (dono + 1)
- [x] Novo price ID Stripe growth mensal: price_1UBNs5K8CM0R6xMMJAnZEQdm
- [x] Grandfathering: clientes criados antes do corte mantêm 3.000 opps / 5 números / 5 usuários / R$ 696
- [x] Planos anuais descontinuados para novos (legados continuam funcionando)
- [x] Add-on de número passa a incluir +1 usuário
- [x] Section de Expansões Comerciais nas configurações (1 clique cartão / PIX recorrente Asaas)
- [x] Ajustar e-mails de cobrança com os novos valores

## Autenticação Wiize API
- [x] Corrigir cadastro com e-mail já existente sem falsa confirmação
- [x] Vincular acesso da API por perfil próprio e validar rotas protegidas
- [x] Exibir erros de acesso inline e estabilizar login/logout

## Wiize API V1 — Prospecting Intelligence
- [x] Fase 1: fundação financeira (carteira, transações, chaves, reservas, logs, pricing, limites)
- [x] Fase 2: gateway público `wiize-api-v1` (auth por API Key, rate limit, idempotência, reserva/cobrança, logs)
- [x] Modo interno em `search-leads`, `score-opportunity` e `approach-lead`
- [x] Gestão de chaves (`wiize-api-keys`: list/create/revoke/rotate)
- [ ] Fase 3: recargas (Asaas/PIX + Stripe) e webhooks de crédito
- [ ] Fase 4: frontend real (substituir mocks de `src/data/wiizeApiMocks.ts`)
- [ ] Fase 5: admin, auditoria, reembolsos e testes de concorrência
