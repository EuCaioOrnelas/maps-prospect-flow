# Roadmap — Evolução do SDR Inteligente

- [x] Fase 1 — Auditoria e plano aprovado
- [x] Fase 2 — Catálogo comercial (sdr_products, sdr_agent_products, tela de catálogo, wizard)
- [x] Fase 3 — Inteligência de vendas (modo venda_direta no sdr-brain, seleção de produto, anti-alucinação, proposta por produto, eventos)
- [x] Fase 4 — Motor de elegibilidade (sdr_check_eligibility, modos de ativação, exclusões, correção de handoff)
- [x] Fase 5 — Interface e dashboard (abas do wizard, funil comercial na página do SDR)
- [x] Fase 6 — Testes automatizados (blindagem de preços: 15 testes; suíte completa 77/77)
- [ ] Pendente de homologação real: conversa ponta a ponta no WhatsApp com venda direta ativa; controles por contato na tela de conversas (pausar/excluir/retomar já existem via useSDRContactStatus)

## Admin — Churn
- [x] Contar somente cancelamentos com pagamento real comprovado, inclusive registros locais antigos
- [x] Exibir principal motivo e gráfico de pizza respeitando o filtro de datas
- [x] Testar regras de pagamento, motivos e período; compilação e função verificadas
- [ ] Conferir os valores com os dados reais de produção após publicar a tela e a função nesse ambiente
