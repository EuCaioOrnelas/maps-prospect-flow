# Simplificar gatilhos e filtros de público

## Objetivo
Deixar a configuração de entrada do fluxo mais clara, compacta e profissional, reduzindo a quantidade de opções visíveis ao mesmo tempo.

## Alterações
- Substituir a lista longa de gatilhos por uma escolha em duas etapas: primeiro a categoria e depois o gatilho específico.
- Usar nomes curtos e descrições objetivas para explicar quando cada gatilho inicia o fluxo.
- Transformar “Filtro de público” em uma seção recolhível, fechada por padrão quando não houver filtros ativos.
- Mostrar no cabeçalho do filtro um resumo da seleção e a quantidade de critérios ativos.
- Organizar os critérios em blocos simples: presença no CRM, etapas, score, tags, perfil de compra e arquivados.
- Renomear “Clientes — Tanto faz” para “Perfil do contato — Todos: leads e clientes”, mantendo as opções “Somente clientes” e “Somente leads”.
- Tornar os filtros dependentes do CRM visualmente claros: quando “Fora do CRM” estiver selecionado, esconder os campos incompatíveis em vez de apenas deixá-los apagados.
- Preservar integralmente os valores e o funcionamento já usados pelo motor dos fluxos.

## Validação
- Conferir seleção e troca de categorias/gatilhos.
- Conferir abertura, fechamento, limpeza e persistência dos filtros.
- Validar o painel em desktop e na largura móvel sem sobreposição ou cortes.
- Executar a verificação de tipos do projeto.

## Arquivos previstos
- `src/components/wa-flow/WANodeConfigDrawer.tsx`
- `src/components/wa-flow/EntryAudienceFilter.tsx`
