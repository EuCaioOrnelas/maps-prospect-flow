# Padronizar e-mails de abordagem de influenciadores

## Objetivo
Usar o texto aprovado como padrão obrigatório em todas as novas abordagens por e-mail, alterando somente o nome do influenciador e a referência real ao conteúdo ou canal.

## Implementação
1. Ajustar a IA para pesquisar e devolver apenas a referência personalizada ao conteúdo/canal, sem reescrever a oferta, com fallback honesto para o canal quando não houver conteúdo específico.
2. Montar assunto, corpo e assinatura de forma determinística no servidor, preservando exatamente a copy aprovada e seus espaçamentos.
3. Atualizar o modelo padrão do editor de campanhas com a mesma copy e variáveis disponíveis.
4. Invalidar rascunhos antigos no carregamento automático para que a próxima abertura gere o novo padrão.
5. Validar compilação e publicar a função de geração alterada.

## Detalhes técnicos
- Modelo de IA mantido em `gpt-4o-mini`.
- Nenhuma alteração no envio, rastreamento, autenticação ou infraestrutura de e-mail.
- A IA continuará proibida de inventar conteúdos; quando não houver evidência, será citado apenas o canal/perfil real.
