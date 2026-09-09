# Wiize Central Intelligence Engine

Unificar a inteligência que já existe (engajamento, CRM, prospecção, Wian, oportunidades quentes, vendas) numa única camada central, sem recriar nada e sem quebrar o que funciona hoje.

## O que já existe (mapeamento concluído)

- **Motor de engajamento (Revenue)**: `revenue-processor` classifica intenção por léxico, aplica regras (`revenue_score_rules`) com cooldown e limite diário, grava `revenue_events`, `revenue_score_logs`, `revenue_intent_logs`, `revenue_score_snapshots` e atualiza `revenue_leads` (score total + componentes engagement/intent/urgency/risk + bucket + risco). Cron a cada 30 min penaliza leads sem resposta; decaimento diário reduz score por inatividade.
- **Prospecção**: `search-leads` (Google Maps/SERP) grava empresas em `leads`; `score-opportunity` enriquece com site, redes sociais, reputação e diagnóstico e grava `ai_score`, `opportunity_level`, `ai_diagnosis`, `enrichment_data`; `approach-lead` gera a abordagem.
- **Vendas**: `lead_deals` (ticket, tipo, datas, renovação) e ganho/perda pelas etapas do CRM (`Fechado (Ganho)` / `Perdido`).
- **Wian**: briefing diário (`briefing-chat`) e o assistente de suporte (`support-wian-tools`), cada um montando o próprio contexto.
- **Oportunidades quentes**: hoje existem **três** definições diferentes de "quente" (score 0–100 de prospecção, score 0–1000 de engajamento e os buckets do processador), com limiares divergentes entre telas.

Problemas centrais: a empresa prospectada e a conversa do WhatsApp são dois mundos separados (ligados só pelo telefone), as vendas não retroalimentam nada, e cada tela recalcula "quente" do seu jeito.

## O que será construído

### Fase 1 — Núcleo de inteligência (banco)
Novas tabelas por conta, com RLS e permissões:
- `intel_lead_profiles`: visão consolidada por lead (fit, engagement, intent, quality, momentum, risk, opportunity, pattern match, estágio, comportamentos, próxima ação, prioridade P0–P4, motivos/explicação, versão do motor).
- `intel_signals`: sinais reutilizáveis (tipo, confiança, origem regra/IA, mensagem de origem, timestamp) — event sourcing.
- `intel_config`: pesos, limiares, decay, cooldowns e combinações configuráveis por conta (nada de número solto no código), com valores padrão.
- `intel_patterns`: padrões de conversão, perda, ghosting e objeção calculados a partir do histórico real da própria conta.
- `intel_audit`: antes/depois, dimensão, motivo, regra, confiança, versão.
- Vínculo explícito entre empresa prospectada (`leads`) e lead de conversa (`revenue_leads`), acabando com o casamento frágil por telefone.

Isolamento total por conta: uma conta só aprende com os próprios dados.

### Fase 2 — Motor central (`intel-engine`)
Uma única edge function que lê os sinais existentes e produz o perfil consolidado:
- **Fit**: nicho, região, porte, presença digital e diagnóstico da prospecção.
- **Engagement**: reaproveita integralmente o score atual, sem recalcular.
- **Intent**: intenções atuais + novas (comparação, decisão, aprovação, próximo passo, necessidade, problema, solução).
- **Quality**: profundidade, perguntas, reciprocidade, progressão — impede farm de pontos.
- **Momentum**: variação, velocidade, recência (5 estados).
- **Risk**: silêncio, mensagens sem resposta, atraso do vendedor, objeções, queda.
- **Behavior**: perfis dinâmicos (respondedor rápido, sensível a preço, pesquisador, decisor, pronto para comprar, sumido, reativado...).
- **Opportunity**: composição das dimensões acima + sinais compostos, separado de engajamento.
- **Next best action** e **prioridade comercial**, sempre com explicação por fatores.

Regra absoluta: a IA só devolve sinais; quem calcula score é o motor. IA só entra em contexto complexo (áudio, ambiguidade, múltiplas intenções), com cache por mensagem para não reprocessar.

### Fase 3 — Aprendizado com vendas
- Ao ganhar ou perder um negócio, os sinais que antecederam o desfecho são registrados.
- Cálculo periódico dos padrões da conta (conversão, perda, ghosting, objeção) com percentuais reais, nunca inventados.
- Comparação de cada lead novo com esses padrões: "similaridade alta com clientes convertidos", nunca "vai comprar".
- Ciclo de feedback: previsão × resultado, guardado para calibrar pesos e, no futuro, treinar modelo.

### Fase 4 — Consumo pelo produto
- **CRM**: cards, lista, pipeline e detalhe passam a mostrar as dimensões centrais; ordenação e filtros por oportunidade, intenção, momentum, risco, fit, prioridade e similaridade.
- **Oportunidades quentes**: deixa de ter regra própria e passa a ser uma visualização do motor, com motivo e ação recomendada.
- **Wian**: briefing e perguntas contextuais passam a receber o perfil consolidado (empresa, diagnóstico, dimensões, comportamento, padrões, o que mudou, próxima ação) e ganham ferramentas para responder "por que está quente", "o que mudou nas últimas 24h", "parece com clientes que já compraram", "quem abordar agora".
- **Prospecção**: o diagnóstico entra na inteligência assim que a empresa é prospectada.
- **Áudio**: transcrição entra no mesmo pipeline, sem score separado.

### Fase 5 — Validação
Testes com dados reais da conta: leads com conversa, leads ganhos, leads perdidos; conferência de explicação, histórico, isolamento entre contas e ausência de scores conflitantes.

## Garantias

- Nada do motor atual é removido: score, histórico, crescimento e queda continuam funcionando exatamente como hoje.
- Nenhum arquivo compartilhado novo é criado; cada função carrega o próprio código.
- Um único núcleo de inteligência — sem score paralelo por módulo.

## Entrega

Sugiro executar por fases, validando cada uma. As fases 1 e 2 já entregam o perfil consolidado funcionando; 3 a 5 completam o aprendizado e a integração em todo o produto. Ao final de cada fase envio a lista completa de arquivos criados e editados.
