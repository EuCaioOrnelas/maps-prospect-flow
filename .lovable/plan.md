# Avaliação premium e abordagens de IA alinhadas ao negócio

## Objetivo
Melhorar a etapa obrigatória de avaliação e impedir que a IA gere mensagens desconectadas do produto da empresa ou da atividade real do lead.

## Avaliação
- Ampliar a área da avaliação para dar largura suficiente aos cinco cards de emojis e manter os títulos em uma linha quando houver espaço.
- Exibir os dois blocos — avaliação do atendimento e indicação — lado a lado no desktop e empilhados somente em telas menores.
- Remover completamente o campo de comentário opcional desse fluxo, mantendo o envio automático após as duas respostas.
- Preservar a confirmação, o protocolo e o retorno ao chat após o registro.

## Geração de abordagem
- Separar explicitamente no contexto da IA: **empresa que está prospectando**, **o que ela vende** e **empresa prospectada/lead**, evitando troca de papéis.
- Montar um resumo factual do lead usando categoria, localização, presença pública e diagnóstico disponível; dados ausentes não poderão ser inventados.
- Tratar diagnósticos anteriores como apoio, descartando sugestões que não tenham relação com o produto/serviço declarado pela empresa prospectora.
- Fazer uma revisão final obrigatória da mensagem, não limitada a termos de marketing: validar atividade do lead, oferta real, relação comercial, afirmações sem evidência e coerência do próximo passo.
- Reescrever automaticamente uma única vez quando a revisão identificar desalinhamento, preservando tom, formato e regras atuais de envio.
- Aplicar a mesma base de alinhamento tanto à abordagem manual quanto à resposta gerada após o template da Meta, sem alterar integrações, modelos, tokens ou endpoints.

## Validação
- Verificar o layout em desktop e celular, incluindo textos sem quebra indevida e empilhamento correto.
- Executar as verificações do projeto e validar os fluxos de geração com cenários contrastantes, incluindo distribuidor, prestador de serviço e software.
- Publicar somente as funções de geração alteradas e confirmar a resposta real antes de considerar a correção concluída.

## Arquivos previstos
- `src/components/support/EmojiRating.tsx`
- `src/components/support/SupportRatingOverlay.tsx`
- `src/components/support/WianChat.tsx` somente se necessário para remover propriedades/estado não utilizados
- `supabase/functions/approach-lead/index.ts`
- `supabase/functions/approach-lead-manual/index.ts`
