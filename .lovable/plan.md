# Ajustar contexto das abordagens e tornar a geração única

## Objetivo
Preservar o padrão aprovado da mensagem manual, aprofundar a conexão entre o que a empresa vende e a operação real de cada lead, reorganizar o follow-up e impedir nova geração depois que uma mensagem já existir.

## Geração das mensagens
- Manter a estrutura atual da abordagem manual: saudação, elogio factual, apresentação, contexto comercial e pergunta final.
- Fazer a IA cruzar o perfil completo da empresa prospectora com o segmento e os dados reais do lead antes de escrever o contexto.
- Exigir uma visão operacional mais ampla e específica do segmento, sem reduzir a necessidade a um único processo. Para academias e internet, por exemplo, considerar sistemas internos, equipe, dispositivos, catracas, música, monitoramento e uso da rede pelos clientes, somente como possibilidades coerentes — nunca como fatos confirmados sem evidência.
- Evitar listas artificiais na mensagem: a IA deverá selecionar os dois ou três aspectos mais relevantes para formar uma percepção natural e uma pergunta objetiva.
- Quanto mais completo estiver o perfil empresarial, maior será a prioridade desses dados na escolha do contexto, da linguagem e da necessidade abordada.
- Manter as proteções atuais: sem inventar problemas, sem catálogo, planos, preços, proposta precoce, reunião ou serviços que a empresa não vende.

## Estrutura do follow-up Meta
Aplicar sempre esta ordem, sem nova saudação e sem presumir o conteúdo da resposta ao template:

1. Apresentação: nome, empresa e área de atuação.
2. Elogio factual: reputação regional, presença forte, recomendações, avaliação ou outro destaque comprovado.
3. Motivo do contato.
4. Contexto operacional específico do segmento e relacionado ao que a empresa vende.
5. Uma única pergunta objetiva ligada ao assunto.

## Geração única
- Quando a abordagem manual ou o follow-up já tiver sido gerado, manter somente as ações de copiar, editar e usar/enviar existentes.
- Remover o botão de regeneração do follow-up e qualquer ação equivalente desses dois fluxos.
- Preservar a geração inicial automática ou manual quando ainda não houver mensagem.
- Não alterar a regeneração de outras áreas independentes, como influenciadores.

## Validação
- Verificar a interface com mensagens já geradas e confirmar que nenhuma opção de regeneração permanece nesses dois modelos.
- Testar a abordagem manual e o follow-up com o perfil Bless e um lead de academia, sem enviar WhatsApp ou template real.
- Confirmar que a manual mantém o padrão aprovado e amplia os usos relevantes da conectividade.
- Confirmar que o follow-up respeita exatamente a nova ordem e termina com uma única pergunta.
- Publicar somente as funções de abordagem alteradas e validar as respostas reais antes de concluir.

## Arquivos previstos
- `src/pages/OpportunitiesManagement.tsx`
- `supabase/functions/approach-lead/index.ts`
- `supabase/functions/approach-lead-manual/index.ts`
- `roadmap.md`
