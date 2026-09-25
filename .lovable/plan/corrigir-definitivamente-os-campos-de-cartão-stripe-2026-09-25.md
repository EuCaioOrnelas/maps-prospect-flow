# Corrigir definitivamente os campos de cartão Stripe

## Objetivo
Restabelecer clique, foco e digitação no número do cartão, validade e CVV do checkout e do trial, eliminando a causa da falha intermitente sem alterar cobrança, preços ou integrações existentes.

## Implementação
- Simplificar o formulário compartilhado para manter cada campo seguro da Stripe estável durante toda a digitação, sem recriar configurações em cada atualização da tela.
- Remover intermediários de clique e foco desnecessários, deixando os próprios campos Stripe receberem interação diretamente em toda a área visível.
- Evitar que janelas auxiliares do checkout e seus estados de abertura/fechamento deixem a página bloqueada para interação.
- Manter nome do titular, validação, 3D Secure, trial e pagamento atual, com mensagens controladas quando a Stripe ainda estiver carregando.
- Aplicar a correção uma única vez no formulário compartilhado para atender checkout e trial sem duplicação.

## Validação
- Reproduzir e testar número, validade e CVV no checkout e no cadastro do trial.
- Validar clique, digitação, Tab e retorno de foco em computador e celular.
- Abrir e fechar as janelas auxiliares e confirmar que nenhum bloqueio invisível permanece.
- Conferir erros da página e a verificação automática do projeto.
- Informar exatamente os arquivos alterados e a causa encontrada.

## Limites
- Não serão alterados valores, planos, cobrança, chaves, endpoints ou regras do trial.
- Nenhum pagamento real será efetuado durante os testes.
