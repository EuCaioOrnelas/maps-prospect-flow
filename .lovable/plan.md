# Auditoria e correção dos gatilhos de fluxo

## Objetivo
Garantir que os gatilhos, filtros e conexões configurados no editor sejam interpretados corretamente pelo motor automático, sem disparos falsos, perdas ou bloqueios indevidos.

## Implementação
- Corrigir “Resposta de campanha” para validar uma resposta registrada e respeitar a campanha selecionada, em vez de aceitar qualquer mensagem.
- Ajustar gatilhos de compromisso: “Após o compromisso” somente para reuniões concluídas e “Precisa ser reagendado” somente para ausência registrada.
- Tornar a deduplicação específica por evento/referência e manter o bloqueio apenas quando já existir execução ativa para o contato.
- Remover a janela limitada de 24 horas dos gatilhos de inatividade; a deduplicação impedirá reprocessamento do histórico.
- Limpar etapa, tags, score e perfil ao escolher “Somente contatos fora do CRM”, evitando filtros ocultos.
- Centralizar os nomes dos gatilhos usados no seletor e no card do fluxo para evitar divergências.
- Criar índice de banco para acelerar a busca por referências já processadas.
- Manter o cron atual de um minuto e aceitar também o payload legado de scheduler para compatibilidade.

## Validação
- Rodar typecheck e build do frontend.
- Revisar todos os contratos entre configuração, webhook e runner.
- Aplicar a migration, publicar o `wa-flow-runner` e confirmar cron ativo.
- Fazer chamadas controladas ao runner para validar o despacho sem gerar mensagens reais.

## Arquivos previstos
- `src/components/wa-flow/EntryAudienceFilter.tsx`
- `src/components/wa-flow/WANodeConfigDrawer.tsx`
- `src/components/wa-flow/nodes/WAEntryNode.tsx`
- novo arquivo compartilhado de definições dos gatilhos
- `supabase/functions/wa-flow-runner/index.ts`
- nova migration de índice/deduplicação
