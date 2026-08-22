# Corrigir chat de influenciadores e respostas por e-mail

## Objetivo
Fazer campanhas, reenvios, mensagens manuais e respostas recebidas aparecerem no histórico do influenciador, usando somente `parcerias@wiize.com.br` como remetente e endereço de resposta.

## Implementação
1. **Unificar o rastreamento de respostas**
   - Remover o endereço visível `parcerias+INF…` dos novos envios.
   - Associar respostas recebidas pelo remetente do influenciador, referências do e-mail e assunto, priorizando correspondências exatas e recentes.
   - Corrigir o receptor já ativo para gravar a mensagem recebida em `influencer_messages`, incluindo corpo e metadados, antes de alterar o status.
   - Manter compatibilidade com respostas antigas que ainda chegarem em endereços `+INF`.

2. **Corrigir campanha, reenvio e histórico**
   - Garantir que todo envio confirmado pelo provedor seja persistido no chat e que falhas de persistência sejam registradas.
   - Criar uma ação real de “reenviar sem resposta”, incluindo envios concluídos e falhos, sem reenviar para quem já respondeu ou pediu descadastro.
   - Atualizar estados da campanha e do influenciador após envio e resposta.

3. **Padronizar mensagens do chat**
   - Aplicar a mesma personalização por influenciador usada nas campanhas.
   - Mostrar variáveis disponíveis e uma prévia do e-mail.
   - Incluir apresentação da Wiize e assinatura “Equipe de Parcerias Wiize” no padrão final, sem duplicar assinaturas já digitadas.

4. **Melhorar a usabilidade**
   - Adicionar tooltips reais e rótulos acessíveis a todos os botões de ícone de campanhas, modelos e conversa.
   - Deixar explícita a diferença entre iniciar/continuar fila, reenviar sem resposta, cancelar, abrir conversa, editar e excluir.
   - Atualizar o texto da tela para explicar o rastreamento com o endereço limpo.

5. **Validar e publicar funções**
   - Testar compilação e os fluxos principais.
   - Implantar as funções de envio e recebimento alteradas.

## Observação sobre spam
O código será ajustado para remetente e resposta limpos, conteúdo leve, versão texto e cadência conservadora. Porém o diagnóstico da infraestrutura mostra que `wiize.com.br` ainda não está configurado como domínio de envio neste projeto; SPF/DKIM/DMARC precisam ser ativados para resolver a causa estrutural de spam.
