# Corrigir campos de cartão Stripe

## Objetivo
Garantir que número do cartão, validade e CVV aceitem clique, foco e digitação no checkout, no cadastro do trial e no upgrade, em computador e celular, preservando o visual Wiize.

## Implementação
- Simplificar o formulário Stripe compartilhado, removendo opções e camadas desnecessárias que possam interferir nos iframes seguros.
- Manter o Link e os mecanismos nativos da Stripe disponíveis, com campos de altura estável, área inteira clicável e estados claros de foco, erro, carregamento e desabilitado.
- Revisar os contêineres do checkout e do trial para impedir sobreposição, bloqueio de toque, corte ou perda de foco em telas pequenas.
- Corrigir usos inseguros da referência do formulário para exibir erro controlado caso os campos ainda não tenham carregado.

## Validação
- Testar clique e digitação em nome, número, validade e CVV no checkout de upgrade e no cadastro do trial.
- Validar desktop e viewport móvel, incluindo navegação por Tab e mudança de foco entre os iframes Stripe.
- Conferir console, carregamento dos iframes Stripe e ausência de elementos invisíveis sobre os campos.
- Executar a verificação do projeto e registrar a lista exata de arquivos editados.
