# Logo responsiva e incorporação de Forms

## O que será ajustado
- Padronizar a área da logo na prévia e no formulário publicado, ampliando logos pequenas até um tamanho visual adequado sem distorcer, cortar ou ultrapassar o card.
- Manter alinhamento, proporção e comportamento responsivo definidos na aparência do formulário.

## Incorporação no site do cliente
- Criar um painel de incorporação reutilizável com três formatos: formulário incorporado na página, card com botão e popup.
- Disponibilizar exemplos prontos para HTML, React, Next.js e PHP, todos usando a URL pública existente e preservando UTM/Referer.
- Adicionar o acesso ao painel na etapa Publicar e em cada card de formulário no painel Forms.
- Usar iframe responsivo, carregamento sob demanda no popup e fechamento acessível, sem duplicar o envio ou a lógica do formulário.
- Liberar somente a rota pública `/form/*` para incorporação externa; manter as demais páginas protegidas contra iframe.

## Validação
- Conferir logo pequena e grande na prévia e no formulário público.
- Conferir snippets, cópia, visualização card/popup e dimensões em computador e celular.
- Confirmar que envio, consentimento, UTM e rastreamento continuam funcionando dentro do embed.
- Executar as verificações do projeto e informar todos os arquivos editados/criados.
