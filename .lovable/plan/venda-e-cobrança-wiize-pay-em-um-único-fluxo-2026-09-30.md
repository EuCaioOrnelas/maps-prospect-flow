# Venda e cobrança Wiize Pay em um único fluxo

## Resultado para o usuário
- Quando o Wiize Pay estiver conectado, **Nova venda** abrirá uma única tela com cliente, venda, contrato e cobrança.
- Um único botão salvará a venda no Wiize e criará cliente, serviço/contrato e cobrança no Wiize Pay, sem preencher tudo novamente.
- A própria tela exibirá o link de pagamento ou um erro recuperável, sem abrir outra janela sobre a janela do contato.
- Sem conexão, o cadastro continuará exatamente como controle interno.
- Vendas anteriores à conexão continuarão como **Controle interno** e nunca serão cobradas automaticamente.

## Tela única
- Cabeçalho mostrando Wiize Pay conectado e o cliente selecionado.
- Blocos claros com ícones: **Venda**, **Contrato**, **Cobrança** e **Revisão**.
- Tipo: pagamento único, parcelado ou recorrente mensal.
- Formas atualmente aceitas pela integração oficial: PIX, boleto e cartão de crédito.
- Quantidade de parcelas ou duração do contrato, primeiro vencimento e CPF/CNPJ do cliente.
- Resumo final com valor à vista, por parcela ou por mês.
- No celular, todos os blocos ficam em uma coluna; no computador, os campos relacionados ficam lado a lado.

## Comportamento seguro
1. Validar todos os campos antes de salvar.
2. Criar a venda interna uma única vez.
3. Na mesma ação, criar cliente, serviço/contrato e cobrança no Wiize Pay com chave contra duplicidade.
4. Se o Wiize Pay recusar, manter a venda registrada e mostrar o erro na mesma tela, com opção de tentar novamente sem duplicar.
5. Não enviar nem armazenar dados de cartão no Wiize.

## Limites reais encontrados
- A API pública atual do Wiize Pay aceita apenas `pix`, `boleto` e `credit_card`.
- `debit_card` e `pix_recurring` aparecem em outras áreas do Wiize Pay, mas ainda não são aceitos no endpoint conectado ao Wiize. Eles não serão exibidos como se funcionassem.
- O Wiize já envia `ui_theme=light|dark`, porém o projeto Wiize Pay descarta esse parâmetro na tela de autorização. A correção final do tema exige alteração e publicação no projeto Wiize Pay; este projeto está disponível aqui somente para leitura.

## Detalhes técnicos
- Concentrar os campos Wiize Pay no formulário de venda e remover a abertura automática de `WiizePayChargeDialog` após salvar.
- Reutilizar a função segura existente para criar a cobrança, mantendo idempotência, isolamento por conta e corte por `connected_at`.
- Ajustar os dois pontos de entrada: card do contato e página Vendas e Receita.
- Corrigir o aviso de `ref` do bloco de cobrança e validar os dois temas e tamanhos de tela.