- Wiize Pay nas vendas: venda criada depois de integration_connections.connected_at é cobrada pelo Wiize Pay (lead_deals.billing_provider='wiize_pay'); anteriores ficam 'Controle interno' — por que: preserva o histórico e evita cobrar vendas antigas.
- Cadastro com Wiize Pay conectado usa uma única tela e salva a venda antes da cobrança externa, sem rollback automático — por que: falha da cobrança não pode apagar o fato comercial nem seus anexos.
- Clientes do CRM vão ao Wiize Pay por fila (wiize_pay_customer_sync_queue) acordada por gatilho no banco, lotes de 100 e reenvio com espera crescente — por que: edições vêm de muitos lugares do sistema e falhas não podem perder clientes.

- Chamadas à API do Wiize Pay usam `${WIIZE_PAY_API_BASE_URL}/v1/<recurso>` (customers, charges) — por que: a base aponta para `/api/public` e só as rotas `/v1` existem.
