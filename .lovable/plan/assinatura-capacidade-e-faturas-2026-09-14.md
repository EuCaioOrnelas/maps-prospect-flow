# Assinatura, capacidade e faturas

## Resultado
- Transformar “Minha Assinatura” em um painel único e organizado, sem a seção duplicada que encaminha para a própria página.
- Mostrar o plano atual com ícone próprio e ações profissionais para upgrade e downgrade, removendo “Comparar planos”.
- Exibir a capacidade operacional real da conta: números de WhatsApp, colaboradores, contatos no CRM e oportunidades mensais, sempre somando plano, adicionais e regras de legado existentes.
- Permitir comprar números, contatos e oportunidades diretamente na seção de adicionais, com atualização da assinatura atual.
- Disponibilizar faturas no histórico: PDF oficial da Stripe e PDF Wiize para cobranças PIX/Asaas.
- Refinar a página de upgrade com saída discreta no topo e adicionais disponíveis no checkout mensal.

## Minha Assinatura
- Usar os ícones já definidos para Atendimento, Growth IA e Enterprise; Free terá identificação própria.
- Substituir o bloco genérico de alteração por ações com ícones e texto coerente com o plano atual.
- Remover o CTA global “Comparar planos”.
- Separar claramente três áreas: resumo e alteração do plano, capacidade operacional e compra de capacidade adicional.
- A seção de adicionais renderizará diretamente os três produtos permitidos no plano, sem cabeçalho intermediário nem card de “Gerenciar plano”.
- Preservar bloqueios para anual, assinatura inativa, contrato personalizado e subusuário.

## Capacidade operacional
- Calcular limites pelas funções centrais existentes, preservando grandfathering.
- Mostrar total contratado e composição base + adicionais para números, colaboradores, contatos e oportunidades.
- Usar dados atuais de consumo quando já disponíveis; onde a página não possui consumo confiável, mostrar somente capacidade contratada, sem inventar uso.

## Faturas
- No backend autenticado, carregar as últimas faturas da Stripe e retornar apenas URLs oficiais de PDF/hospedagem pertencentes ao cliente autenticado.
- Para PIX/Asaas, gerar no navegador um PDF Wiize com os dados reais da cobrança, cliente, plano, status, vencimento, pagamento e identificador.
- O download ficará disponível em cada linha do histórico e terá estado indisponível quando não houver dados suficientes.

## Upgrade e checkout
- Tornar “Sair” discreto, responsivo e integrado ao topo da página.
- Reaproveitar o seletor de adicionais já existente para planos mensais.
- Corrigir o fluxo de upgrade de conta paga para oferecer adicionais antes do pagamento, além do fluxo Free que já os oferece.
- Garantir que cartão e PIX recebam a seleção final e mostrem os adicionais no resumo antes da confirmação.

## Validação
- Validar Minha Assinatura e Upgrade em desktop e celular, sem rolagem horizontal.
- Confirmar plano/ícone corretos, totais de capacidade, compra de cada adicional e bloqueios.
- Confirmar download de PDF PIX e link oficial de fatura Stripe.
- Executar checagem de tipos, build e testes direcionados dos cálculos e fluxos alterados.