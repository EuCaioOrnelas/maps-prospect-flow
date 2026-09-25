# Auditoria e correção definitiva dos cartões Stripe

## Objetivo
Garantir que os campos de cartão do checkout pago e do teste gratuito permaneçam clicáveis, preservem os dados digitados e não sejam bloqueados por janelas, animações ou mudanças de estado.

## Implementação
- Corrigir a janela automática de adicionais, eliminando controles duplicados e qualquer camada invisível que permaneça sobre o checkout.
- Corrigir a janela de confirmação do cartão para abrir e fechar sem deixar a página bloqueada.
- Endurecer o formulário Stripe para manter a mesma instância dos campos durante atualizações da tela e impedir remontagens acidentais.
- Revisar todos os pontos que montam campos Stripe, incluindo checkout, trial e compra de créditos, sem alterar cobranças, preços, chaves ou integrações.
- Adicionar testes automatizados de regressão para montagem estável, foco, fechamento das janelas e preservação dos campos.

## Validação
- Reproduzir clique, foco, digitação, navegação por Tab, abertura e fechamento de janelas no computador e celular.
- Repetir mudanças de estado que antes poderiam recriar ou bloquear os campos.
- Validar sem concluir pagamento real e conferir erros visuais, de execução e de compilação.

## Entrega
Informar a causa raiz confirmada, os cenários validados e todos os arquivos alterados ou criados.
