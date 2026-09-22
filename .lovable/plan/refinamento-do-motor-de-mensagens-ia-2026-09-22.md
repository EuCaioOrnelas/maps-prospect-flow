# Refinamento do motor de mensagens IA

## Objetivo
Aprimorar as duas gerações existentes — primeira abordagem manual e follow-up pós-resposta — sem alterar autenticação, isolamento por conta, integrações, persistência ou a regra de geração única.

## O que será alterado

### 1. Contexto e evidências do lead
- Ampliar a leitura dos dados já coletados para priorizar sinais acionáveis: serviços específicos, estrutura, operação, unidades, horários, sistemas, atendimento, expansão e características encontradas no site.
- Separar claramente fatos comprovados, inferências permitidas e hipóteses que só podem aparecer como pergunta.
- Rebaixar cidade, avaliação, reputação e presença digital quando não ajudarem a explicar o motivo comercial do contato.

### 2. Seleção do melhor ângulo
- Orientar a IA a escolher primeiro o dado do lead com maior relação real com o que o usuário vende.
- Exigir a sequência lógica: dado específico → característica relevante → necessidade possível → conexão com a oferta → pergunta simples.
- Aplicar o teste anti-generalização: se o argumento servir para quase qualquer empresa do nicho, ele deverá ser refeito.
- Quando houver poucos dados, gerar uma mensagem curta e honesta, sem inventar personalização.

### 3. Primeira abordagem manual
- Manter foco em obter resposta, sem catálogo, preços, pitch longo ou pedido de reunião.
- Usar apresentação curta do atendente e da empresa.
- Gerar de 2 a 4 blocos curtos, com uma única pergunta final, específica e fácil de responder.
- Variar abertura e estratégia para reduzir aparência automática e repetição estrutural.

### 4. Follow-up contextual
- Dar prioridade máxima à última resposta e ao histórico disponível.
- Continuar a conversa sem nova saudação, nova apresentação ou repetição do argumento anterior.
- Tratar separadamente saudação, interesse, dúvida comercial, objeção, resposta curta, informação operacional e ausência de resposta substantiva.
- Interesse avança para qualificação; objeção explora o contexto sem confronto; resposta curta recebe novo ângulo; perguntas sobre oferta podem usar apenas o catálogo real.
- Evitar repetir pergunta ou argumento já usados.

### 5. Validação antes de salvar
- Reforçar validadores para: clichês, elogio vazio, dor inventada, excesso de tamanho, parágrafo único, listas/títulos, mais de uma pergunta, pergunta difícil, oferta prematura e reinício indevido do follow-up.
- Validar personalização no argumento, não apenas pela presença do nome, cidade, segmento ou avaliação.
- Reescrever automaticamente quando uma regra falhar e validar novamente antes de persistir.
- Manter a saída limpa, pronta para copiar, com linhas em branco e sem rótulos explicativos.

## Preservações
- Nenhuma alteração em banco, RLS, cobrança, Meta, Evolution, autenticação ou endpoints.
- Nenhum envio real de WhatsApp será feito nos testes.
- Mensagens já geradas continuarão sendo reutilizadas; não haverá regeneração.
- O follow-up continuará exibindo apenas Copiar e Editar depois da geração.

## Arquivos previstos
- `supabase/functions/approach-lead/index.ts`
- `supabase/functions/approach-lead-manual/index.ts`
- `roadmap.md`

## Validação técnica
- Conferir os dois arquivos com verificação estática.
- Testar cenários controlados de primeira abordagem com muitos e poucos dados.
- Testar follow-up com saudação, interesse, objeção, dúvida, resposta operacional e ausência de resposta substantiva.
- Confirmar uma pergunta final, blocos curtos, ausência de invenções e continuidade real.
- Confirmar que a tela não possui botão de regenerar e que a geração única permanece protegida.
