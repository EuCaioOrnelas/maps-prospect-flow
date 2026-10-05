# Nova tabela de preços Wiize

## Resultado
- Atualizar o plano Atendimento para R$ 89/mês e o Growth IA para R$ 129/mês.
- Atualizar as expansões mensais para R$ 49 por número + usuário, R$ 39 por 1.000 contatos e R$ 99 por 1.000 oportunidades.
- Aplicar os valores no upgrade, trial, checkout, PIX, renovação, gestão da assinatura, mensagens de ajuda e painéis internos que usam valores de referência.
- Exibir nos planos o preço anterior pequeno, cinza e riscado, com o novo preço maior logo abaixo.

## Cobrança segura
- Remover os IDs antigos das novas ofertas e deixar os novos IDs Stripe vazios e claramente marcados como pendentes.
- Enquanto os IDs não forem informados, manter os preços visíveis, mas bloquear a tentativa de cobrança por cartão com uma mensagem clara, evitando cobrar o valor antigo.
- Preservar assinaturas e preços contratados anteriormente; a mudança vale para novas compras e novas referências de preço.
- Manter PIX mensal nos novos valores, pois ele não depende dos novos IDs Stripe.

## Conferência
- Buscar referências antigas restantes e separar apenas o que pertence a contratos legados.
- Conferir upgrade, trial, checkout por cartão e PIX, expansões e renovação.
- Validar a aparência em computador e celular, além das checagens automáticas do projeto.