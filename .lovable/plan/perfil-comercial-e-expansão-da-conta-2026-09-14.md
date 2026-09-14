# Perfil comercial e expansão da conta

## Resultado
- Unificar “Perfil da Empresa” e “Serviços Vendidos” em um único card premium com seletor entre as duas visões.
- Manter os formulários, validações e fontes de dados atuais, sem duplicar cadastros.
- Adicionar abaixo uma área de crescimento da conta para comprar expansões de CRM, oportunidades, números e colaboradores.
- Dar ao dono da conta acesso rápido à troca de plano; subusuários continuam apenas com visualização.

## Experiência
- O card da empresa terá um seletor compacto “Empresa / Serviços”, cabeçalho único, resumo do preenchimento e ações contextuais de editar ou adicionar.
- A área de expansão mostrará preço mensal, quantidade ativa, benefício entregue e controles de compra em um clique.
- Cada número adicional continuará liberando também um colaborador, conforme a regra já existente.
- No plano Atendimento, o upgrade para Growth IA será destacado; a troca inversa ficará disponível como downgrade.
- Upgrade será imediato com ajuste proporcional. Downgrade será programado para a próxima renovação.
- Confirmações deixarão claro o efeito na cobrança e nos limites antes de concluir.

## Regras e segurança
- Reutilizar o catálogo e a função atuais de expansões para Stripe e PIX Automático, preservando preços, grandfathering e auditoria.
- Bloquear compras em contratos anuais, inativos, personalizados ou por subusuários, como já ocorre hoje.
- Centralizar a troca de plano no backend autenticado; nunca alterar o plano apenas no navegador.
- Preservar os add-ons compatíveis no upgrade e remover/programar incompatibilidades somente conforme as regras do plano de destino.
- Atualizar o perfil após cada operação para refletir limites e plano imediatamente.

## Validação
- Conferir visualmente desktop e celular, incluindo ausência de scroll horizontal.
- Validar alternância Empresa/Serviços, edição e estados vazios.
- Validar compra/remoção de expansões e estados indisponíveis.
- Validar upgrade imediato e downgrade agendado sem afetar cancelamento ou renovação.
- Executar checagem de tipos, build e testes direcionados.
