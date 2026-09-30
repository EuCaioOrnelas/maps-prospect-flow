# Etapa 2 — Venda no CRM vira contrato e cobrança no Wiize Pay

## O que o usuário vai ver
- Em cada venda do lead (bloco "Vendas & Receita"), um botão **"Cobrar com Wiize Pay"**.
- Ao clicar, abre uma janela de revisão: cliente, valor, tipo (única ou recorrente), meses, vencimento, forma de pagamento (PIX, boleto, cartão). Nada é enviado sem confirmação.
- Ao confirmar, abre uma janela segura (popup) do Wiize Pay para finalizar contrato e cobrança. Enquanto o Wiize Pay não tiver essa tela, o botão mostra o selo **READY_FOR_WIIZE_PAY** e o pedido fica salvo como "Aguardando Wiize Pay".
- A venda passa a mostrar o status da cobrança: Rascunho, Enviada, Aguardando pagamento, Paga, Cancelada, Erro.
- Só aparece se a conta estiver conectada (Etapa 1). Vendedor comum vê o status; dono/admin (ou quem tem permissão de vendas) envia.

## Como funciona (sem inventar nada do Wiize Pay)
1. O Wiize grava um "pedido de cobrança" com os dados da venda (cópia fixa, com checksum) e uma chave para impedir duplicidade (clicar duas vezes não cria duas cobranças).
2. O servidor do Wiize, usando o token da Etapa 1 (renovado automaticamente com refresh_token), envia o pedido para o endereço do Wiize Pay configurado por secret. Sem esse endereço, nada é chamado.
3. O Wiize Pay devolve um link de uso único para o popup. O popup só abre nesse domínio (lista fixa) e, ao fechar, o Wiize consulta o status no servidor.
4. Tudo registrado na auditoria, sem tokens nem dados de cartão (cartão nunca passa pelo Wiize).

## Detalhes técnicos
- Migration: tabela `wiize_pay_charge_requests` (owner_user_id, lead_id, deal_id, snapshot jsonb, checksum, idempotency_key UNIQUE por owner, status, external_id, checkout_url_expires_at, error, timestamps), GRANTs, RLS via `is_account_member`, índices; escrita só pela função.
- Nova edge function `wiize-pay-charge` (autocontida, sem `_shared`): actions `preview`, `create`, `status`, `cancel`, `list_for_lead`. Valida JWT, papel, zod, rate limit (`check_rate_limit`), refresh do token AES-GCM de `integration_connection_secrets`.
- Secrets novos (READY_FOR_WIIZE_PAY): `WIIZE_PAY_API_BASE_URL`, `WIIZE_PAY_CHECKOUT_ORIGIN`. Contrato de API esperado documentado em `docs/wiize-pay-cobranca-etapa2.md` (o que o Wiize Pay precisa implementar).
- Frontend: `src/components/crm/WiizePayChargeDialog.tsx` (novo), botão e badge de status em `LeadSalesBlock.tsx`, hook `src/hooks/useWiizePayCharges.ts` (novo).
- Status de pagamento em tempo real fica para a Etapa 3 (webhook assinado); na Etapa 2 o status é atualizado ao fechar o popup e por consulta manual.
- Validação: `tsgo`, `deno check`, testes; sem chamada real ao Wiize Pay.
