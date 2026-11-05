# Evolução do SDR Inteligente — Venda Direta, Catálogo e Elegibilidade

## Análise da arquitetura atual (Fase 1 — auditoria concluída)

**1. Como o SDR funciona hoje**
Webhook do WhatsApp (Evolution/Meta) → `sdr-dispatch` (escolhe o agente ativo do número) → `sdr-brain` (análise → redação → validação, tudo com gpt-4o-mini) → envio e registro em `sdr_sessions`/`sdr_runs`. Já existem: memória de sessão, follow-ups, horário comercial, opt-out, pausa por contato e transferência para vendedor.

**2. Propostas hoje**
Existe apenas **1 PDF por agente** (upload no wizard, bucket `sdr-proposals`), enviado ao concluir o objetivo "proposta". Não há proposta por produto nem dados comerciais estruturados.

**3. Origem dos leads**
Tabela `leads` com coluna `origin` (`oportunidades`, `prospeccao`, `chat`, etc.). A Gestão de Oportunidades filtra `leads` por essa coluna — ou seja, Oportunidades e CRM compartilham a mesma tabela.

**4. Ligação Oportunidades ↔ WhatsApp**
Hoje é por telefone (busca pelos últimos 8 dígitos). Funciona, mas é ambíguo; o motor novo usará identidade normalizada por conta.

**5. Contatos no CRM**
Verificação hoje é apenas "existe lead com esse telefone". Como Oportunidades também usa `leads`, a exclusão de CRM precisa de regra precisa (etapa do funil / existência de negócio), não só existência na tabela.

**6. O que será reaproveitado**
`company_services` (base do catálogo), bucket `sdr-proposals`, transporte Evolution/Meta, pipeline análise→redação→validação do `sdr-brain`, controles de pausa, dashboard de sessões.

**7. Gaps encontrados (importantes)**
- Venda direta está **proibida no código** do brain ("nunca fecha venda, nunca pede pagamento") — precisa de mudança real no backend, não só na tela.
- Produtos são JSON solto dentro do agente, sem regras comerciais.
- **Falha de handoff:** se uma sessão foi transferida/encerrada, a próxima mensagem cria sessão nova e o SDR volta a responder. Será corrigido.
- Não existe motor de elegibilidade por origem.

## Arquitetura proposta

```text
Webhook WhatsApp
   └─> sdr-dispatch
        └─> MOTOR DE ELEGIBILIDADE (novo, backend, fail-closed)
             ├─ origem do lead autorizada? (modo 1/2/3)
             ├─ está na Gestão de Oportunidades e ativo?
             ├─ excluído por ser CRM/cliente/responsável humano?
             ├─ contato bloqueado ou handoff ativo?
             └─ NÃO → registra motivo e encerra sem responder
        └─> sdr-brain (modo venda direta)
             ├─ catálogo filtrado pela estratégia (específico/selecionados/inteligente)
             ├─ seleção de produto com justificativa registrada
             ├─ preços/descontos somente do cadastro (validação determinística)
             └─ proposta do produto (PDF por produto) + eventos comerciais
```

**Novas tabelas:** `sdr_products` (catálogo com preço, limites de desconto, nichos, prioridade, proposta vinculada), `sdr_agent_products` (seleção e prioridade por agente), `sdr_eligibility_log` (auditoria de ativação/recusa), `sdr_sales_events` (oferta, proposta, objeção, handoff, conversão). Colunas novas em `sdr_agents` (modo de operação, estratégia de oferta, regras de ativação/exclusão) e `sdr_sessions` (produto selecionado, valor potencial). Tudo com RLS por conta.

## Plano de execução por fases

**Fase 2 — Catálogo comercial**
Migration `sdr_products` + `sdr_agent_products` (RLS, idempotente); tela de catálogo (CRUD completo: preços, cobrança, desconto máx., nichos, objeções, proposta PDF por produto); importação dos serviços da empresa; wizard do SDR passa a selecionar produtos do catálogo.

**Fase 3 — Inteligência de vendas**
`sdr-brain`: novo modo `venda_direta` (hoje bloqueado), seleção de produto por estratégia (específico/selecionados/inteligente) com justificativa, regra anti-alucinação (validador confere preço/condições contra o cadastro e bloqueia envio se divergir), tratamento de objeções cadastradas, envio da proposta do produto, registro de eventos comerciais.

**Fase 4 — Elegibilidade e ativação (a parte mais crítica)**
Função SQL `sdr_check_eligibility` (security definer, fail-closed) + integração em `sdr-dispatch` e `sdr-followup-processor`; modos de ativação 1/2/3; exclusão de CRM/clientes/responsável humano; correção da falha de handoff (sessão transferida/encerrada nunca reabre sozinha); log de motivo de recusa; proteção contra duplicidade.

**Fase 5 — Interface e dashboard**
Wizard reorganizado em abas (Modo, Produtos, Estratégia, Propostas, Ativação, Exclusões, Comportamento); controles por contato (pausar, excluir da automação, retomar, transferir); dashboard com funil comercial (elegíveis→ofertas→propostas→conversões), produtos mais ofertados/vendidos, filtros por período.

**Fase 6 — Testes**
Testes automatizados dos 15 cenários obrigatórios do documento (elegibilidade, handoff, anti-alucinação de preço, limites de desconto, isolamento entre contas, duplicidade).

## Compatibilidade e riscos

- SDR tradicional **continua funcionando igual**; venda direta é um modo novo, desligado por padrão.
- Migrations idempotentes e aditivas — nenhuma tabela/coluna atual é removida.
- Definição de "contato do CRM" para exclusão: lead com negócio (`lead_deals`) ou fora da origem de prospecção — confirmarei na Fase 4 com os dados reais.
- Modelo de IA: gpt-4o-mini (padrão do projeto).

## Observação sobre escopo

Cada fase será entregue e relatada separadamente (arquivos, tabelas, testes). Fases 2 e 3 podem ser entregues juntas nesta primeira entrega se você aprovar, seguidas de 4, 5 e 6.
